import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, glass } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { router } from 'expo-router';

interface MapHeaderProps {
  onLocationPress: () => void;
}

// Altura fixa do conteúdo do header (botões + padding vertical)
export const MAP_HEADER_CONTENT_HEIGHT = 48 + 16 + 12; // botão + paddingTop + paddingBottom

/** Scrim do topo: opaco sobre o mapa e dissolvendo para transparente. */
const SCRIM_COLORS = ['rgba(247,250,245,0.92)', 'rgba(247,250,245,0.55)', 'transparent'] as const;

function GlassButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={styles.glassBtn}
      scaleTo={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <BlurView intensity={glass.blur} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <MaterialIcons name={icon} size={22} color={colors.onSurface} />
    </PressableScale>
  );
}

export function MapHeader({ onLocationPress }: MapHeaderProps) {
  const insets = useSafeAreaInsets();
  // Altura total real do header = safe area top + conteúdo
  const headerHeight = insets.top + MAP_HEADER_CONTENT_HEIGHT;

  return (
    <>
      {/* Scrim em gradiente atrás do header: contraste sem "faixa" dura */}
      <LinearGradient
        colors={SCRIM_COLORS}
        style={[styles.topGradient, { height: headerHeight + 48 }]}
        pointerEvents="none"
      />

      {/* Header posicionado absolutamente */}
      <FadeInView from="up" style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <GlassButton icon="arrow-back" label="Voltar" onPress={() => router.back()} />

        <Text style={styles.title} numberOfLines={1}>
          EcoInventário
        </Text>

        <GlassButton
          icon="my-location"
          label="Ir para minha localização"
          onPress={onLocationPress}
        />
      </FadeInView>
    </>
  );
}

const styles = StyleSheet.create({
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 12,
  },
  glassBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: glass.bgStrong,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: glass.shadowTint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.onSurface,
    letterSpacing: -0.4,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
});
