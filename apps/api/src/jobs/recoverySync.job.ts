import type { RecoverySource, WearableConnection } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getRecoveryProvider, isRestRecoveryProvider, REST_RECOVERY_PROVIDER_IDS } from '../integrations/providers';
import { upsertRecoveryData } from '../services/recovery.service';

export interface RecoverySyncResult {
  synced: number;
  failed: number;
}

async function syncConnection(connection: WearableConnection): Promise<void> {
  if (!connection.accessToken || !isRestRecoveryProvider(connection.provider)) return;

  const provider = getRecoveryProvider(connection.provider);
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const data = await provider.fetchRecoveryData({
    accessToken: connection.accessToken,
    tokenSecret: connection.refreshToken ?? undefined,
    since,
  });

  await upsertRecoveryData(connection.userId, connection.provider as unknown as RecoverySource, data);
}

/** Syncs every connected REST wearable (Whoop/Oura/Garmin) for every user. Apple Health / Google
 *  Fit have no server-side sync step - they push data via POST /api/integrations/:provider/sync
 *  from the device instead. */
export async function syncAllConnections(): Promise<RecoverySyncResult> {
  const connections = await prisma.wearableConnection.findMany({
    where: { status: 'CONNECTED', provider: { in: REST_RECOVERY_PROVIDER_IDS } },
  });

  let synced = 0;
  let failed = 0;

  for (const connection of connections) {
    try {
      await syncConnection(connection);
      synced += 1;
    } catch (err) {
      failed += 1;
      console.error(`Recovery sync failed for connection ${connection.id} (${connection.provider}):`, err);
    }
  }

  return { synced, failed };
}
