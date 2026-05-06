'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { List, Map, Search } from 'lucide-react';

import type { Asset } from '@/features/assets/schemas';
import { StatusBadge } from './status-badge';

const AssetMap = dynamic(() => import('./asset-map').then((mod) => mod.AssetMap), { ssr: false });

type AssetTypeOption = {
  id: string;
  name: string;
};

export function AssetsExplorer({
  assets,
  assetTypes,
  hasMore,
  nextCursor,
  initialView = 'list',
}: {
  assets: Asset[];
  assetTypes: AssetTypeOption[];
  hasMore: boolean;
  nextCursor: string | null;
  initialView?: 'list' | 'map';
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'list' | 'map'>(initialView);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['status', 'type_id', 'created_by', 'qr_code']) {
      const value = String(form.get(key) ?? '');
      if (value) params.set(key, value);
    }
    router.push(`/dashboard/assets?${params.toString()}`);
  }

  function loadMoreHref() {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCursor) params.set('cursor', nextCursor);
    return `/dashboard/assets?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <form className="panel grid gap-3 p-4 xl:grid-cols-[1fr_180px_180px_180px_auto]" onSubmit={submit}>
        <label className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline" />
          <input
            name="qr_code"
            defaultValue={searchParams.get('qr_code') ?? ''}
            placeholder="Buscar por QR code"
            className="input-shell h-12 w-full rounded-full border border-outline-variant bg-white/70 pl-12 pr-4 outline-none focus:border-secondary"
          />
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
        <select
          name="type_id"
          defaultValue={searchParams.get('type_id') ?? ''}
          className="h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold"
        >
          <option value="">Todos tipos</option>
          {assetTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <input
          name="created_by"
          defaultValue={searchParams.get('created_by') ?? ''}
          placeholder="ID do tecnico"
          className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none focus:border-secondary"
        />
        <button className="h-12 rounded-full bg-primary px-5 text-sm font-bold text-on-primary" type="submit">
          Filtrar
        </button>
      </form>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`grid h-11 w-11 place-items-center rounded-full ${view === 'list' ? 'bg-primary text-on-primary' : 'bg-white/60'}`}
          aria-label="Ver lista"
        >
          <List className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          className={`grid h-11 w-11 place-items-center rounded-full ${view === 'map' ? 'bg-primary text-on-primary' : 'bg-white/60'}`}
          aria-label="Ver mapa"
        >
          <Map className="h-5 w-5" />
        </button>
      </div>

      {view === 'map' ? (
        <AssetMap assets={assets} />
      ) : (
        <section className="panel overflow-hidden">
          {assets.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-on-surface-variant">
              Nenhum asset encontrado para os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-white/40 text-xs font-bold uppercase text-outline">
                  <tr>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">QR code</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Tecnico</th>
                    <th className="px-5 py-4">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="transition hover:bg-white/40">
                      <td className="px-5 py-4">
                        <Link className="font-bold text-primary" href={`/dashboard/assets/${asset.id}`}>
                          {asset.assetType.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">{asset.qrCode}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold">{asset.createdBy.name}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        {new Date(asset.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Link className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary" href={loadMoreHref()}>
            Carregar mais
          </Link>
        </div>
      ) : null}
    </div>
  );
}
