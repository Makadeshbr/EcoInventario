import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/theme/tokens';

type GradientColors = readonly [string, string, ...string[]];

interface GradientBackgroundProps {
  children?: React.ReactNode;
  /** Cores do gradiente (tupla de 2+). Padrão: canvas suave. */
  colors?: GradientColors;
  /** Direção do gradiente. Padrão: vertical (topo → base). */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
}

/**
 * Fundo em gradiente para dar profundidade ao canvas (Nível 0 do DESIGN.md).
 * Usado como container raiz das telas em vez de um backgroundColor sólido.
 */
export function GradientBackground({
  children,
  colors = gradients.canvas,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  style,
}: GradientBackgroundProps) {
  return (
    <LinearGradient colors={colors} start={start} end={end} style={[styles.fill, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
