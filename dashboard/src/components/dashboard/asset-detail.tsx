'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Camera, History, MapPin } from 'lucide-react';

import type { AuditLog } from '@/features/audit/schemas';
import type { Asset, AssetMedia } from '@/features/assets/schemas';
import type { Manejo, Monitoramento } from '@/features/operations/schemas';
import { StatusBadge } from './status-badge';

const AssetMap = dynamic(() => import('./asset-map').then((mod) => mod.AssetMap), { ssr: false });

export function AssetDetail({
  asset,
  media,
  history,
  manejos,
  monitoramentos,
  auditLogs,
}: {
  asset: Asset;
  media: AssetMedia[];
  history: Array<{ id: string; version: number; status: Asset['status']; parentId: string | null; createdAt: string }>;
  manejos: Manejo[];
  monitoramentos: Monitoramento[];
  auditLogs: AuditLog[];
}) {
  const [lightbox, setLightbox] = useState<AssetMedia | null>(null);

  return (
    <div className="space-y-6">
      <section className="panel grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-xs font-bold uppercase text-secondary">{asset.assetType.name}</p>
          <h1 className="mt-3 text-[38px] font-semibold leading-[46px] text-primary">Asset {asset.qrCode}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={asset.status} />
            <span className="text-sm font-semibold text-on-surface-variant">Versao {asset.version}</span>
            <span className="text-sm font-semibold text-on-surface-variant">Tecnico: {asset.createdBy.name}</span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant">
            {asset.notes ?? 'Sem notas internas registradas.'}
          </p>
        </div>
        <div className="rounded-[24px] bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-secondary">
            <MapPin className="h-5 w-5" />
            Localizacao
          </div>
          <p className="mt-3 text-2xl font-semibold text-primary">
            {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">Precisao: {asset.gpsAccuracyM ?? '-'}m</p>
        </div>
      </section>

      <AssetMap assets={[asset]} height={360} />

      <section className="panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <Camera className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-semibold text-primary">Galeria</h2>
        </div>
        {media.length === 0 ? (
          <p className="rounded-[20px] bg-surface-container-low p-5 text-sm font-semibold text-on-surface-variant">
            Nenhuma midia vinculada a este asset.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {media.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightbox(item)}
                className="relative aspect-square overflow-hidden rounded-[24px] bg-surface-container-high"
              >
                <Image src={item.url} alt="Midia do asset" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Manejos">
          {manejos.map((item) => (
            <div key={item.id} className="rounded-[20px] bg-white/45 p-4">
              <StatusBadge status={item.status} />
              <p className="mt-3 text-sm text-on-surface-variant">{item.description}</p>
            </div>
          ))}
          {manejos.length === 0 ? <Empty text="Sem manejos vinculados." /> : null}
        </Panel>
        <Panel title="Monitoramentos">
          {monitoramentos.map((item) => (
            <div key={item.id} className="rounded-[20px] bg-white/45 p-4">
              <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold uppercase text-secondary">
                {item.healthStatus}
              </span>
              <p className="mt-3 text-sm text-on-surface-variant">{item.notes}</p>
            </div>
          ))}
          {monitoramentos.length === 0 ? <Empty text="Sem monitoramentos vinculados." /> : null}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Historico de versoes" icon={<History className="h-5 w-5" />}>
          {history.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-[20px] bg-white/45 p-4">
              <span className="font-semibold text-primary">Versao {item.version}</span>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </Panel>
        <Panel title="Auditoria">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-[20px] bg-white/45 p-4">
              <p className="text-sm font-bold text-primary">{log.action}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {log.performedBy.name || log.performedBy.id} - {new Date(log.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
          {auditLogs.length === 0 ? <Empty text="Sem eventos de auditoria visiveis." /> : null}
        </Panel>
      </section>

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-black/80 p-8"
          onClick={() => setLightbox(null)}
          aria-label="Fechar imagem"
        >
          <span className="relative block h-full w-full">
            <Image src={lightbox.url} alt="Midia ampliada" fill className="object-contain" unoptimized />
          </span>
        </button>
      ) : null}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel space-y-3 p-6">
      <div className="mb-4 flex items-center gap-2 text-xl font-semibold text-primary">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[20px] bg-surface-container-low p-5 text-sm font-semibold text-on-surface-variant">{text}</p>;
}
