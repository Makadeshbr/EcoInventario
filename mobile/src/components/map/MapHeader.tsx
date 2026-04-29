import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/tokens';
import { router } from 'expo-router';

interface MapHeaderProps {
  onLocationPress: () => void;
}

// Altura fixa do conteúdo do header (botões + padding vertical)
export const MAP_HEADER_CONTENT_HEIGHT = 48 + 16 + 12; // botão + paddingTop + paddingBottom

export function MapHeader({ onLocationPress }: MapHeaderProps) {
  const insets = useSafeAreaInsets();
  // Altura total real do header = safe area top + conteúdo
  const headerHeight = insets.top + MAP_HEADER_CONTENT_HEIGHT;

  return (
    <>
      {/* Gradiente de fundo atrás do header */}
      <View
        style={[styles.topGradient, { height: headerHeight + 32 }]}
        pointerEvents="none"
      />

      {/* Header posicionado absolutamente */}
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Botão Voltar */}
        <TouchableOpacity
          style={styles.glassBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>

        {/* Título centralizado */}
        <Text style={styles.title} numberOfLines={1}>
          EcoInventário
        </Text>

        {/* Botão minha localização */}
        <TouchableOpacity
          style={styles.glassBtn}
          onPress={onLocationPress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="my-location" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247, 250, 245, 0.7)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
