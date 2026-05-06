import { redirect } from 'next/navigation';

import { AdminAssetTypesManager } from '@/components/dashboard/admin-asset-types-manager';
import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { listAssetTypesForAdmin } from '@/features/admin/api';
import { getSession } from '@/lib/auth/session';

import { createAssetTypeAction, updateAssetTypeAction } from './actions';

export default async function AssetTypesPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const assetTypes = await listAssetTypesForAdmin(session.accessToken).catch(() => null);
  if (!assetTypes) {
    return <ApiErrorState description="O CRUD de tipos depende da API real em /api/v1/asset-types." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administracao"
        title="Tipos de Asset"
        description="Catalogo de tipos ambientais usados nos cadastros, com desativacao segura por status ativo."
      />
      <AdminAssetTypesManager
        assetTypes={assetTypes}
        createAssetTypeAction={createAssetTypeAction}
        updateAssetTypeAction={updateAssetTypeAction}
      />
    </div>
  );
}
