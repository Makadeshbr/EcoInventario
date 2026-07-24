import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass, radius as radiusTokens } from '@/theme/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Intensidade do blur (sobrescreve o padrão). */
  intensity?: number;
  /** Vidro mais opaco/forte (para sheets e destaques). */
  strong?: boolean;
  /** Raio dos cantos. Padrão: radius.lg. */
  radius?: number;
}

/**
 * Painel de vidro (glassmorphism) conforme o DESIGN.md do Stitch: profundidade
 * via backdrop-blur + camada translúcida + borda interna branca, em vez de
 * drop shadow tradicional. Usa uma sombra ambiente suave e tingida só para o
 * efeito de "flutuar".
 */
export function GlassCard({
  children,
  style,
  intensity,
  strong = false,
  radius = radiusTokens.lg,
}: GlassCardProps) {
  const blurIntensity = intensity ?? (strong ? glass.blurStrong : glass.blur);

  return (
    <View style={[styles.wrapper, { borderRadius: radius }, style]}>
      <BlurView intensity={blurIntensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: strong ? glass.bgStrong : glass.bg },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.border,
    // Sombra ambiente suave e tingida (sensação de flutuação, não caixa).
    shadowColor: glass.shadowTint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
});
