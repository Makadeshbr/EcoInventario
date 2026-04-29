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
