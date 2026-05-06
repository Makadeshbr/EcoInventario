import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { usePublicAsset } from '@/features/public/queries';
import { useNetworkStatus } from '@/hooks/use-network-status';
import type { PublicMonitoramento } from '@/features/public/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HEALTH_CONFIG: Record<
  PublicMonitoramento['health_status'],
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  healthy:  { label: 'Saudável', bg: '#d4edda', text: '#155724', border: '#b7f569', icon: 'check-circle' },
  warning:  { label: 'Atenção',  bg: '#fff3cd', text: '#856404', border: '#ffc107', icon: 'warning' },
  critical: { label: 'Crítico',  bg: '#f8d7da', text: '#721c24', border: '#f5c6cb', icon: 'error' },
  dead:     { label: 'Morto',    bg: '#e2e3e5', text: '#383d41', border: '#adb5bd', icon: 'dangerous' },
};

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();
  const { data: asset, isLoading, isError } = usePublicAsset(id!);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: '#cfeacc' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !asset) {
    return (
      <View style={[styles.error, { paddingTop: insets.top, backgroundColor: '#cfeacc' }]}>
        <MaterialIcons name={isConnected ? 'error-outline' : 'wifi-off'} size={48} color="#102000" />
        <Text style={styles.errorText}>
          {isConnected ? 'Ativo não encontrado ou indisponível.' : 'Conecte-se à internet para ver este ativo.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const latestMonitoramento = asset.monitoramentos[0] ?? null;
  const healthConfig = latestMonitoramento ? HEALTH_CONFIG[latestMonitoramento.health_status] : null;

  const photos = asset.media.length > 0
    ? asset.media
    : [{ id: 'placeholder', url: 'https://via.placeholder.com/400', type: 'image' as const }];

  const openDirections = () => {
    const coords = `${asset.latitude},${asset.longitude}`;
    const url = Platform.OS === 'ios' ? `maps:?q=${coords}` : `geo:${coords}?q=${coords}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/maps?q=${coords}`));
  };

  return (
    <View style={styles.container}>
      {/* Header Fixo - Posicionamento Sênior */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.glassCircle} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#102000" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.glassCircle}>
              <MaterialIcons name="share" size={22} color="#102000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.glassCircle}>
              <MaterialIcons name="favorite-border" size={22} color="#102000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Canvas da Planta - Ocupando a tela toda lateralmente */}
        <View style={styles.canvas}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActivePhotoIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.url }}
                  style={styles.mainImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Orbiting Badges - Reposicionados para evitar conflito com Header */}
          <View style={[styles.orbitBadge, styles.badgeLeft]}>
            <BlurView intensity={25} tint="light" style={styles.badgeBlur}>
              <View style={[styles.healthRing, { borderColor: healthConfig?.border || '#b7f569' }]}>
                <Text style={styles.healthPercent}>90%</Text>
              </View>
              <MaterialIcons name="monitor-heart" size={14} color="#102000" />
              <Text style={styles.badgeLabel}>SAÚDE</Text>
            </BlurView>
          </View>

          <View style={[styles.orbitBadge, styles.badgeRight]}>
            <BlurView intensity={25} tint="light" style={styles.badgeBlur}>
              <View style={styles.phaseIconBox}>
                <MaterialIcons name="eco" size={18} color="#102000" />
              </View>
              <Text style={styles.badgeSubLabel}>FASE</Text>
              <Text style={styles.badgeValue}>Adulta</Text>
            </BlurView>
          </View>

          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === activePhotoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Espaçador para o Bottom Sheet */}
        <View style={{ height: SCREEN_HEIGHT * 0.55 }} />
      </ScrollView>

      {/* Floating Bottom Sheet */}
      <View style={[styles.sheetWrapper, { bottom: insets.bottom + 20 }]}>
        <BlurView intensity={85} tint="light" style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          
          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetContent}>
            <View style={styles.infoSection}>
              <Text style={styles.assetName}>{asset.asset_type.name}</Text>
              <Text style={styles.scientificName}>Handroanthus albus</Text>
              
              <View style={styles.tagContainer}>
                <View style={styles.tag}><Text style={styles.tagText}>Nativa</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>Floração</Text></View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Histórico de Manejos</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#5f5e5e" />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                {asset.manejos.length > 0 ? (
                  asset.manejos.map((m) => (
                    <View key={m.id} style={styles.manejoCard}>
                      <Image source={{ uri: m.before_media_url || 'https://via.placeholder.com/150' }} style={styles.manejoImg} />
                      <View style={styles.manejoMeta}>
                        <Text style={styles.manejoTitle} numberOfLines={1}>{m.description}</Text>
                        <Text style={styles.manejoDate}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Nenhum manejo registrado.</Text>
                )}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monitoramentos</Text>
              {asset.monitoramentos.length > 0 ? (
                asset.monitoramentos.map((m) => {
                  const cfg = HEALTH_CONFIG[m.health_status];
                  return (
                    <View key={m.id} style={styles.monitorCard}>
                      <View style={[styles.statusIndicator, { backgroundColor: cfg.border }]} />
                      <View style={styles.monitorInfo}>
                        <View style={styles.monitorRow}>
                          <Text style={[styles.statusLabel, { color: cfg.text }]}>{cfg.label}</Text>
                          <Text style={styles.monitorDate}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</Text>
                        </View>
                        {m.notes ? <Text style={styles.monitorNotes}>{m.notes}</Text> : null}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Nenhum monitoramento registrado.</Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.actionBtn} onPress={openDirections} activeOpacity={0.9}>
            <MaterialIcons name="directions" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Como chegar</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cfeacc',
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { ...typography.bodyMd, marginBottom: 20, textAlign: 'center' },
  backBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.full },
  backBtnText: { color: '#fff', fontWeight: 'bold' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 10 },

  scrollContent: { paddingTop: 0 },
  canvas: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImage: {
    width: '100%', // Agora consome toda a lateral se necessário
    height: '100%',
    transform: [{ scale: 1.1 }], // Leve zoom para garantir o preenchimento sênior
  },

  orbitBadge: {
    position: 'absolute',
    borderRadius: 30,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 10,
  },
  badgeBlur: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Reposicionados para não bater no Header
  badgeLeft: { 
    left: 15, 
    top: '35%', // Baixei o badge da saúde
  },
  badgeRight: { 
    right: 15, 
    top: '55%', 
  },

  healthRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#b7f569',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  healthPercent: { fontSize: 10, fontWeight: '900', color: '#102000' },
  badgeLabel: { fontSize: 8, fontWeight: 'bold', color: '#102000' },
  
  phaseIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeSubLabel: { fontSize: 8, color: '#102000', opacity: 0.6 },
  badgeValue: { fontSize: 10, fontWeight: 'bold', color: '#102000' },

  dots: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(16,32,0,0.1)' },
  dotActive: { width: 14, backgroundColor: colors.secondary },

  sheetWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
  },
  bottomSheet: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    maxHeight: SCREEN_HEIGHT * 0.55,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#102000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(16, 32, 0, 0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetContent: { flexShrink: 1 },
  infoSection: { marginBottom: 24 },
  assetName: { fontSize: 32, fontWeight: '900', color: '#102000', letterSpacing: -1 },
  scientificName: { fontSize: 15, fontStyle: 'italic', color: '#5f5e5e', marginBottom: 12 },
  tagContainer: { flexDirection: 'row', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagText: { fontSize: 10, fontWeight: '700', color: '#102000' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#102000', textTransform: 'uppercase', letterSpacing: 1 },
  
  hScroll: { marginHorizontal: -24, paddingHorizontal: 24 },
  manejoCard: {
    width: 125,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  manejoImg: { width: '100%', height: 85 },
  manejoMeta: { padding: 10 },
  manejoTitle: { fontSize: 11, fontWeight: 'bold', color: '#102000' },
  manejoDate: { fontSize: 9, color: '#5f5e5e' },

  monitorCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusIndicator: { width: 3, borderRadius: 2, marginRight: 12 },
  monitorInfo: { flex: 1 },
  monitorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  statusLabel: { fontSize: 12, fontWeight: '800' },
  monitorDate: { fontSize: 9, color: '#5f5e5e' },
  monitorNotes: { fontSize: 11, color: '#102000', lineHeight: 16, opacity: 0.8 },

  emptyText: { fontSize: 11, fontStyle: 'italic', color: '#5f5e5e' },

  actionBtn: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
