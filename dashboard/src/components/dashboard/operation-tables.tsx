'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, FormEvent, useMemo, useState } from 'react';
import { ChevronDown, Filter, Search } from 'lucide-react';

import type { Manejo, Monitoramento } from '@/features/operations/schemas';

import { ApprovalActions } from './approval-actions';
import { HealthBadge } from './health-badge';
import { PhotoComparison } from './photo-comparison';
import { StatusBadge } from './status-badge';

export type AssetOption = {
  id: string;
  label: string;
};

type CommonProps = {
  assetOptions: AssetOption[];
  canApprove: boolean;
  hasMore: boolean;
  nextCursor: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function shortID(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function assetLabel(assetId: string, assetOptions: AssetOption[]) {
  return assetOptions.find((asset) => asset.id === assetId)?.label ?? `Asset ${shortID(assetId)}`;
}

function Filters({
  kind,
  assetOptions,
}: {
  kind: 'manejos' | 'monitoramentos';
  assetOptions: AssetOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const columns =
    kind === 'monitoramentos'
      ? 'xl:grid-cols-[140px_1fr_155px_155px_155px_160px_auto]'
      : 'xl:grid-cols-[140px_1fr_180px_180px_170px_auto]';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['status', 'asset_id', 'created_by', 'date', 'health_status']) {
      const value = String(form.get(key) ?? '');
      if (value) params.set(key, value);
    }
    router.push(`/dashboard/${kind}?${params.toString()}`);
  }

  return (
    <form className={`panel grid gap-3 p-4 ${columns}`} onSubmit={submit}>
      <div className="flex h-12 items-center gap-2 rounded-full bg-white/55 px-4 text-sm font-bold text-secondary">
        <Filter className="h-4 w-4" />
        Filtros
      </div>
      <label className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
        <select
          name="asset_id"
          defaultValue={searchParams.get('asset_id') ?? ''}
          className="h-12 w-full rounded-full border border-outline-variant bg-white/70 pl-12 pr-4 text-sm font-semibold outline-none focus:border-secondary"
        >
          <option value="">Todos assets</option>
          {assetOptions.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.label}
            </option>
          ))}
        </select>
      </label>
      <select
        name="status"
        defaultValue={searchParams.get('status') ?? ''}
        className="h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold"
      >
        <option value="">Todos status</option>
        <option value="draft">Rascunho</option>
        <option value="pending">Pendente</option>
        <option value="approved">Aprovado</option>
        <option value="rejected">Rejeitado</option>
      </select>
      {kind === 'monitoramentos' ? (
        <select
          name="health_status"
          defaultValue={searchParams.get('health_status') ?? ''}
          className="h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold"
        >
          <option value="">Todas saudes</option>
          <option value="healthy">Saudavel</option>
          <option value="warning">Atencao</option>
          <option value="critical">Critico</option>
          <option value="dead">Morto</option>
        </select>
      ) : (
        <input
          name="created_by"
          defaultValue={searchParams.get('created_by') ?? ''}
          placeholder="ID do tecnico"
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none focus:border-secondary"
        />
      )}
      {kind === 'monitoramentos' ? (
        <input
          name="created_by"
          defaultValue={searchParams.get('created_by') ?? ''}
          placeholder="ID tecnico"
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none focus:border-secondary"
        />
      ) : null}
      <input
        name="date"
        defaultValue={searchParams.get('date') ?? ''}
        type="date"
        className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none focus:border-secondary"
      />
      <button className="h-12 rounded-full bg-primary px-5 text-sm font-bold text-on-primary" type="submit">
        Filtrar
      </button>
    </form>
  );
}

function LoadMore({ href, hasMore }: { href: string; hasMore: boolean }) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <Link className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary" href={href}>
        Carregar mais
      </Link>
    </div>
  );
}

