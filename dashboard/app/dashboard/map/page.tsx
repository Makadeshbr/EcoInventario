import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { AssetsExplorer } from '@/components/dashboard/assets-explorer';
import { PageHeader } from '@/components/dashboard/page-header';
import { listAssets, listAssetTypes } from '@/features/assets/api';
import { getSession } from '@/lib/auth/session';

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;
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
      limit: 100,
    }),
    listAssetTypes(session.accessToken),
  ]).catch(() => null);

  if (!result) {
    return <ApiErrorState description="O mapa usa assets reais da API. Inicie o backend e recarregue." />;
  }

  const [assets, assetTypes] = result;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Geografia"
        title="Mapa"
        description="Mapa Leaflet com agrupamento visual de alta densidade e popup com acesso ao detalhe do asset."
      />
      <AssetsExplorer
        assets={assets.data}
        assetTypes={assetTypes}
        hasMore={assets.pagination.has_more}
        nextCursor={assets.pagination.next_cursor}
        initialView="map"
      />
    </div>
  );
}
