import React, { useEffect } from 'react';
import { StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, radius as radiusTokens, motion } from '@/theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder de carregamento com pulso suave (shimmer por opacidade).
 * Usado para estados de loading em vez de spinner "genérico".
 */
export function Skeleton({ width = '100%', height = 16, radius = radiusTokens.md, style }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: motion.duration.slow }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceContainerHigh },
        animatedStyle,
        style,
      ]}
    />
  );
}
