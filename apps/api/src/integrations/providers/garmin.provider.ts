import type { RecoveryProvider, NormalizedRecoveryDatum } from '@gym-app/shared';
import { env } from '../../lib/env';
import { buildOAuth1Header, parseOAuth1Response, type OAuth1Credentials } from '../oauth1';

const REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
const AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm';
const ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
const API_BASE = 'https://apis.garmin.com/wellness-api/rest';

interface GarminDailySummary {
  calendarDate: string;
  restingHeartRateInBeatsPerMinute?: number;
  sleepDurationInSeconds?: number;
  bodyBatteryChargedValue?: number;
}

function credentials(token?: string, tokenSecret?: string): OAuth1Credentials {
  return { consumerKey: env.GARMIN_CLIENT_ID, consumerSecret: env.GARMIN_CLIENT_SECRET, token, tokenSecret };
}

export const garminProvider: RecoveryProvider = {
  id: 'GARMIN',

  // Garmin's Health API uses OAuth 1.0a, not OAuth2, so this doesn't fit the same shape as
  // Whoop/Oura's getAuthUrl - it has to perform the signed request-token step itself before it
  // has a URL to send the user to. The request token secret is embedded in the callback URL's
  // query string (Garmin echoes the whole oauth_callback back on redirect) so the callback
  // handler can retrieve it without a server-side pending-connection store. That's a deliberate
  // simplification for this build; a production implementation should keep the secret
  // server-side (e.g. a short-lived cache keyed by a nonce) instead of round-tripping it
  // through the browser.
  async getAuthUrl(state) {
    const callbackWithState = `${env.GARMIN_REDIRECT_URI}?state=${encodeURIComponent(state)}`;
    const authHeader = buildOAuth1Header('POST', REQUEST_TOKEN_URL, credentials(), {
      oauth_callback: callbackWithState,
    });

    const res = await fetch(REQUEST_TOKEN_URL, { method: 'POST', headers: { Authorization: authHeader } });
    if (!res.ok) throw new Error(`Garmin request token failed: HTTP ${res.status}`);

    const parsed = parseOAuth1Response(await res.text());
    if (!parsed.oauth_token || !parsed.oauth_token_secret) {
      throw new Error('Garmin request token response missing oauth_token/oauth_token_secret');
    }

    const params = new URLSearchParams({ oauth_token: parsed.oauth_token, secret: parsed.oauth_token_secret });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(oauthVerifier, extra) {
    const oauthToken = extra?.oauthToken;
    const tokenSecret = extra?.oauthTokenSecret;
    if (!oauthToken || !tokenSecret) {
      throw new Error('Missing Garmin request token/secret for access token exchange');
    }

    const authHeader = buildOAuth1Header('POST', ACCESS_TOKEN_URL, credentials(oauthToken, tokenSecret), {
      oauth_verifier: oauthVerifier,
    });
    const res = await fetch(ACCESS_TOKEN_URL, { method: 'POST', headers: { Authorization: authHeader } });
    if (!res.ok) throw new Error(`Garmin access token exchange failed: HTTP ${res.status}`);

    const parsed = parseOAuth1Response(await res.text());
    if (!parsed.oauth_token || !parsed.oauth_token_secret) {
      throw new Error('Garmin access token response missing oauth_token/oauth_token_secret');
    }

    // OAuth1 access "tokens" are a token + secret pair with no timed expiry and no refresh
    // flow, unlike OAuth2 - re-pack them into TokenSet's two string fields.
    return { accessToken: parsed.oauth_token, refreshToken: parsed.oauth_token_secret };
  },

  async fetchRecoveryData({ accessToken, tokenSecret, since }) {
    if (!tokenSecret) throw new Error('Garmin recovery fetch requires the OAuth1 token secret');

    const url = `${API_BASE}/dailies`;
    const requestParams = { uploadStartTimeInSeconds: Math.floor(since.getTime() / 1000).toString() };
    const authHeader = buildOAuth1Header('GET', url, credentials(accessToken, tokenSecret), {}, requestParams);

    const res = await fetch(`${url}?${new URLSearchParams(requestParams).toString()}`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) throw new Error(`Garmin dailies fetch failed: HTTP ${res.status}`);

    const days = (await res.json()) as GarminDailySummary[];
    return days.map(
      (d): NormalizedRecoveryDatum => ({
        date: new Date(d.calendarDate).toISOString().slice(0, 10),
        restingHeartRate: d.restingHeartRateInBeatsPerMinute,
        sleepHours: d.sleepDurationInSeconds ? d.sleepDurationInSeconds / 3600 : undefined,
        recoveryScore: d.bodyBatteryChargedValue,
      }),
    );
  },
};
