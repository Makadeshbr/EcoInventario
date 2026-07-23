// Tokens extraídos dos arquivos HTML do Google Stitch
export const colors = {
  background: '#f7faf5',
  onBackground: '#191c1a',
  primary: '#000000',
  onPrimary: '#ffffff',
  secondary: '#4d644d',
  onSecondary: '#ffffff',
  secondaryContainer: '#cfeacc',
  onSecondaryContainer: '#536a53',
  secondaryFixedDim: '#b3cdb1',
  tertiaryFixed: '#b7f569',
  tertiaryFixedDim: '#9dd850',
  darkGreen: '#102000',
  surface: '#f7faf5',
  surfaceContainer: '#ecefea',
  surfaceContainerLow: '#f1f4ef',
  surfaceContainerHigh: '#e6e9e4',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#191c1a',
  onSurfaceVariant: '#444748',
  outline: '#747878',
  outlineVariant: '#c4c7c7',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  surfaceVariant: '#e0e3df',
  surfaceContainerHighest: '#dbe3d8',
  // Accent "pulso digital" (verde neon) — do DESIGN.md do Stitch, para
  // progresso, sucesso e realces de alto impacto. Usar com parcimônia.
  accent: '#b7f569',
  accentDim: '#9dd850',
  accentDeep: '#304f00',
} as const;

export const spacing = {
  xs: 4,
  sm: 12,
  base: 8,
  gutter: 16,
  md: 24,
  lg: 40,
  xl: 64,
  marginMobile: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  default: 16,
  lg: 32,
  xl: 48,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.96,
  },
  headlineLg: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
  },
  headlineMd: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  headlineSm: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  titleLg: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  titleMd: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  titleSm: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  bodyLg: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  labelLg: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
  },
  labelMd: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  labelSm: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
} as const;

// ── Motion ──────────────────────────────────────────────────────────────────
// Tokens de movimento para uso com reanimated (withTiming/withSpring).
export const motion = {
  duration: { instant: 100, fast: 180, base: 260, slow: 420, slower: 640 },
  // Presets de mola (config do withSpring).
  spring: {
    soft: { damping: 18, stiffness: 140, mass: 1 },
    snappy: { damping: 20, stiffness: 220, mass: 1 },
    bouncy: { damping: 12, stiffness: 180, mass: 1 },
  },
  // Escala tátil no press (DESIGN.md: scale-down em vez de mudança de cor).
  scale: { pressIn: 0.97, pressInStrong: 0.94 },
} as const;

// ── Gradientes ──────────────────────────────────────────────────────────────
// Arrays de cor para expo-linear-gradient.
export const gradients = {
  canvas: ['#f7faf5', '#eef4ea'],
  hero: ['#102000', '#2b4a1a', '#4d644d'], // verde profundo → sálvia
  accent: ['#b7f569', '#9dd850'],
  sheen: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.05)'],
  // Scrim escuro para garantir legibilidade de texto sobre fotos.
  photoScrim: ['transparent', 'rgba(16,32,0,0.75)'],
} as const;

// ── Glass (glassmorphism) ─────────────────────────────────────────────────────
// Specs para BlurView + camadas translúcidas (DESIGN.md: depth via blur, não drop shadow).
export const glass = {
  blur: 30,
  blurStrong: 50,
  tint: 'light' as const,
  bg: 'rgba(255,255,255,0.42)',
  bgStrong: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.6)',
  borderSubtle: 'rgba(255,255,255,0.35)',
  shadowTint: '#2d3a2d', // sombra ambiente tingida
} as const;
