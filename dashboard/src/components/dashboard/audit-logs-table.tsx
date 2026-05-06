'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';

import type { AuditLog } from '@/features/audit/schemas';

type DiffRow = {
  field: string;
  oldValue: string;
  newValue: string;
};

type AuditFilters = {
  entity_type?: string;
  action?: string;
  performed_by?: string;
  from?: string;
  to?: string;
  cursor?: string;
};

export function AuditLogsTable({
  logs,
  filters,
  hasMore,
  nextCursor,
}: {
  logs: AuditLog[];
  filters: AuditFilters;
  hasMore: boolean;
  nextCursor: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const nextHref = useMemo(() => {
    if (!nextCursor) return null;

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'cursor') params.set(key, value);
    });
    params.set('cursor', nextCursor);
    return `/dashboard/audit?${params.toString()}`;
  }, [filters, nextCursor]);

  return (
    <div className="space-y-5">
      <form
        action="/dashboard/audit"
        className="panel grid gap-3 p-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
      >
        <input
          name="entity_type"
          defaultValue={filters.entity_type ?? ''}
          placeholder="entity_type"
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
        />
        <input
          name="action"
          defaultValue={filters.action ?? ''}
          placeholder="action"
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
        />
        <input
          name="performed_by"
          defaultValue={filters.performed_by ?? ''}
          placeholder="performed_by"
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
        />
        <input
          name="from"
          type="date"
          defaultValue={filters.from ?? ''}
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
        />
        <input
          name="to"
          type="date"
          defaultValue={filters.to ?? ''}
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
        />
        <button className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-on-primary">
          <Filter className="h-4 w-4" aria-hidden />
          Filtrar
        </button>
      </form>

      <section className="panel overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-on-surface-variant">
            Nenhum log encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-white/40 text-xs font-bold uppercase text-outline">
                <tr>
                  <th className="w-14 px-5 py-4" aria-label="Expandir" />
                  <th className="px-5 py-4">Acao</th>
                  <th className="px-5 py-4">Entidade</th>
                  <th className="px-5 py-4">Quem</th>
                  <th className="px-5 py-4">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {logs.map((log) => {
                  const isOpen = expanded === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr className="align-top transition hover:bg-white/40">
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            aria-label={`Expandir log ${log.action} ${log.entityType}`}
                            onClick={() => setExpanded(isOpen ? null : log.id)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-secondary"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-5 py-4 font-bold text-primary">{log.action}</td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">
                          <span className="font-semibold">{log.entityType}</span>
                          <span className="mt-1 block font-mono text-xs">{log.entityId}</span>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold">{log.performedBy.name}</td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr key={`${log.id}-changes`}>
                          <td className="px-5 py-4" colSpan={5}>
                            <DiffPanel changes={log.changes} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {hasMore && nextHref ? (
        <div className="flex justify-center">
          <Link className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary" href={nextHref}>
            Proxima pagina
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function DiffPanel({ changes }: { changes: unknown }) {
  const rows = toDiffRows(changes);

  if (rows.length === 0) {
    return (
      <div className="rounded-[20px] bg-white/55 p-4 text-sm font-semibold text-on-surface-variant">
        Sem changes estruturado para este evento.
      </div>
    );
  }

  return (
    <div className="rounded-[20px] bg-white/55 p-4">
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.field} className="grid gap-2 rounded-[18px] border border-white/80 p-3 md:grid-cols-[1fr_1fr_1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase text-outline">Campo</p>
              <p className="mt-1 font-bold text-primary">{row.field}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-outline">Old</p>
              <p className="mt-1 rounded-[14px] bg-red-50 px-3 py-2 font-mono text-xs text-error">
                {row.oldValue}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-outline">New</p>
              <p className="mt-1 rounded-[14px] bg-tertiary-fixed/35 px-3 py-2 font-mono text-xs text-primary">
                {row.newValue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toDiffRows(changes: unknown): DiffRow[] {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return [];
  }

  return Object.entries(changes).map(([field, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return {
        field,
        oldValue: renderValue(record.old),
        newValue: renderValue(record.new),
      };
    }

    return {
      field,
      oldValue: '',
      newValue: renderValue(value),
    };
  });
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
