import { redirect } from 'next/navigation';

import { AdminUsersManager } from '@/components/dashboard/admin-users-manager';
import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { listUsers } from '@/features/admin/api';
import { getSession } from '@/lib/auth/session';

import { createUserAction, deleteUserAction, updateUserAction } from './actions';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const result = await listUsers(session.accessToken, {
    role: get('role'),
    isActive: get('is_active') === undefined ? undefined : get('is_active') === 'true',
    cursor: get('cursor'),
    limit: 50,
  }).catch(() => null);

  if (!result) {
    return <ApiErrorState description="O CRUD de usuarios depende da API real em /api/v1/users." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administracao"
        title="Usuarios"
        description="Contas da organizacao com controle de role, status ativo e criacao por administradores."
      />
      <AdminUsersManager
        users={result.data}
        currentUserId={session.user.id}
        hasMore={result.pagination.has_more}
        nextCursor={result.pagination.next_cursor}
        createUserAction={createUserAction}
        updateUserAction={updateUserAction}
        deleteUserAction={deleteUserAction}
      />
    </div>
  );
}
