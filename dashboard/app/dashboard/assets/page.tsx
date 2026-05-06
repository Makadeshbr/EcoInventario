import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { AssetsExplorer } from '@/components/dashboard/assets-explorer';
import { PageHeader } from '@/components/dashboard/page-header';
import { listAssets, listAssetTypes } from '@/features/assets/api';
import { getSession } from '@/lib/auth/session';

export default async function AssetsPage({
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

  const result = await Promise.all([
    listAssets(session.accessToken, {
      status: get('status'),
      typeId: get('type_id'),
      createdBy: get('created_by'),
      qrCode: get('qr_code'),
      cursor: get('cursor'),
      limit: 50,
    }),
    listAssetTypes(session.accessToken),
  ]).catch(() => null);

  if (!result) {
    return <ApiErrorState description="A lista de assets depende da API real em /api/v1/assets." />;
  }

  const [assets, assetTypes] = result;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Assets"
        description="Tabela paginada, busca por QR code e alternancia para mapa operacional da organizacao."
      />
      <AssetsExplorer
        assets={assets.data}
        assetTypes={assetTypes}
        hasMore={assets.pagination.has_more}
        nextCursor={assets.pagination.next_cursor}
      />
    </div>
  );
}
