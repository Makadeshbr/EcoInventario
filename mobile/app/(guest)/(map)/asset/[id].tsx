import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing, typography, glass, gradients } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoLightbox } from '@/components/ui/photo-lightbox';
import { usePublicAsset } from '@/features/public/queries';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { iconForAssetType } from '@/utils/asset-icon';
import type { PublicMonitoramento } from '@/features/public/types';
import { Icon, type IconName } from '@/components/ui/icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.52);

type HealthStatus = PublicMonitoramento['health_status'];

const HEALTH_CONFIG: Record<
  HealthStatus,
  { label: string; tint: string; onTint: string; icon: IconName }
> = {
  healthy: { label: 'Saudável', tint: colors.accent, onTint: colors.accentDeep, icon: 'leaf' },
  warning: { label: 'Atenção', tint: colors.clay, onTint: '#ffffff', icon: 'warning' },
  critical: { label: 'Crítico', tint: colors.error, onTint: '#ffffff', icon: 'error' },
  dead: { label: 'Morto', tint: colors.outline, onTint: '#ffffff', icon: 'blocked' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function GlassCircleButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={styles.glassCircle}
      scaleTo={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <BlurView intensity={glass.blur} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <Icon name={icon} size={22} color={colors.darkGreen} />
    </PressableScale>
  );
}

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();
  const { data: asset, isLoading, isError } = usePublicAsset(id!);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.heroSkeleton, { height: HERO_HEIGHT }]} />
        <View style={styles.skeletonSheet}>
          <Skeleton width="55%" height={28} />
          <Skeleton width="35%" height={16} style={{ marginTop: spacing.sm }} />
          <Skeleton height={80} radius={20} style={{ marginTop: spacing.md }} />
          <Skeleton height={80} radius={20} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    );
  }

  if (isError || !asset) {
    return (
      <View style={[styles.error, { paddingTop: insets.top }]}>
        <FadeInView from="up" style={styles.errorInner}>
          <View style={styles.errorRing}>
            <Icon
              name={isConnected ? 'search' : 'offline'}
              size={52}
              color={colors.secondary}
            />
          </View>
          <Text style={styles.errorTitle}>
            {isConnected ? 'Ativo indisponível' : 'Sem conexão'}
          </Text>
          <Text style={styles.errorText}>
            {isConnected
              ? 'Este registro não está público ou não existe mais.'
              : 'Conecte-se à internet para ver este ativo.'}
          </Text>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="back" size={18} color={colors.accentDeep} />
            <Text style={styles.backBtnText}>Voltar ao mapa</Text>
          </PressableScale>
        </FadeInView>
      </View>
    );
  }

  const typeName = asset.asset_type.name;
  const typeIcon = iconForAssetType(typeName);
  const photos = asset.media;
  const hasPhotos = photos.length > 0;
  const latest = asset.monitoramentos[0] ?? null;
  const health = latest ? HEALTH_CONFIG[latest.health_status] : null;

  const openDirections = () => {
    const coords = `${asset.latitude},${asset.longitude}`;
    const url = Platform.OS === 'ios' ? `maps:?q=${coords}` : `geo:${coords}?q=${coords}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/maps?q=${coords}`),
    );
  };

  const shareAsset = async () => {
    try {
      await Share.share({
        message:
          `${typeName} — EcoInventário\n` +
          `Código: ${asset.qr_code}\n` +
          `Local: ${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}\n` +
          `https://maps.google.com/maps?q=${asset.latitude},${asset.longitude}`,
        title: `EcoInventário — ${typeName}`,
      });
    } catch {
      // Usuário cancelou o compartilhamento — sem ação necessária
    }
  };

  return (
    <View style={styles.container}>
      {/* Header flutuante sobre o hero */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <GlassCircleButton icon="back" label="Voltar" onPress={() => router.back()} />
        <GlassCircleButton icon="share" label="Compartilhar" onPress={shareAsset} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Hero: foto de ponta a ponta, com scrim garantindo leitura do texto */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          {hasPhotos ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
              }}
              renderItem={({ item, index }) => (
                <PressableScale
                  scaleTo={0.99}
                  haptic={false}
                  onPress={() => setLightboxIndex(index)}
                  style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
                >
                  <ExpoImage
                    source={item.url}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={300}
                  />
                </PressableScale>
              )}
            />
          ) : (
            <LinearGradient colors={gradients.hero} style={StyleSheet.absoluteFill}>
              <View style={styles.noPhoto}>
                <Icon name={typeIcon} size={72} color="rgba(183,245,105,0.7)" />
                <Text style={styles.noPhotoText}>Sem fotos publicadas</Text>
              </View>
            </LinearGradient>
          )}

          <LinearGradient
            colors={gradients.heroScrim}
            locations={[0, 0.55, 1]}
            style={styles.heroScrim}
            pointerEvents="none"
          />

          {/* Identidade sobre o hero */}
          <View style={styles.heroCaption} pointerEvents="none">
            <View style={styles.typePill}>
              <Icon name={typeIcon} size={13} color={colors.accentDeep} />
              <Text style={styles.typePillText}>{typeName.toUpperCase()}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {typeName}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {asset.organization_name}
            </Text>
          </View>

          {hasPhotos && photos.length > 1 ? (
            <View style={styles.dots} pointerEvents="none">
              {photos.map((p, i) => (
                <View key={p.id} style={[styles.dot, i === activePhotoIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>

        {/* Painel de conteúdo */}
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          {/* Saúde: só aparece se existir monitoramento real */}
          {health && latest ? (
            <FadeInView delay={60} style={[styles.healthCard, { borderColor: health.tint }]}>
              <View style={[styles.healthIcon, { backgroundColor: health.tint }]}>
                <Icon name={health.icon} size={20} color={health.onTint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.healthLabel}>{health.label}</Text>
                <Text style={styles.healthMeta}>
                  Último monitoramento em {formatDate(latest.created_at)}
                </Text>
              </View>
            </FadeInView>
          ) : null}

          {/* Ficha do ativo — apenas dados que a API entrega */}
          <FadeInView delay={110} style={styles.factGrid}>
            <View style={styles.factCard}>
              <Icon name="place" size={18} color={colors.secondary} />
              <Text style={styles.factLabel}>COORDENADAS</Text>
              <Text style={styles.factValue}>{asset.latitude.toFixed(5)}</Text>
              <Text style={styles.factValue}>{asset.longitude.toFixed(5)}</Text>
            </View>
            <View style={styles.factCard}>
              <Icon name="calendar" size={18} color={colors.secondary} />
              <Text style={styles.factLabel}>CADASTRADO</Text>
              <Text style={styles.factValue}>{formatDate(asset.created_at)}</Text>
            </View>
          </FadeInView>

          <FadeInView delay={150} style={styles.qrRow}>
            <Icon name="qrCode" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.qrText} numberOfLines={1} ellipsizeMode="middle">
              {asset.qr_code}
            </Text>
          </FadeInView>

          {/* Manejos */}
          <FadeInView delay={190} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Manejos</Text>
              {asset.manejos.length > 0 ? (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{asset.manejos.length}</Text>
                </View>
              ) : null}
            </View>

            {asset.manejos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScrollContent}
              >
                {asset.manejos.map((m) => (
                  <View key={m.id} style={styles.manejoCard}>
                    {m.before_media_url ? (
                      <ExpoImage
                        source={m.before_media_url}
                        style={styles.manejoImg}
                        contentFit="cover"
                        transition={220}
                      />
                    ) : (
                      <View style={[styles.manejoImg, styles.manejoImgEmpty]}>
                        <Icon name="cut" size={24} color={colors.secondary} />
                      </View>
                    )}
                    <View style={styles.manejoMeta}>
                      <Text style={styles.manejoTitle} numberOfLines={2}>
                        {m.description}
                      </Text>
                      <Text style={styles.manejoDate}>{formatDate(m.created_at)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>Nenhum manejo registrado.</Text>
            )}
          </FadeInView>

          {/* Monitoramentos */}
          <FadeInView delay={230} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monitoramentos</Text>
              {asset.monitoramentos.length > 0 ? (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{asset.monitoramentos.length}</Text>
                </View>
              ) : null}
            </View>

            {asset.monitoramentos.length > 0 ? (
              asset.monitoramentos.map((m) => {
                const cfg = HEALTH_CONFIG[m.health_status];
                return (
                  <View key={m.id} style={styles.monitorCard}>
                    <View style={[styles.statusRail, { backgroundColor: cfg.tint }]} />
                    <View style={styles.monitorInfo}>
                      <View style={styles.monitorRow}>
                        <Text style={styles.statusLabel}>{cfg.label}</Text>
                        <Text style={styles.monitorDate}>{formatDate(m.created_at)}</Text>
                      </View>
                      {m.notes ? <Text style={styles.monitorNotes}>{m.notes}</Text> : null}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Nenhum monitoramento registrado.</Text>
            )}
          </FadeInView>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* CTA fixo */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + spacing.gutter }]}>
        <LinearGradient
          colors={['rgba(247,250,245,0)', 'rgba(247,250,245,0.95)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <PressableScale style={styles.actionBtn} scaleTo={0.97} onPress={openDirections}>
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name="directions" size={20} color={colors.accentDeep} />
          <Text style={styles.actionBtnText}>Como chegar</Text>
        </PressableScale>
      </View>

      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={photos.map((p) => ({ id: p.id, uri: p.url }))}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 0 },

  heroSkeleton: { backgroundColor: colors.surfaceContainerHigh },
  skeletonSheet: {
    flex: 1,
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.background,
    padding: spacing.marginMobile,
  },

  error: { flex: 1, backgroundColor: colors.background },
  errorInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.marginMobile,
    gap: spacing.base,
  },
  errorRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(183,245,105,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(183,245,105,0.5)',
    marginBottom: spacing.sm,
  },
  errorTitle: { ...typography.headlineMd, color: colors.primary },
  errorText: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  backBtnText: { ...typography.labelLg, color: colors.accentDeep },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: glass.bgStrong,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: glass.shadowTint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },

  hero: { width: '100%', backgroundColor: colors.surfaceContainerHigh },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noPhotoText: { ...typography.labelLg, color: 'rgba(255,255,255,0.7)' },
  heroCaption: {
    position: 'absolute',
    left: spacing.marginMobile,
    right: spacing.marginMobile,
    bottom: 56,
    gap: 4,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  typePillText: {
    ...typography.labelMd,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.accentDeep,
  },
  heroTitle: {
    ...typography.headlineLg,
    color: '#ffffff',
    marginTop: 6,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  dots: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: { width: 18, backgroundColor: colors.accent },

  sheet: {
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(68,71,72,0.2)',
    marginBottom: spacing.md,
  },

  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surfaceContainerLowest,
    marginBottom: spacing.md,
  },
  healthIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthLabel: { ...typography.labelLg, color: colors.primary },
  healthMeta: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 1 },

  factGrid: { flexDirection: 'row', gap: spacing.sm },
  factCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    gap: 2,
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  factLabel: {
    ...typography.labelMd,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.outline,
    marginTop: 4,
  },
  factValue: { ...typography.labelLg, color: colors.onBackground },

  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  qrText: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1 },

  section: { marginTop: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.headlineMd, fontSize: 18, color: colors.primary },
  countPill: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(183,245,105,0.35)',
    alignItems: 'center',
  },
  countPillText: { ...typography.labelMd, color: colors.accentDeep },
  hScrollContent: { gap: spacing.sm, paddingRight: spacing.sm },

  manejoCard: {
    width: 168,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  manejoImg: { width: '100%', height: 110, backgroundColor: colors.surfaceContainerHigh },
  manejoImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  manejoMeta: { padding: spacing.base, gap: 2 },
  manejoTitle: { ...typography.labelLg, fontSize: 13, color: colors.onBackground },
  manejoDate: { ...typography.labelSm, color: colors.outline },

  monitorCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.base,
  },
  statusRail: { width: 5 },
  monitorInfo: { flex: 1, padding: spacing.sm, gap: 2 },
  monitorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { ...typography.labelLg, color: colors.primary },
  monitorDate: { ...typography.labelSm, color: colors.outline },
  monitorNotes: { ...typography.bodyMd, fontSize: 13, color: colors.onSurfaceVariant },

  emptyText: { ...typography.bodyMd, fontSize: 14, color: colors.outline },

  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 56,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  actionBtnText: {
    ...typography.labelLg,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.accentDeep,
  },
});
