import type { NormalizedRecoveryDatum } from '../schemas/recovery';
import type { WearableProvider } from '../schemas/enums';

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Common contract for every recovery data source. REST-based wearables (Whoop/Oura/Garmin)
 * implement the OAuth methods and run server-side. Apple Health / Google Fit have no server
 * OAuth step - data is read on-device and pushed up via `POST /api/integrations/:provider/sync`,
 * so those providers only need `fetchRecoveryData` on the client side.
 */
export interface RecoveryProvider {
  id: WearableProvider;
  /** Async because Garmin's OAuth 1.0a flow needs a signed request-token call before it has a
   *  URL to send the user to; Whoop/Oura (OAuth2) can just build the string synchronously. */
  getAuthUrl?(state: string): string | Promise<string>;
  exchangeCodeForToken?(code: string, extra?: Record<string, string>): Promise<TokenSet>;
  refreshAccessToken?(refreshToken: string): Promise<TokenSet>;
  fetchRecoveryData(params: { accessToken: string; since: Date; tokenSecret?: string }): Promise<NormalizedRecoveryDatum[]>;
}
