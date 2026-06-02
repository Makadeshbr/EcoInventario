'use client';

import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';

import type { Asset } from '@/features/assets/schemas';
import { emojiForAssetType } from '@/lib/asset-icon';

type Cluster = {
  key: string;
  latitude: number;
  longitude: number;
  assets: Asset[];
};

function clusterAssets(assets: Asset[]): Cluster[] {
  const grouped = new Map<string, Asset[]>();
  for (const asset of assets) {
    const key = `${asset.latitude.toFixed(3)}:${asset.longitude.toFixed(3)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), asset]);
  }
  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    latitude: items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
    longitude: items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
    assets: items,
  }));
}

function popupHtml(cluster: Cluster) {
  const title =
    cluster.assets.length > 1
      ? `${cluster.assets.length} ativos agrupados`
      : cluster.assets[0]?.assetType.name;
  const rows = cluster.assets
    .slice(0, 5)
    .map(
      (asset) => `
        <div style="padding:8px 0;border-top:1px solid #ecefea">
          <strong>${asset.assetType.name}</strong>
          <div style="margin-top:4px;color:#444748;font-size:12px">${asset.status}</div>
          <a href="/dashboard/assets/${asset.id}" style="display:inline-block;margin-top:6px;color:#4d644d;font-weight:700">Ver detalhes</a>
        </div>
      `,
    )
    .join('');

  return `<div style="min-width:210px;font-family:Plus Jakarta Sans,Arial,sans-serif">
    <div style="font-weight:800;color:#191c1a;margin-bottom:8px">${title ?? 'Asset'}</div>
    ${rows}
  </div>`;
}

export function AssetMap({ assets, height = 520 }: { assets: Asset[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const clusters = useMemo(() => clusterAssets(assets), [assets]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const center: L.LatLngExpression = assets[0]
      ? [assets[0].latitude, assets[0].longitude]
      : [-23.5505, -46.6333];

    const map = L.map(containerRef.current, {
      center,
      zoom: assets.length > 0 ? 13 : 5,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [assets]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    clusters.forEach((cluster) => {
      const isCluster = cluster.assets.length > 1;

      if (isCluster) {
        // Agrupamento: círculo escuro com a contagem de ativos.
        L.marker([cluster.latitude, cluster.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#102000;color:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);font-weight:800;font-size:13px">${cluster.assets.length}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        })
          .bindPopup(popupHtml(cluster))
          .addTo(layer);
        return;
      }

      // Ponto único: balão verde com emoji derivado do nome do tipo.
      const emoji = emojiForAssetType(cluster.assets[0]?.assetType.name);
      L.marker([cluster.latitude, cluster.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#4d644d;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2);font-size:18px;line-height:1">${emoji}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      })
        .bindPopup(popupHtml(cluster))
        .addTo(layer);
    });

    if (clusters.length > 0) {
      const bounds = L.latLngBounds(clusters.map((cluster) => [cluster.latitude, cluster.longitude]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    }
  }, [clusters]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 shadow-lg shadow-black/5">
      <div ref={containerRef} style={{ height, width: '100%' }} />
    </div>
  );
}
