import { redirect } from 'next/navigation';

import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { ApprovalQueue } from '@/components/dashboard/approval-queue';
import { PageHeader } from '@/components/dashboard/page-header';
import { listApprovalQueue } from '@/features/approval/api';
import { getSession } from '@/lib/auth/session';

export default async function ApprovalPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const queue = await listApprovalQueue(session.accessToken).catch(() => null);

  if (!queue) {
    return (
      <ApiErrorState description="A fila de aprovacao depende dos endpoints reais de assets, manejos e monitoramentos." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fila admin"
        title="Aprovacao"
        description="Revise assets, manejos e monitoramentos pendentes com acoes inline e rastreio de decisao."
      />
      <ApprovalQueue initialItems={queue.items} warnings={queue.warnings} />
    </div>
  );
}
