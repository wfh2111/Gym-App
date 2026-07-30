import type { RecoveryProvider, TokenSet, NormalizedRecoveryDatum } from '@gym-app/shared';
import { env } from '../../lib/env';

const AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const API_BASE = 'https://api.prod.whoop.com/developer/v1';
const SCOPES = 'read:recovery read:sleep read:cycles offline';

interface WhoopTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface WhoopRecoveryRecord {
  created_at: string;
  score_state: string;
  score?: { recovery_score?: number; resting_heart_rate?: number; hrv_rmssd_milli?: number };
}
interface WhoopRecoveryResponse {
  records: WhoopRecoveryRecord[];
}

interface WhoopSleepRecord {
  start: string;
  score_state: string;
  score?: {
    sleep_performance_percentage?: number;
    stage_summary?: { total_in_bed_time_milli?: number; total_awake_time_milli?: number };
  };
}
interface WhoopSleepResponse {
  records: WhoopSleepRecord[];
}

function toTokenSet(data: WhoopTokenResponse): TokenSet {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

export const whoopProvider: RecoveryProvider = {
  id: 'WHOOP',

  getAuthUrl(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.WHOOP_CLIENT_ID,
      redirect_uri: env.WHOOP_REDIRECT_URI,
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.WHOOP_CLIENT_ID,
        client_secret: env.WHOOP_CLIENT_SECRET,
        redirect_uri: env.WHOOP_REDIRECT_URI,
      }),
    });
    if (!res.ok) throw new Error(`Whoop token exchange failed: HTTP ${res.status}`);
    return toTokenSet((await res.json()) as WhoopTokenResponse);
  },

  async refreshAccessToken(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.WHOOP_CLIENT_ID,
        client_secret: env.WHOOP_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`Whoop token refresh failed: HTTP ${res.status}`);
    return toTokenSet((await res.json()) as WhoopTokenResponse);
  },

  async fetchRecoveryData({ accessToken, since }) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const query = new URLSearchParams({ start: since.toISOString(), limit: '25' });

    const [recoveryRes, sleepRes] = await Promise.all([
      fetch(`${API_BASE}/recovery?${query.toString()}`, { headers }),
      fetch(`${API_BASE}/activity/sleep?${query.toString()}`, { headers }),
    ]);
    if (!recoveryRes.ok) throw new Error(`Whoop recovery fetch failed: HTTP ${recoveryRes.status}`);

    const recovery = (await recoveryRes.json()) as WhoopRecoveryResponse;
    const sleep = sleepRes.ok ? ((await sleepRes.json()) as WhoopSleepResponse) : { records: [] };

    const sleepByDay = new Map<string, WhoopSleepRecord>();
    for (const s of sleep.records) {
      if (s.score_state !== 'SCORED') continue;
      sleepByDay.set(s.start.slice(0, 10), s);
    }

    return recovery.records
      .filter((r) => r.score_state === 'SCORED' && r.score)
      .map((r): NormalizedRecoveryDatum => {
        const date = r.created_at.slice(0, 10);
        const sleepRecord = sleepByDay.get(date);
        const stageSummary = sleepRecord?.score?.stage_summary;
        const inBedMs = stageSummary?.total_in_bed_time_milli ?? 0;
        const awakeMs = stageSummary?.total_awake_time_milli ?? 0;
        const sleepHours = inBedMs > 0 ? (inBedMs - awakeMs) / 3_600_000 : undefined;

        return {
          date,
          recoveryScore: r.score?.recovery_score,
          hrvMs: r.score?.hrv_rmssd_milli,
          restingHeartRate: r.score?.resting_heart_rate,
          sleepHours,
          sleepQualityScore: sleepRecord?.score?.sleep_performance_percentage,
        };
      });
  },
};
