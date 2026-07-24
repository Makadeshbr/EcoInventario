import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { ECO_MAP_STYLE } from '@/theme/map-style';
import { usePublicAssets, usePublicAssetTypes } from '@/features/public/queries';
import type { PublicAssetMarker } from '@/features/public/types';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { MapHeader } from '@/components/map/MapHeader';
import { MapFilters } from '@/components/map/MapFilters';
import { MapMarker } from '@/components/map/MapMarker';
import { MapPreviewSheet } from '@/components/map/MapPreviewSheet';
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

/** Diâmetro do cluster cresce com a densidade, entre 40 e 64px. */
const CLUSTER_MIN_SIZE = 40;
const CLUSTER_MAX_SIZE = 64;

function clusterSize(count: number): number {
  // Escala logarítmica: 2 pontos já se distinguem de 200 sem estourar o mapa.
  const growth = Math.log10(Math.max(count, 1)) * 12;
  return Math.min(CLUSTER_MIN_SIZE + growth, CLUSTER_MAX_SIZE);
}

function ClusterMarker({ item }: { item: Extract<ClusterItem, { kind: 'cluster' }> }) {
  const [tracksView, setTracksView] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksView(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const outer = clusterSize(item.count);
  const inner = outer - 12;

  return (
    <Marker
      coordinate={{ latitude: item.lat, longitude: item.lng }}
      tracksViewChanges={tracksView}
    >
      <View
        style={[styles.cluster, { width: outer, height: outer, borderRadius: outer / 2 }]}
      >
        <View
          style={[styles.clusterInner, { width: inner, height: inner, borderRadius: inner / 2 }]}
        >
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
  const [previewAsset, setPreviewAsset] = useState<PublicAssetMarker | null>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isConnected } = useNetworkStatus();
  const { data: assetTypes } = usePublicAssetTypes();
  const { data: assets, isLoading, isError, refetch } = usePublicAssets(activeBounds, selectedTypeId);
  const hasAutoCentered = useRef(false);

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
    refetch();
  }, [refetch]);

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
              isSelected={previewAsset?.id === item.asset.id}
              onPress={() => setPreviewAsset(item.asset)}
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
        <FadeInView from="none" duration={180} style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={styles.loadingText}>Buscando na área</Text>
        </FadeInView>
      )}

      <MapPreviewSheet
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onOpenDetail={(assetId) => router.push(`/(guest)/(map)/asset/${assetId}`)}
      />

      {(!isConnected || isError) && (
        <FadeInView from="up" style={styles.offlineBanner}>
          <MaterialIcons name={!isConnected ? 'wifi-off' : 'error-outline'} size={16} color="#fff" />
          <Text style={styles.offlineText}>
            {!isConnected ? 'Sem conexão com a internet' : 'Erro ao conectar com o servidor'}
          </Text>
          <PressableScale onPress={retryFetch} style={styles.retryBtn} scaleTo={0.94}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </PressableScale>
        </FadeInView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Cluster: halo translúcido + núcleo escuro com borda neon (dimensões vêm do count).
  cluster: {
    backgroundColor: 'rgba(183, 245, 105, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterInner: {
    backgroundColor: colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  clusterCount: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  loadingBadge: {
    position: 'absolute',
    top: 150,
    right: spacing.marginMobile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
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
