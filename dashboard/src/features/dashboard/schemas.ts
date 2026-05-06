import { z } from 'zod';

import type { AssetStatus } from '@/types/domain';

export interface DashboardStats {
  summary: {
    totalAssets: number;
    pendingApproval: number;
    approvedAssets: number;
    rejectedAssets: number;
  };
  assetsByStatus: Array<{ status: AssetStatus; count: number }>;
  assetsByType: Array<{ assetTypeId: string; name: string; count: number }>;
  monthlyActivity: Array<{ month: string; createdCount: number; approvedCount: number }>;
}

export const dashboardStatsSchema = z
  .object({
    summary: z.object({
      total_assets: z.number().int().nonnegative(),
      pending_approval: z.number().int().nonnegative(),
      approved_assets: z.number().int().nonnegative(),
      rejected_assets: z.number().int().nonnegative(),
    }),
    assets_by_status: z.array(
      z.object({
        status: z.enum(['draft', 'pending', 'approved', 'rejected']),
        count: z.number().int().nonnegative(),
      }),
    ),
    assets_by_type: z.array(
      z.object({
        asset_type_id: z.string().min(1),
        name: z.string().min(1),
        count: z.number().int().nonnegative(),
      }),
    ),
    monthly_activity: z.array(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        created_count: z.number().int().nonnegative(),
        approved_count: z.number().int().nonnegative(),
      }),
    ),
  })
  .transform(
    (value): DashboardStats => ({
      summary: {
        totalAssets: value.summary.total_assets,
        pendingApproval: value.summary.pending_approval,
        approvedAssets: value.summary.approved_assets,
        rejectedAssets: value.summary.rejected_assets,
      },
      assetsByStatus: value.assets_by_status,
      assetsByType: value.assets_by_type.map((item) => ({
        assetTypeId: item.asset_type_id,
        name: item.name,
        count: item.count,
      })),
      monthlyActivity: value.monthly_activity.map((item) => ({
        month: item.month,
        createdCount: item.created_count,
        approvedCount: item.approved_count,
      })),
    }),
  );
