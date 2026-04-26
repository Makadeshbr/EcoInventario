// TODO: Sem teste — scaffolding (navegação gerenciada por useSplashNavigation)
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSplashNavigation } from '@/hooks/use-splash-navigation';
import { colors, spacing, typography } from '@/theme/tokens';

export default function SplashScreen() {
  useSplashNavigation();

  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['45deg', '405deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <MaterialIcons name="eco" size={80} color={colors.primary} />
        <Text style={styles.brand}>EcoInventário</Text>
      </View>
      <View style={styles.loadingWrapper}>
        <Animated.View style={[styles.loadingRing, { transform: [{ rotate }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: spacing.md,
  },
  brand: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  loadingWrapper: {
    position: 'absolute',
    bottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.secondaryFixedDim,
    borderTopColor: colors.secondary,
    borderRightColor: colors.secondary,
  },
});
