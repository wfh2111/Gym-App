import crypto from 'node:crypto';

/**
 * Minimal OAuth 1.0a request signer (HMAC-SHA1), used only by the Garmin provider - Whoop and
 * Oura are plain OAuth2. Garmin's flow is: signed POST for a request token -> user authorizes
 * -> Garmin redirects back with oauth_token + oauth_verifier -> signed POST for the access
 * token (token + token secret, not a bearer token) -> every subsequent API call is itself
 * signed with that token/secret pair.
 */

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * @param oauthExtra oauth_* params beyond the standard set (oauth_callback, oauth_verifier) -
 *   included in both the signature and the returned Authorization header.
 * @param requestParams non-oauth query/body params - included in the signature base string
 *   (as the spec requires) but NOT echoed into the header.
 */
export function buildOAuth1Header(
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  oauthExtra: Record<string, string> = {},
  requestParams: Record<string, string> = {},
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...(credentials.token ? { oauth_token: credentials.token } : {}),
    ...oauthExtra,
  };

  const allParamsForSigning = { ...oauthParams, ...requestParams };
  const paramString = Object.entries(allParamsForSigning)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&');
  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret ?? '')}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const headerParams = { ...oauthParams, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.entries(headerParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
      .join(', ')
  );
}

/** Parses the `oauth_token=...&oauth_token_secret=...` form-encoded response body Garmin (and
 *  OAuth1 providers generally) return from the request-token and access-token endpoints. */
export function parseOAuth1Response(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body));
}
