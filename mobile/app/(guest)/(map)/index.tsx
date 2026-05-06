import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/tokens';
import { ECO_MAP_STYLE } from '@/theme/map-style';
import { usePublicAssets, usePublicAssetTypes } from '@/features/public/queries';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { MapHeader } from '@/components/map/MapHeader';
import { MapFilters } from '@/components/map/MapFilters';
import { MapMarker } from '@/components/map/MapMarker';
import { useMapClusters, type ClusterItem } from '@/hooks/use-map-clusters';

// Região inicial cobre o Sudeste do Brasil — delta grande garante que a
// primeira query inclui assets cadastrados na região SP/RJ/MG antes de
// centralizar no GPS do usuário.
const INITIAL_REGION: Region = {
  latitude: -22.0,
  longitude: -47.5,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

const BOUNDS_DEBOUNCE_MS = 400; // Reduzido para ser mais responsivo

function regionToBounds(r: Region): string {
  const swLat = r.latitude - r.latitudeDelta / 2;
  const neLat = r.latitude + r.latitudeDelta / 2;
  const swLng = r.longitude - r.longitudeDelta / 2;
  const neLng = r.longitude + r.longitudeDelta / 2;
  return `${swLng},${swLat},${neLng},${neLat}`;
}

function ClusterMarker({ item }: { item: Extract<ClusterItem, { kind: 'cluster' }> }) {
  const [tracksView, setTracksView] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksView(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: item.lat, longitude: item.lng }}
      tracksViewChanges={tracksView}
    >
      <View style={styles.cluster}>
        <View style={styles.clusterInner}>
          <Text style={styles.clusterCount}>{item.count}</Text>
        </View>
      </View>
    </Marker>
  );
}

export default function MapExplorarScreen() {
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(INITIAL_REGION);
  const [activeBounds, setActiveBounds] = useState<string>(regionToBounds(INITIAL_REGION));
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isConnected } = useNetworkStatus();
  const { data: assetTypes } = usePublicAssetTypes();
  const { data: assets, isLoading } = usePublicAssets(activeBounds, selectedTypeId);
  const hasAutoCentered = useRef(false);

  // LOG de Depuração: Veja se os assets estão chegando
  useEffect(() => {
    if (assets) {
      console.log(`[MAPA] Assets carregados: ${assets.length} ativos nos limites: ${activeBounds}`);
    }
  }, [assets, activeBounds]);

  useEffect(() => {
    if (!assets || assets.length === 0 || hasAutoCentered.current || !mapRef.current) return;
    hasAutoCentered.current = true;
    mapRef.current.fitToCoordinates(
      assets.map(a => ({ latitude: a.latitude, longitude: a.longitude })),
      { edgePadding: { top: 100, right: 50, bottom: 100, left: 50 }, animated: true }
    );
  }, [assets]);

  const clusters = useMapClusters(assets, currentRegion);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
        // Não sobrescreve se fitToCoordinates já centralizou nos assets.
        if (hasAutoCentered.current) return;
        const userRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 2.0,
          longitudeDelta: 2.0,
        };
        setCurrentRegion(userRegion);
        mapRef.current?.animateToRegion(userRegion, 800);
      });
    });
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setCurrentRegion(r);

    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(() => {
      setActiveBounds(regionToBounds(r));
    }, BOUNDS_DEBOUNCE_MS);
  }, []);

  const handleMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

  const retryFetch = useCallback(() => {
    setActiveBounds(regionToBounds(currentRegion));
  }, [currentRegion]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={ECO_MAP_STYLE}
      >
        {clusters.map((item) => {
          if (item.kind === 'cluster') {
            return (
              <ClusterMarker
                key={`cluster-${item.id}`}
                item={item}
              />
            );
          }
          return (
            <MapMarker
              key={`asset-${item.asset.id}`}
              asset={item.asset}
              onPress={() => router.push(`/(guest)/(map)/asset/${item.asset.id}`)}
            />
          );
        })}
      </MapView>

      <MapHeader onLocationPress={handleMyLocation} />

      <MapFilters
        assetTypes={assetTypes}
        selectedTypeId={selectedTypeId}
        onSelectType={setSelectedTypeId}
      />

      {isLoading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.offlineText}>Sem conexão com a internet</Text>
          <TouchableOpacity onPress={retryFetch} style={styles.retryBtn} activeOpacity={0.8}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(77, 100, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clusterCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBadge: {
    position: 'absolute',
    top: 150,
    right: 20,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  offlineBanner: {
    position: 'absolute',
    bottom: 100,
    left: spacing.marginMobile,
    right: spacing.marginMobile,
    backgroundColor: 'rgba(16, 32, 0, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  offlineText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
