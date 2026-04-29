import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { MAP_HEADER_CONTENT_HEIGHT } from './MapHeader';
import type { PublicAssetType } from '@/features/public/types';

interface MapFiltersProps {
  assetTypes: PublicAssetType[] | undefined;
  selectedTypeId: string | undefined;
  onSelectType: (id: string | undefined) => void;
}

export function MapFilters({ assetTypes, selectedTypeId, onSelectType }: MapFiltersProps) {
  const insets = useSafeAreaInsets();
  // Posiciona logo abaixo do header real: safe area + conteúdo do header + gap
  const topOffset = insets.top + MAP_HEADER_CONTENT_HEIGHT + 8;

  return (
    <View style={[styles.container, { top: topOffset }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedTypeId && styles.chipActive]}
          onPress={() => onSelectType(undefined)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, !selectedTypeId && styles.chipTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>

        {assetTypes?.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.chip, selectedTypeId === t.id && styles.chipActive]}
            onPress={() => onSelectType(selectedTypeId === t.id ? undefined : t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selectedTypeId === t.id && styles.chipTextActive]}>
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
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
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.15,
  },
  chipText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
});
