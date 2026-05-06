import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { type AssetOption, ManejosTable } from '@/components/dashboard/operation-tables';
import { PageHeader } from '@/components/dashboard/page-header';
import { listAssetMedia, listAssets } from '@/features/assets/api';
import { listManejos } from '@/features/operations/api';
import { getSession } from '@/lib/auth/session';

export default async function ManejosPage({
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

  const manejos = await listManejos(session.accessToken, {
    status: get('status'),
    assetId: get('asset_id'),
    createdBy: get('created_by'),
    date: get('date'),
    cursor: get('cursor'),
    limit: 50,
  }).catch(() => null);

  if (!manejos) {
    return <ApiErrorState description="A lista de manejos depende da API real em /api/v1/manejos." />;
  }

  const mediaIds = manejos.data.flatMap((item) =>
    [item.beforeMediaId, item.afterMediaId].filter((id): id is string => Boolean(id)),
  );
  const [mediaResult, assetsResult] = await Promise.allSettled([
    listAssetMedia(session.accessToken, mediaIds),
    listAssets(session.accessToken, { limit: 100 }),
  ]);

  const mediaById =
    mediaResult.status === 'fulfilled'
      ? Object.fromEntries(mediaResult.value.map((item) => [item.id, item.url]))
      : {};
  const assetOptions: AssetOption[] =
    assetsResult.status === 'fulfilled'
      ? assetsResult.value.data.map((asset) => ({
          id: asset.id,
          label: `${asset.assetType.name} - ${asset.qrCode}`,
        }))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacao"
        title="Manejos"
        description="Tabela operacional com filtros reais, fotos antes/depois e decisao inline para registros pendentes."
      />
      <ManejosTable
        manejos={manejos.data}
        mediaById={mediaById}
        assetOptions={assetOptions}
        canApprove={session.user.role === 'admin'}
        hasMore={manejos.pagination.has_more}
        nextCursor={manejos.pagination.next_cursor}
      />
    </div>
  );
}