export function ManejosTable({
  manejos,
  mediaById,
  assetOptions,
  canApprove,
  hasMore,
  nextCursor,
}: CommonProps & {
  manejos: Manejo[];
  mediaById: Record<string, string>;
}) {
  const [items, setItems] = useState(manejos);
  const [expanded, setExpanded] = useState<string | null>(manejos[0]?.id ?? null);
  const searchParams = useSearchParams();
  const loadMoreHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCursor) params.set('cursor', nextCursor);
    return `/dashboard/manejos?${params.toString()}`;
  }, [nextCursor, searchParams]);

  return (
    <div className="space-y-5">
      <Filters kind="manejos" assetOptions={assetOptions} />
      <section className="panel overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-on-surface-variant">
            Nenhum manejo encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead className="bg-white/40 text-xs font-bold uppercase text-outline">
                <tr>
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Descricao</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Tecnico</th>
                  <th className="px-5 py-4">Data</th>
                  <th className="px-5 py-4">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {items.map((item) => (
                  <Fragment key={item.id}>
                    <tr className="transition hover:bg-white/40">
                      <td className="px-5 py-4">
                        <Link className="font-bold text-primary" href={`/dashboard/assets/${item.assetId}`}>
                          {assetLabel(item.assetId, assetOptions)}
                        </Link>
                      </td>
                      <td className="max-w-[330px] px-5 py-4 text-sm text-on-surface-variant">
                        <span className="line-clamp-2">{item.description}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold">{item.createdBy.name}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">{formatDate(item.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpanded((current) => (current === item.id ? null : item.id))}
                            className="grid h-10 w-10 place-items-center rounded-full bg-white/65 text-secondary"
                            aria-label="Alternar fotos do manejo"
                          >
                            <ChevronDown className="h-5 w-5" />
                          </button>
                          {canApprove && item.status === 'pending' ? (
                            <ApprovalActions
                              entityType="manejo"
                              id={item.id}
                              onDone={() => setItems((current) => current.filter((row) => row.id !== item.id))}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expanded === item.id ? (
                      <tr>
                        <td colSpan={6} className="bg-white/25 px-5 py-5">
                          <PhotoComparison
                            beforeUrl={item.beforeMediaId ? (mediaById[item.beforeMediaId] ?? null) : null}
                            afterUrl={item.afterMediaId ? (mediaById[item.afterMediaId] ?? null) : null}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <LoadMore href={loadMoreHref} hasMore={hasMore} />
    </div>
  );
}

export function MonitoramentosTable({
  monitoramentos,
  assetOptions,
  canApprove,
  hasMore,
  nextCursor,
}: CommonProps & {
  monitoramentos: Monitoramento[];
}) {
  const [items, setItems] = useState(monitoramentos);
  const searchParams = useSearchParams();
  const loadMoreHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCursor) params.set('cursor', nextCursor);
    return `/dashboard/monitoramentos?${params.toString()}`;
  }, [nextCursor, searchParams]);

  return (
    <div className="space-y-5">
      <Filters kind="monitoramentos" assetOptions={assetOptions} />
      <section className="panel overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-on-surface-variant">
            Nenhum monitoramento encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead className="bg-white/40 text-xs font-bold uppercase text-outline">
                <tr>
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Saude</th>
                  <th className="px-5 py-4">Notas</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Tecnico</th>
                  <th className="px-5 py-4">Data</th>
                  <th className="px-5 py-4">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/40">
                    <td className="px-5 py-4">
                      <Link className="font-bold text-primary" href={`/dashboard/assets/${item.assetId}`}>
                        {assetLabel(item.assetId, assetOptions)}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <HealthBadge status={item.healthStatus} />
                    </td>
                    <td className="max-w-[300px] px-5 py-4 text-sm text-on-surface-variant">
                      <span className="line-clamp-2">{item.notes}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">{item.createdBy.name}</td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">{formatDate(item.createdAt)}</td>
                    <td className="px-5 py-4">
                      {canApprove && item.status === 'pending' ? (
                        <ApprovalActions
                          entityType="monitoramento"
                          id={item.id}
                          onDone={() => setItems((current) => current.filter((row) => row.id !== item.id))}
                        />
                      ) : (
                        <span className="text-xs font-bold uppercase text-outline">Sem acao</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <LoadMore href={loadMoreHref} hasMore={hasMore} />
    </div>
  );
}
