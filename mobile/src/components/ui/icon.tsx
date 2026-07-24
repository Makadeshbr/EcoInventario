import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/**
 * Camada única de ícones do app.
 *
 * O DESIGN.md do Stitch pede "ultra-thin line icons"; o MaterialIcons é
 * grosso e preenchido. Aqui o vocabulário é semântico e a família fica
 * escondida: Feather para o cromo de interface (traço fino uniforme) e
 * MaterialCommunityIcons outline para o conjunto botânico, que o Feather
 * não cobre. Ambas já vêm no @expo/vector-icons — são fontes, não módulo
 * nativo, então não exigem novo build.
 *
 * O `satisfies` no fim valida cada glifo contra o glyphmap da família em
 * tempo de compilação: nome errado vira erro de tsc, não quadradinho vazio
 * no aparelho do usuário.
 */
type IconSpec =
  | { family: 'feather'; glyph: keyof typeof Feather.glyphMap }
  | { family: 'mci'; glyph: keyof typeof MaterialCommunityIcons.glyphMap };

export const ICONS = {
  // ── Navegação e ações ──────────────────────────────────────────────────────
  add: { family: 'feather', glyph: 'plus' },
  back: { family: 'feather', glyph: 'arrow-left' },
  forward: { family: 'feather', glyph: 'arrow-right' },
  chevronRight: { family: 'feather', glyph: 'chevron-right' },
  close: { family: 'feather', glyph: 'x' },
  cancel: { family: 'feather', glyph: 'x-circle' },
  edit: { family: 'feather', glyph: 'edit-2' },
  save: { family: 'feather', glyph: 'save' },
  send: { family: 'feather', glyph: 'send' },
  share: { family: 'feather', glyph: 'share-2' },
  externalLink: { family: 'feather', glyph: 'external-link' },
  expand: { family: 'feather', glyph: 'maximize-2' },
  search: { family: 'feather', glyph: 'search' },

  // ── Estado e feedback ──────────────────────────────────────────────────────
  success: { family: 'feather', glyph: 'check-circle' },
  error: { family: 'feather', glyph: 'alert-circle' },
  warning: { family: 'feather', glyph: 'alert-triangle' },
  info: { family: 'feather', glyph: 'info' },
  blocked: { family: 'feather', glyph: 'slash' },
  pending: { family: 'mci', glyph: 'timer-sand' },
  history: { family: 'feather', glyph: 'clock' },
  verified: { family: 'mci', glyph: 'check-decagram-outline' },

  // ── Sincronização e rede ───────────────────────────────────────────────────
  sync: { family: 'feather', glyph: 'refresh-cw' },
  syncProblem: { family: 'mci', glyph: 'sync-alert' },
  cloudDone: { family: 'mci', glyph: 'cloud-check-outline' },
  cloudOff: { family: 'feather', glyph: 'cloud-off' },
  cloud: { family: 'feather', glyph: 'cloud' },
  offline: { family: 'feather', glyph: 'wifi-off' },

  // ── Localização e mapa ─────────────────────────────────────────────────────
  place: { family: 'feather', glyph: 'map-pin' },
  map: { family: 'feather', glyph: 'map' },
  explore: { family: 'feather', glyph: 'compass' },
  myLocation: { family: 'feather', glyph: 'crosshair' },
  directions: { family: 'feather', glyph: 'navigation' },
  editLocation: { family: 'mci', glyph: 'map-marker-plus-outline' },
  radar: { family: 'mci', glyph: 'radar' },
  globe: { family: 'feather', glyph: 'globe' },

  // ── Captura ────────────────────────────────────────────────────────────────
  camera: { family: 'feather', glyph: 'camera' },
  addPhoto: { family: 'mci', glyph: 'camera-plus-outline' },
  qrCode: { family: 'mci', glyph: 'qrcode' },
  qrScan: { family: 'mci', glyph: 'qrcode-scan' },
  tap: { family: 'mci', glyph: 'gesture-tap' },

  // ── Conta e sistema ────────────────────────────────────────────────────────
  home: { family: 'feather', glyph: 'home' },
  person: { family: 'feather', glyph: 'user' },
  mail: { family: 'feather', glyph: 'mail' },
  lock: { family: 'feather', glyph: 'lock' },
  login: { family: 'feather', glyph: 'log-in' },
  logout: { family: 'feather', glyph: 'log-out' },
  phone: { family: 'feather', glyph: 'phone' },
  list: { family: 'feather', glyph: 'clipboard' },
  calendar: { family: 'feather', glyph: 'calendar' },
  visibility: { family: 'feather', glyph: 'eye' },
  settings: { family: 'feather', glyph: 'settings' },
  notes: { family: 'feather', glyph: 'edit-3' },
  menu: { family: 'feather', glyph: 'menu' },
  trash: { family: 'feather', glyph: 'trash-2' },

  // ── Manejo ─────────────────────────────────────────────────────────────────
  cut: { family: 'feather', glyph: 'scissors' },

  // ── Botânico (MCI outline — Feather não tem set de natureza) ────────────────
  leaf: { family: 'mci', glyph: 'leaf' },
  tree: { family: 'mci', glyph: 'tree-outline' },
  forest: { family: 'mci', glyph: 'forest-outline' },
  nature: { family: 'mci', glyph: 'nature-outline' },
  grass: { family: 'mci', glyph: 'grass' },
  sprout: { family: 'mci', glyph: 'sprout-outline' },
  flower: { family: 'mci', glyph: 'flower-outline' },
  flowerTulip: { family: 'mci', glyph: 'flower-tulip-outline' },
  garden: { family: 'mci', glyph: 'pot-outline' },
  crop: { family: 'mci', glyph: 'barley' },
} satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  const spec: IconSpec = ICONS[name];

  if (spec.family === 'feather') {
    return <Feather name={spec.glyph} size={size} color={color} style={style} />;
  }
  return <MaterialCommunityIcons name={spec.glyph} size={size} color={color} style={style} />;
}
