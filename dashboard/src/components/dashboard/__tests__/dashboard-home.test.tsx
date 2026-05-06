import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { DashboardHome } from '../dashboard-home';

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  Legend: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const stats = {
  summary: {
    totalAssets: 120,
    pendingApproval: 8,
    approvedAssets: 94,
    rejectedAssets: 6,
  },
  assetsByStatus: [
    { status: 'pending' as const, count: 8 },
    { status: 'approved' as const, count: 94 },
  ],
  assetsByType: [{ assetTypeId: 'type-1', name: 'Arvore', count: 70 }],
  monthlyActivity: [{ month: '2025-06', createdCount: 21, approvedCount: 18 }],
};

describe('DashboardHome', () => {
  test('renderiza metricas e link de pendentes', () => {
    render(<DashboardHome stats={stats} userName="Maria" />);

    expect(screen.getByText('Ola, Maria')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /8 pendentes de aprovacao/i })).toHaveAttribute(
      'href',
      '/dashboard/approval',
    );
  });
});
