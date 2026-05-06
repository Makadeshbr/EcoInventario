import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { type AssetOption, MonitoramentosTable } from '@/components/dashboard/operation-tables';
import { PageHeader } from '@/components/dashboard/page-header';
import { listAssets } from '@/features/assets/api';
import { listMonitoramentos } from '@/features/operations/api';
import { getSession } from '@/lib/auth/session';

export default async function MonitoramentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const monitoramentos = await listMonitoramentos(session.accessToken, {
    status: get('status'),
    healthStatus: get('health_status'),
    assetId: get('asset_id'),
    createdBy: get('created_by'),
    date: get('date'),
    cursor: get('cursor'),
    limit: 50,
  }).catch(() => null);

  if (!monitoramentos) {
    return <ApiErrorState description="A lista de monitoramentos depende da API real em /api/v1/monitoramentos." />;
  }

  const assetsResult = await listAssets(session.accessToken, { limit: 100 }).catch(() => null);
  const assetOptions: AssetOption[] =
    assetsResult?.data.map((asset) => ({
      id: asset.id,
      label: `${asset.assetType.name} - ${asset.qrCode}`,
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sanidade"
        title="Monitoramentos"
        description="Leitura por asset, health status visual, filtros reais e aprovacao inline para pendencias."
      />
      <MonitoramentosTable
        monitoramentos={monitoramentos.data}
        assetOptions={assetOptions}
        canApprove={session.user.role === 'admin'}
        hasMore={monitoramentos.pagination.has_more}
        nextCursor={monitoramentos.pagination.next_cursor}
      />
    </div>
  );
}
