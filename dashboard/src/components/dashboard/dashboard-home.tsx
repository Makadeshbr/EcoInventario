'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Layers3,
  ShieldX,
  Trees,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DashboardStats } from '@/features/dashboard/schemas';
import type { AssetStatus } from '@/types/domain';

const STATUS_LABELS: Record<AssetStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  draft: '#747878',
  pending: '#9dd850',
  approved: '#4d644d',
  rejected: '#ba1a1a',
};

const TOOLTIP_STYLE = {
  border: '1px solid rgba(255,255,255,0.78)',
  borderRadius: 18,
  background: 'rgba(255,255,255,0.88)',
  boxShadow: '0 18px 42px rgba(45,58,45,0.12)',
};

type Props = {
  stats: DashboardStats;
  userName: string;
};

export function DashboardHome({ stats, userName }: Props) {
  const statusData = stats.assetsByStatus.map((item) => ({
    ...item,
    label: STATUS_LABELS[item.status],
    fill: STATUS_COLORS[item.status],
  }));
  const monthlyData = stats.monthlyActivity.map((item) => ({
    month: item.month.slice(5),
    Criados: item.createdCount,
    Aprovados: item.approvedCount,
  }));

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-secondary">Dashboard Home</p>
            <h1 className="mt-3 text-[34px] font-semibold leading-[42px] text-primary sm:text-[40px] sm:leading-[48px]">
              Ola, {userName}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-on-surface-variant">
              Visao consolidada dos ativos ambientais, aprovacoes e ritmo de operacao da
              organizacao.
            </p>
          </div>
          <Link
            href="/dashboard/approval"
            className="flex items-center justify-between rounded-[24px] border border-white/70 bg-primary px-5 py-4 text-on-primary shadow-lg shadow-black/10 transition hover:scale-[0.99]"
            aria-label={`${stats.summary.pendingApproval} pendentes de aprovacao`}
          >
            <span>
              <span className="block text-sm font-semibold text-white/70">Fila ativa</span>
              <span className="mt-1 block text-2xl font-bold">
                {stats.summary.pendingApproval} pendentes de aprovacao
              </span>
            </span>
            <ArrowUpRight className="h-6 w-6" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Metricas">
        <MetricCard
          title="Ativos"
          value={stats.summary.totalAssets}
          caption="Inventario total"
          icon={<Trees aria-hidden className="h-7 w-7 text-tertiary-fixed-dim" />}
          variant="organic-left"
        />
        <MetricCard
          title="Pendentes"
          value={stats.summary.pendingApproval}
          caption="Aguardando decisao"
          icon={<Clock3 aria-hidden className="h-7 w-7 text-secondary" />}
          variant="organic-right"
        />
        <MetricCard
          title="Aprovados"
          value={stats.summary.approvedAssets}
          caption="Disponiveis para leitura"
          icon={<CheckCircle2 aria-hidden className="h-7 w-7 text-secondary" />}
          variant="soft"
        />
        <MetricCard
          title="Rejeitados"
          value={stats.summary.rejectedAssets}
          caption="Precisam de correcao"
          icon={<ShieldX aria-hidden className="h-7 w-7 text-error" />}
          variant="soft"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <ChartPanel title="Assets por status" icon={<ClipboardList aria-hidden />}>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={4}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={3}
                >
                  {statusData.map((item) => (
                    <Cell key={item.status} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Sem assets por status" />
          )}
        </ChartPanel>

        <ChartPanel title="Assets por tipo" icon={<Layers3 aria-hidden />}>
          {stats.assetsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.assetsByType} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e0e3df" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(207,234,204,0.26)' }} />
                <Bar dataKey="count" fill="#4d644d" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Sem tipos com ativos" />
          )}
        </ChartPanel>
      </section>

      <ChartPanel title="Atividade mensal" icon={<Activity aria-hidden />}>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={330}>
            <LineChart data={monthlyData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e0e3df" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" />
              <Line
                type="monotone"
                dataKey="Criados"
                stroke="#4d644d"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Aprovados"
                stroke="#9dd850"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="Sem atividade mensal" />
        )}
      </ChartPanel>
    </div>
  );
}

function MetricCard({
  title,
  value,
  caption,
  icon,
  variant,
}: {
  title: string;
  value: number;
  caption: string;
  icon: ReactNode;
  variant: 'organic-left' | 'organic-right' | 'soft';
}) {
  return (
    <div
      className={`metric-card min-h-44 p-6 ${
        variant === 'organic-left' ? 'organic-left' : variant === 'organic-right' ? 'organic-right' : ''
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-surface-container-lowest shadow-sm">
          {icon}
        </span>
        <span className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-bold uppercase text-secondary">
          API
        </span>
      </div>
      <div className="text-5xl font-bold leading-[56px] text-primary">{value}</div>
      <p className="mt-1 text-xs font-semibold uppercase text-on-surface-variant">{title}</p>
      <p className="mt-3 text-sm font-medium text-on-surface-variant">{caption}</p>
    </div>
  );
}

function ChartPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-secondary-container text-secondary">
            {icon}
          </span>
          <h2 className="truncate text-xl font-semibold text-primary">{title}</h2>
        </div>
        <span className="hidden rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold uppercase text-on-surface-variant sm:inline-flex">
          Live
        </span>
      </div>
      <div className="h-full min-h-72">{children}</div>
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-[20px] border border-dashed border-outline-variant bg-surface-container-low/50 text-sm font-semibold text-on-surface-variant">
      {label}
    </div>
  );
}
