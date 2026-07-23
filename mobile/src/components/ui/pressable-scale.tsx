import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala alvo no press (padrão 0.97 — feedback tátil do DESIGN.md). */
  scaleTo?: number;
  /** Dispara haptic leve no toque. Padrão true. */
  haptic?: boolean;
}

/**
 * Botão/área tocável com feedback tátil: encolhe para `scaleTo` com mola e
 * dispara haptic leve. Substitui o TouchableOpacity+activeOpacity por um toque
 * mais físico e premium, consistente em todo o app.
 */
export function PressableScale({
  children,
  style,
  scaleTo = motion.scale.pressIn,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePressIn(e: GestureResponderEvent) {
    scale.value = withSpring(scaleTo, motion.spring.snappy);
    onPressIn?.(e);
  }

  function handlePressOut(e: GestureResponderEvent) {
    scale.value = withSpring(1, motion.spring.snappy);
    onPressOut?.(e);
  }

  function handlePress(e: GestureResponderEvent) {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  }

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
