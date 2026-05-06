import { ApiErrorState } from '@/components/dashboard/api-error-state';
import { DashboardHome } from '@/components/dashboard/dashboard-home';
import { getDashboardStats } from '@/features/dashboard/api';
import { getSession } from '@/lib/auth/session';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const stats = await getDashboardStats(session.accessToken).catch(() => null);

  if (!stats) {
    return (
      <ApiErrorState description="O dashboard so mostra dados reais. Inicie o backend em PORT=8080 e recarregue a pagina." />
    );
  }

  return <DashboardHome stats={stats} userName={session.user.name.split(' ')[0] ?? session.user.name} />;
}
