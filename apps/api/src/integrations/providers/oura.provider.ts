import type { RecoveryProvider, TokenSet, NormalizedRecoveryDatum } from '@gym-app/shared';
import { env } from '../../lib/env';

const AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const TOKEN_URL = 'https://api.ouraring.com/oauth/token';
const API_BASE = 'https://api.ouraring.com/v2/usercollection';

interface OuraTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface OuraReadinessRecord {
  day: string;
  score?: number;
}
interface OuraSleepRecord {
  day: string;
  score?: number;
  total_sleep_duration?: number;
}
interface OuraListResponse<T> {
  data: T[];
}

function toTokenSet(data: OuraTokenResponse): TokenSet {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

export const ouraProvider: RecoveryProvider = {
  id: 'OURA',

  getAuthUrl(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.OURA_CLIENT_ID,
      redirect_uri: env.OURA_REDIRECT_URI,
      scope: 'daily',
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
        client_id: env.OURA_CLIENT_ID,
        client_secret: env.OURA_CLIENT_SECRET,
        redirect_uri: env.OURA_REDIRECT_URI,
      }),
    });
    if (!res.ok) throw new Error(`Oura token exchange failed: HTTP ${res.status}`);
    return toTokenSet((await res.json()) as OuraTokenResponse);
  },

  async refreshAccessToken(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.OURA_CLIENT_ID,
        client_secret: env.OURA_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`Oura token refresh failed: HTTP ${res.status}`);
    return toTokenSet((await res.json()) as OuraTokenResponse);
  },

  async fetchRecoveryData({ accessToken, since }) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const query = new URLSearchParams({ start_date: since.toISOString().slice(0, 10) });

    const [readinessRes, sleepRes] = await Promise.all([
      fetch(`${API_BASE}/daily_readiness?${query.toString()}`, { headers }),
      fetch(`${API_BASE}/daily_sleep?${query.toString()}`, { headers }),
    ]);
    if (!readinessRes.ok) throw new Error(`Oura readiness fetch failed: HTTP ${readinessRes.status}`);

    const readiness = (await readinessRes.json()) as OuraListResponse<OuraReadinessRecord>;
    const sleep = sleepRes.ok ? ((await sleepRes.json()) as OuraListResponse<OuraSleepRecord>) : { data: [] };
    const sleepByDay = new Map(sleep.data.map((s) => [s.day, s]));

    return readiness.data.map((r): NormalizedRecoveryDatum => {
      const s = sleepByDay.get(r.day);
      return {
        date: r.day,
        recoveryScore: r.score,
        sleepQualityScore: s?.score,
        sleepHours: s?.total_sleep_duration ? s.total_sleep_duration / 3600 : undefined,
      };
    });
  },
};
