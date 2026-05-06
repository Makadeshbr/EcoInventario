import { apiFetch } from '@/lib/api/client';

import { dashboardStatsSchema, type DashboardStats } from './schemas';

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  const payload = await apiFetch<unknown>('/stats', { token });
  return dashboardStatsSchema.parse(payload);
}
