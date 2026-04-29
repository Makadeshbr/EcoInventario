import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

interface MapMarkerProps {
  asset: {
    id: string;
    latitude: number;
    longitude: number;
  };
  onPress: () => void;
}

export function MapMarker({ asset, onPress }: MapMarkerProps) {
  const [tracksView, setTracksView] = useState(true);

  // Otimização Sênior: Desativa o rastreio de mudanças após a renderização inicial
  // Isso garante performance no Android sem deixar o ícone invisível.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksView(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: asset.latitude, longitude: asset.longitude }}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      tracksViewChanges={tracksView}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.balloon}>
          <MaterialIcons name="eco" size={22} color="#ffffff" />
        </View>
        <View style={styles.pointer} />
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
  balloon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
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
});
