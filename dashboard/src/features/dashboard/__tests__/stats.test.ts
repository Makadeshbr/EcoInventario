import { describe, expect, test } from 'vitest';

import { dashboardStatsSchema } from '../schemas';

describe('dashboardStatsSchema', () => {
  test('aceita contrato de GET /api/v1/stats', () => {
    const result = dashboardStatsSchema.parse({
      summary: {
        total_assets: 120,
        pending_approval: 8,
        approved_assets: 94,
        rejected_assets: 6,
      },
      assets_by_status: [{ status: 'approved', count: 94 }],
      assets_by_type: [{ asset_type_id: 'type-1', name: 'Arvore', count: 70 }],
      monthly_activity: [{ month: '2025-06', created_count: 21, approved_count: 18 }],
    });

    expect(result.summary.pendingApproval).toBe(8);
    expect(result.assetsByStatus[0]?.status).toBe('approved');
  });
});
