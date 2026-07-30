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
  getAuthUrl?(state: string): string;
  exchangeCodeForToken?(code: string): Promise<TokenSet>;
  refreshAccessToken?(refreshToken: string): Promise<TokenSet>;
  fetchRecoveryData(params: { accessToken: string; since: Date }): Promise<NormalizedRecoveryDatum[]>;
}
