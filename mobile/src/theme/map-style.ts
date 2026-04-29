import type { MapStyleElement } from 'react-native-maps';

/**
 * Estilo customizado do Google Maps alinhado com a paleta EcoInventário.
 *
 * Princípios:
 * - Base terrestre: surfaceContainerLow (#f1f4ef) — quase branco esverdeado
 * - Áreas verdes/parques: secondaryContainer (#cfeacc) — verde-sálvia claro
 * - Água: secondaryFixedDim (#b3cdb1) — verde acinzentado suave
 * - Estradas: branco puro com contorno sutil — não competem com os markers
 * - POIs e trânsito: ocultos — foco total nos ativos do app
 * - Labels: onSurfaceVariant (#444748) — discretos
 */
export const ECO_MAP_STYLE: MapStyleElement[] = [
  // ── Base geral
  { elementType: 'geometry', stylers: [{ color: '#f1f4ef' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#444748' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },

  // ── Divisas administrativas — apagadas para limpar o visual
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#747878' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4d644d' }],
  },

  // ── Paisagem natural — verde-sálvia claro
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#e0ecde' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#f1f4ef' }],
  },

  // ── Parques e áreas verdes — destaque em verde-sálvia
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#cfeacc' }] },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4d644d' }],
  },
  { featureType: 'poi.park', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // ── Todos os outros POIs — ocultos (o app substitui com os próprios markers)
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#e6e9e4' }],
  },

  // ── Estradas principais
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e6e9e4' }, { weight: 1 }],
  },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#747878' }],
  },

  // ── Rodovias — tom levemente mais escuro para hierarquia
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#ecefea' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c4c7c7' }, { weight: 1 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4d644d' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#747878' }],
  },

  // ── Transporte público — oculto
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // ── Água — verde acinzentado suave (não azul clássico)
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#b3cdb1' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4d644d' }],
  },
];
