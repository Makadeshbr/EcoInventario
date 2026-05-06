'use client';

import { X } from 'lucide-react';

import type { PublicAssetDetailsData } from '@/features/public-map/schemas';

const HEALTH_LABELS: Record<string, string> = {
  healthy: 'Saudavel',
  warning: 'Atencao',
  critical: 'Critico',
  dead: 'Morto',
};

export function PublicAssetDetails({
  asset,
  onClose,
}: {
  asset: PublicAssetDetailsData;
  onClose: () => void;
}) {
  return (
    <aside className="pointer-events-auto max-h-[calc(100dvh-150px)] w-full overflow-y-auto rounded-[28px] border border-white/50 bg-white/70 p-5 shadow-2xl shadow-black/10 backdrop-blur-[30px] lg:w-[420px]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-secondary">{asset.organizationName}</p>
          <h2 className="mt-2 text-2xl font-semibold text-primary">{asset.assetType.name}</h2>
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">
            {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar detalhes"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {asset.media.length > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3">
          {asset.media.slice(0, 4).map((media) => (
            <img
              key={media.id}
              src={media.url}
              alt={`Foto publica ${asset.assetType.name}`}
              className="aspect-square rounded-[20px] object-cover"
            />
          ))}
        </div>
      ) : null}

      <section className="rounded-[22px] bg-white/55 p-4">
        <p className="text-xs font-bold uppercase text-outline">QR publico</p>
        <p className="mt-2 break-all font-mono text-xs text-on-surface-variant">{asset.qrCode}</p>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-bold uppercase text-secondary">Manejos</h3>
        <div className="mt-3 grid gap-3">
          {asset.manejos.length === 0 ? (
            <p className="rounded-[20px] bg-white/45 p-4 text-sm font-semibold text-on-surface-variant">
              Nenhum manejo publico aprovado.
            </p>
          ) : (
            asset.manejos.map((manejo) => (
              <article key={manejo.id} className="rounded-[20px] bg-white/55 p-4">
                <p className="text-sm font-semibold text-primary">{manejo.description}</p>
                <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                  {new Date(manejo.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-bold uppercase text-secondary">Monitoramentos</h3>
        <div className="mt-3 grid gap-3">
          {asset.monitoramentos.length === 0 ? (
            <p className="rounded-[20px] bg-white/45 p-4 text-sm font-semibold text-on-surface-variant">
              Nenhum monitoramento publico aprovado.
            </p>
          ) : (
            asset.monitoramentos.map((monitoramento) => (
              <article key={monitoramento.id} className="rounded-[20px] bg-white/55 p-4">
                <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-secondary">
                  {HEALTH_LABELS[monitoramento.healthStatus]}
                </span>
                <p className="mt-3 text-sm font-semibold text-primary">{monitoramento.notes}</p>
                <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                  {new Date(monitoramento.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
