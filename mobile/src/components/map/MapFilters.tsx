import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography, gradients, glass } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { MAP_HEADER_CONTENT_HEIGHT } from './MapHeader';
import type { PublicAssetType } from '@/features/public/types';

interface MapFiltersProps {
  assetTypes: PublicAssetType[] | undefined;
  selectedTypeId: string | undefined;
  onSelectType: (id: string | undefined) => void;
}

function FilterChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[styles.chip, isActive && styles.chipActive]}
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      {isActive ? (
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
    </PressableScale>
  );
}

export function MapFilters({ assetTypes, selectedTypeId, onSelectType }: MapFiltersProps) {
  const insets = useSafeAreaInsets();
  // Posiciona logo abaixo do header real: safe area + conteúdo do header + gap
  const topOffset = insets.top + MAP_HEADER_CONTENT_HEIGHT + 8;

  return (
    <FadeInView delay={120} style={[styles.container, { top: topOffset }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <FilterChip
          label="Todos"
          isActive={!selectedTypeId}
          onPress={() => onSelectType(undefined)}
        />

        {assetTypes?.map((t) => (
          <FilterChip
            key={t.id}
            label={t.name}
            isActive={selectedTypeId === t.id}
            onPress={() => onSelectType(selectedTypeId === t.id ? undefined : t.id)}
          />
        ))}
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
  },
  content: {
    paddingHorizontal: spacing.marginMobile,
    gap: spacing.xs + 4,
    paddingBottom: spacing.gutter,
  },
  chip: {
    overflow: 'hidden',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: glass.bgStrong,
    borderWidth: 1,
    borderColor: glass.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chipActive: {
    borderColor: colors.accentDim,
    // Halo neon no filtro ativo, igual ao padrão da lista de inventário.
    shadowColor: colors.accentDim,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  chipText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  chipTextActive: {
    color: colors.accentDeep,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
