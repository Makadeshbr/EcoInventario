import { ImageOff } from 'lucide-react';

function PhotoSlot({ label, url }: { label: 'Antes' | 'Depois'; url: string | null }) {
  return (
    <figure className="overflow-hidden rounded-[24px] border border-white/60 bg-white/45">
      <div className="aspect-[4/3] bg-surface-container">
        {url ? (
          <img
            src={url}
            alt={`Foto ${label.toLowerCase()}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-center text-on-surface-variant">
            <div>
              <ImageOff className="mx-auto h-7 w-7 text-outline" />
              <p className="mt-2 text-sm font-bold">{label} indisponivel</p>
            </div>
          </div>
        )}
      </div>
      <figcaption className="px-4 py-3 text-xs font-bold uppercase text-secondary">{label}</figcaption>
    </figure>
  );
}

export function PhotoComparison({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string | null;
  afterUrl: string | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PhotoSlot label="Antes" url={beforeUrl} />
      <PhotoSlot label="Depois" url={afterUrl} />
    </div>
  );
}
