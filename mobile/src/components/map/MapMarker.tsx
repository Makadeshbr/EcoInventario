import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '@/theme/tokens';
import { iconForAssetType } from '@/utils/asset-icon';
import { Icon } from '@/components/ui/icon';

interface MapMarkerProps {
  asset: {
    id: string;
    latitude: number;
    longitude: number;
    asset_type?: { name: string } | null;
  };
  onPress: () => void;
  /** Marcador aberto na prévia: cresce e ganha anel neon. */
  isSelected?: boolean;
}

export function MapMarker({ asset, onPress, isSelected = false }: MapMarkerProps) {
  const [tracksView, setTracksView] = useState(true);

  // Otimização Sênior: Desativa o rastreio de mudanças após a renderização inicial
  // Isso garante performance no Android sem deixar o ícone invisível.
  // Reativa por um instante quando a seleção muda, senão o novo estilo não pinta.
  useEffect(() => {
    setTracksView(true);
    const timer = setTimeout(() => {
      setTracksView(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [isSelected]);

  return (
    <Marker
      coordinate={{ latitude: asset.latitude, longitude: asset.longitude }}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      tracksViewChanges={tracksView}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={isSelected ? 10 : 1}
    >
      <View style={[styles.container, isSelected && styles.containerSelected]}>
        {/* Halo só no selecionado: mantém a leitura de qual pino está aberto */}
        {isSelected ? <View style={styles.halo} /> : null}

        <View style={[styles.balloon, isSelected && styles.balloonSelected]}>
          <Icon
            name={iconForAssetType(asset.asset_type?.name)}
            size={isSelected ? 24 : 22}
            color={isSelected ? colors.accentDeep : '#ffffff'}
          />
        </View>
        <View style={[styles.pointer, isSelected && styles.pointerSelected]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 52,
  },
  containerSelected: {
    width: 64,
    height: 68,
  },
  halo: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(183,245,105,0.3)',
  },
  balloon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    // Sombra tingida em vez de preta: assenta melhor sobre o mapa verde.
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  balloonSelected: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    borderColor: '#ffffff',
    shadowColor: colors.accentDim,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 9,
  },
  pointer: {
    width: 8,
    height: 8,
    backgroundColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
  },
  pointerSelected: {
    width: 10,
    height: 10,
    backgroundColor: colors.accent,
    marginTop: -6,
  },
});
