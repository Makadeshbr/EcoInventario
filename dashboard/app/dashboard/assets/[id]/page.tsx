import { notFound } from 'next/navigation';

import { AssetDetail } from '@/components/dashboard/asset-detail';
import {
  getAsset,
  getAssetHistory,
  listMediaForAsset,
  listAssetMedia,
} from '@/features/assets/api';
import { listAuditLogsForEntity } from '@/features/audit/api';
import { listManejosForAsset, listMonitoramentosForAsset } from '@/features/operations/api';
import { getSession } from '@/lib/auth/session';

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const { id } = await params;

  try {
    const [asset, history, manejos, monitoramentos] = await Promise.all([
      getAsset(session.accessToken, id),
      getAssetHistory(session.accessToken, id),
      listManejosForAsset(session.accessToken, id),
      listMonitoramentosForAsset(session.accessToken, id),
    ]);

    const media = await listMediaForAsset(session.accessToken, id).catch(() => []);
    const operationMedia = await listAssetMedia(session.accessToken, [
      ...manejos.flatMap((manejo) => [manejo.beforeMediaId, manejo.afterMediaId]),
    ].filter((value): value is string => Boolean(value))).catch(() => []);
    const auditLogs =
      session.user.role === 'admin'
        ? await listAuditLogsForEntity(session.accessToken, 'asset', id)
        : [];

    return (
      <AssetDetail
        asset={asset}
        media={[...media, ...operationMedia]}
        history={history}
        manejos={manejos}
        monitoramentos={monitoramentos}
        auditLogs={auditLogs}
      />
    );
  } catch {
    notFound();
  }
}
