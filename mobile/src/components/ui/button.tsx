import { Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, radius, spacing, gradients } from '@/theme/tokens';
import { PressableScale } from './pressable-scale';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <PressableScale
      style={[styles.base, isPrimary ? styles.primary : styles.outline, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {/* Preenchimento neon do primário; o outline fica só com a borda. */}
      {isPrimary ? (
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? colors.accentDeep : colors.primary} />
      ) : (
        <Text style={[styles.label, !isPrimary && styles.labelOutline]}>{title}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
    overflow: 'hidden',
  },
  primary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.labelLg,
    color: colors.accentDeep,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  labelOutline: {
    color: colors.primary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
