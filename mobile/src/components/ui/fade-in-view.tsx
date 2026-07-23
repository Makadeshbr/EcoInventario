import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { motion } from '@/theme/tokens';

type Direction = 'down' | 'up' | 'none';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Atraso em ms — use incremental para efeito de stagger entre itens. */
  delay?: number;
  /** Direção da entrada. Padrão: 'down' (desliza de cima com fade). */
  from?: Direction;
  /** Duração em ms. Padrão: motion.duration.base. */
  duration?: number;
}

const ENTERING: Record<Direction, typeof FadeIn> = {
  down: FadeInDown,
  up: FadeInUp,
  none: FadeIn,
};

/**
 * Envolve o conteúdo com uma animação de entrada (fade + slide). Passe `delay`
 * incremental em listas/seções para criar o efeito de stagger.
 */
export function FadeInView({
  children,
  style,
  delay = 0,
  from = 'down',
  duration = motion.duration.base,
}: FadeInViewProps) {
  const entering = ENTERING[from].duration(duration).delay(delay);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
