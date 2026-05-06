'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Filter, Loader2, XCircle } from 'lucide-react';

import type { ApprovalEntityType, ApprovalItem } from '@/features/approval/types';

const ENTITY_LABELS: Record<ApprovalEntityType, string> = {
  asset: 'Asset',
  manejo: 'Manejo',
  monitoramento: 'Monitoramento',
};

export function ApprovalQueue({
  initialItems,
  warnings = [],
}: {
  initialItems: ApprovalItem[];
  warnings?: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [entityFilter, setEntityFilter] = useState<'all' | ApprovalEntityType>('all');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<ApprovalItem | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesEntity = entityFilter === 'all' || item.entityType === entityFilter;
        const matchesOwner =
          !ownerFilter || item.owner.toLowerCase().includes(ownerFilter.toLowerCase());
        const matchesDate = !dateFilter || item.createdAt.slice(0, 10) === dateFilter;
        return matchesEntity && matchesOwner && matchesDate;
      }),
    [dateFilter, entityFilter, items, ownerFilter],
  );

  async function approve(item: ApprovalItem) {
    setBusyKey(item.id);
    setError(null);
    const response = await fetch(`/api/dashboard/${item.entityType}/${item.id}/approve`, {
      method: 'POST',
    });
    setBusyKey(null);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? 'Falha ao aprovar registro');
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
  }

  async function reject() {
    if (!rejecting) return;
    if (!reason.trim()) {
      setError('Informe o motivo da rejeicao');
      return;
    }

    setBusyKey(rejecting.id);
    setError(null);
    const response = await fetch(`/api/dashboard/${rejecting.entityType}/${rejecting.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setBusyKey(null);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? 'Falha ao rejeitar registro');
      return;
    }
    setItems((current) => current.filter((row) => row.id !== rejecting.id));
    setRejecting(null);
    setReason('');
  }

  return (
    <div className="space-y-5">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <Filter className="h-5 w-5 text-secondary" />
        {(['all', 'asset', 'manejo', 'monitoramento'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setEntityFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              entityFilter === value
                ? 'bg-primary text-on-primary'
                : 'bg-white/55 text-on-surface-variant hover:text-primary'
            }`}
          >
            {value === 'all' ? 'Todos' : ENTITY_LABELS[value]}
          </button>
        ))}
        <input
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          placeholder="Tecnico"
          className="h-10 rounded-full border border-outline-variant bg-white/60 px-4 text-sm font-semibold outline-none"
        />
        <input
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          type="date"
          className="h-10 rounded-full border border-outline-variant bg-white/60 px-4 text-sm font-semibold outline-none"
        />
      </div>

      {error ? (
        <p className="rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="rounded-[20px] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-semibold text-primary">Fila limpa</p>
            <p className="mt-2 text-sm text-on-surface-variant">Nenhum registro pendente no filtro atual.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/60">
            {filtered.map((item) => (
              <article key={item.id} className="p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => (current === item.id ? null : item.id))}
                    className="flex min-w-0 items-center gap-4 text-left"
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] bg-secondary-container text-sm font-bold text-secondary">
                      {ENTITY_LABELS[item.entityType].slice(0, 1)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold text-primary">{item.title}</span>
                      <span className="mt-1 block text-sm text-on-surface-variant">
                        {ENTITY_LABELS[item.entityType]} por {item.owner} em{' '}
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-outline" />
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => approve(item)}
                      disabled={busyKey === item.id}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-on-primary disabled:opacity-60"
                    >
                      {busyKey === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(item)}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-red-50 px-4 text-sm font-bold text-error"
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </button>
                  </div>
                </div>
                {expanded === item.id ? <ExpandedApproval item={item} /> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {rejecting ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/30 px-5">
          <div className="login-panel w-full max-w-lg p-6">
            <p className="text-xs font-bold uppercase text-secondary">Rejeicao</p>
            <h2 className="mt-2 text-2xl font-semibold text-primary">{rejecting.title}</h2>
            <label className="mt-5 block">
              <span className="text-sm font-bold text-on-surface-variant">Motivo</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-32 w-full rounded-[24px] border border-outline-variant bg-white/70 p-4 outline-none focus:border-secondary"
                placeholder="Descreva o ajuste necessario"
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setReason('');
                }}
                className="h-11 rounded-full bg-surface-container px-4 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={reject}
                className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-on-primary"
              >
                Confirmar rejeicao
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExpandedApproval({ item }: { item: ApprovalItem }) {
  if (item.entityType === 'asset') {
    return (
      <div className="mt-5 grid gap-4 rounded-[24px] bg-white/45 p-4 text-sm text-on-surface-variant lg:grid-cols-3">
        <Info label="QR code" value={item.data.qrCode} />
        <Info label="Localizacao" value={`${item.data.latitude.toFixed(5)}, ${item.data.longitude.toFixed(5)}`} />
        <Info label="Notas" value={item.data.notes ?? 'Sem notas'} />
      </div>
    );
  }
  if (item.entityType === 'manejo') {
    return (
      <div className="mt-5 rounded-[24px] bg-white/45 p-4 text-sm text-on-surface-variant">
        {item.data.description}
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-[24px] bg-white/45 p-4 text-sm text-on-surface-variant">
      {item.data.notes}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-outline">{label}</p>
      <p className="mt-1 font-semibold text-primary">{value}</p>
    </div>
  );
}
