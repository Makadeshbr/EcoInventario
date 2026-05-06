import { redirect } from 'next/navigation';

import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { AuditLogsTable } from '@/components/dashboard/audit-logs-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { listAuditLogs } from '@/features/audit/api';
import { getSession } from '@/lib/auth/session';

export default async function AuditPage({
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
  const filters = {
    entity_type: get('entity_type'),
    action: get('action'),
    performed_by: get('performed_by'),
    from: get('from'),
    to: get('to'),
    cursor: get('cursor'),
  };

  const result = await listAuditLogs(session.accessToken, {
    entityType: filters.entity_type,
    action: filters.action,
    performedBy: filters.performed_by,
    from: filters.from,
    to: filters.to,
    cursor: filters.cursor,
    limit: 50,
  }).catch(() => null);

  if (!result) {
    return <ApiErrorState description="A auditoria depende da API real em /api/v1/audit-logs." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seguranca"
        title="Auditoria"
        description="Eventos administrativos com filtros por entidade, acao, usuario e periodo, incluindo diff visual de changes."
      />
      <AuditLogsTable
        logs={result.data}
        filters={filters}
        hasMore={result.pagination.has_more}
        nextCursor={result.pagination.next_cursor}
      />
    </div>
  );
}
