'use client';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import { getPublicAsset, listPublicAssets } from '@/features/public-map/api';
import type {
  PublicAssetDetailsData,
  PublicAssetSummary,
  PublicAssetType,
} from '@/features/public-map/schemas';

import { PublicAssetDetails } from './public-asset-details';

const DEFAULT_CENTER: L.LatLngExpression = [-23.5505, -46.6333];
const DEFAULT_BOUNDS = '-24.0505,-47.1333,-23.0505,-46.1333';

function boundsToQuery(bounds: L.LatLngBounds) {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return [southWest.lat, southWest.lng, northEast.lat, northEast.lng]
    .map((value) => value.toFixed(6))
    .join(',');
}

function buildPopup(asset: PublicAssetSummary, onDetails: () => void) {
  const wrapper = document.createElement('div');
  wrapper.style.minWidth = '210px';
  wrapper.style.fontFamily = 'Plus Jakarta Sans, Arial, sans-serif';

  const title = document.createElement('strong');
  title.textContent = asset.assetType.name;
  title.style.color = '#191c1a';
  wrapper.appendChild(title);

  const coords = document.createElement('p');
  coords.textContent = `${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}`;
  coords.style.margin = '8px 0 0';
  coords.style.color = '#444748';
  coords.style.fontSize = '12px';
  wrapper.appendChild(coords);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Ver detalhes';
  button.style.marginTop = '10px';
  button.style.color = '#4d644d';
  button.style.fontWeight = '800';
  button.addEventListener('click', onDetails);
  wrapper.appendChild(button);

  return wrapper;
}

export function PublicAssetsMap({ assetTypes }: { assetTypes: PublicAssetType[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [typeId, setTypeId] = useState('');
  const [assets, setAssets] = useState<PublicAssetSummary[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<PublicAssetDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function openDetails(id: string) {
    setError(null);
    await getPublicAsset(id).then(setSelectedAsset, () =>
      setError('Nao foi possivel carregar os detalhes publicos.'),
    );
  }

  async function refreshAssets(bounds?: string) {
    const map = mapRef.current;
    const queryBounds = bounds ?? (map ? boundsToQuery(map.getBounds()) : DEFAULT_BOUNDS);
    setLoading(true);
    setError(null);
    await listPublicAssets({ bounds: queryBounds, typeId: typeId || undefined, limit: 200 }).then(
      setAssets,
      () => setError('Nao foi possivel carregar o mapa publico.'),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    map.on('moveend', () => {
      void refreshAssets(boundsToQuery(map.getBounds()));
    });
    void refreshAssets(boundsToQuery(map.getBounds()));

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    void refreshAssets();
  }, [typeId]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.clearLayers();
    assets.forEach((asset) => {
      L.circleMarker([asset.latitude, asset.longitude], {
        radius: 11,
        color: '#ffffff',
        weight: 3,
        fillColor: '#000000',
        fillOpacity: 0.92,
      })
        .bindPopup(buildPopup(asset, () => void openDetails(asset.id)))
        .addTo(layer);
    });
  }, [assets]);

  return (
    <div className="relative h-dvh overflow-hidden bg-surface">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-white/70 to-transparent" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5">
        <a
          href="/"
          className="pointer-events-auto rounded-full border border-white/40 bg-white/50 px-5 py-3 text-sm font-black text-primary shadow-sm backdrop-blur-[30px]"
        >
          EcoInventario
        </a>
        <div className="rounded-full border border-white/40 bg-white/50 px-4 py-2 text-xs font-bold uppercase text-secondary shadow-sm backdrop-blur-[30px]">
          Mapa publico
        </div>
      </header>

      <nav className="no-scrollbar pointer-events-auto absolute left-0 right-0 top-[86px] z-30 overflow-x-auto px-6">
        <div className="flex w-max gap-3 pb-4">
          <button
            type="button"
            onClick={() => setTypeId('')}
            className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-sm ${
              typeId === '' ? 'bg-primary text-on-primary' : 'border border-white/40 bg-white/60 text-primary backdrop-blur-[30px]'
            }`}
          >
            Todos
          </button>
          {assetTypes.map((assetType) => (
            <button
              key={assetType.id}
              type="button"
              onClick={() => setTypeId(assetType.id)}
              className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-sm ${
                typeId === assetType.id
                  ? 'bg-primary text-on-primary'
                  : 'border border-white/40 bg-white/60 text-primary backdrop-blur-[30px]'
              }`}
            >
              {assetType.name}
            </button>
          ))}
        </div>
      </nav>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-surface/70 to-transparent" />

      <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-30 flex flex-col items-end gap-3 lg:left-auto">
        {error ? (
          <div className="pointer-events-auto rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-error shadow-sm">
            {error}
          </div>
        ) : null}
        <div className="pointer-events-auto rounded-full border border-white/40 bg-white/60 px-4 py-3 text-sm font-bold text-primary shadow-sm backdrop-blur-[30px]">
          {loading ? 'Carregando...' : `${assets.length} ativos aprovados`}
        </div>
      </div>

      {selectedAsset ? (
        <div className="pointer-events-none absolute bottom-24 right-6 z-40 flex justify-end">
          <PublicAssetDetails asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
        </div>
      ) : null}
    </div>
  );
}
