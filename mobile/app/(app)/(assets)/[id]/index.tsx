import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import QRCode from 'qrcode';

import { LinearGradient } from 'expo-linear-gradient';

import { PressableScale } from '@/components/ui/pressable-scale';
import { PhotoLightbox } from '@/components/ui/photo-lightbox';
import { GradientBackground } from '@/components/ui/gradient-background';
import { FadeInView } from '@/components/ui/fade-in-view';
import { Skeleton } from '@/components/ui/skeleton';

import { useAssetDetail } from '@/features/assets/hooks/use-asset-detail';
import { useSubmitAsset } from '@/features/assets/hooks/use-submit-asset';
import { SyncEngine } from '@/sync/sync-engine';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, typography, radius, gradients } from '@/theme/tokens';
import type { Asset } from '@/types/domain';
import { Icon, type IconName } from '@/components/ui/icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_WIDTH - spacing.marginMobile * 2 - spacing.md * 2, 200);

const STATUS_LABELS: Record<Asset['status'], string> = {
  draft: 'Rascunho',
  pending: 'Aguardando aprovação',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLORS: Record<Asset['status'], { bg: string; text: string }> = {
  draft: { bg: colors.surfaceVariant, text: colors.onSurfaceVariant },
  pending: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer },
  approved: { bg: 'rgba(183,245,105,0.3)', text: '#304f00' },
  rejected: { bg: colors.errorContainer, text: colors.onErrorContainer },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ icon, label, value }: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color={colors.secondary} style={styles.infoIcon} />
      <View style={styles.infoTexts}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// Componente 100% offline nativo sem dependências de Canvas ou SVG
function OfflineQRCode({ value, size }: { value: string, size: number }) {
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    const cellSize = size / modules.size;
    
    const rows = [];
    for (let r = 0; r < modules.size; r++) {
      const row = [];
      for (let c = 0; c < modules.size; c++) {
        const isDark = modules.data[r * modules.size + c];
        row.push(
          <View
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: isDark ? colors.primary : 'transparent',
            }}
          />
        );
      }
      rows.push(<View key={r} style={{ flexDirection: 'row' }}>{row}</View>);
    }
    
    return <View style={{ width: size, height: size }}>{rows}</View>;
  } catch (e) {
    return <View style={{ width: size, height: size, backgroundColor: colors.surfaceVariant }} />;
  }
}

/** Esqueleto do detalhe: espelha o layout real para evitar salto ao carregar. */
function DetailSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <Skeleton width={140} height={32} radius={radius.full} />
      <Skeleton height={200} radius={24} style={{ marginTop: spacing.md }} />
      <Skeleton height={180} radius={24} style={{ marginTop: spacing.md }} />
      <Skeleton height={120} radius={24} style={{ marginTop: spacing.md }} />
    </View>
  );
}

export default function AssetDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { asset, media, isLoading, refresh } = useAssetDetail(id);
  const { submit, isSubmitting } = useSubmitAsset();
  const user = useAuthStore((s) => s.user);
  const submitFlowRef = useRef(false);
  const [isSubmitFlow, setIsSubmitFlow] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="back" size={20} color={colors.onBackground} />
            </PressableScale>
            <Text style={styles.headerTitle}>Carregando...</Text>
            <View style={{ width: 44 }} />
          </View>
          <DetailSkeleton />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!asset) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="back" size={20} color={colors.onBackground} />
            </PressableScale>
            <Text style={styles.headerTitle}>Detalhes</Text>
            <View style={{ width: 44 }} />
          </View>
          <FadeInView from="up" style={styles.notFoundWrap}>
            <View style={styles.notFoundRing}>
              <Icon name="error" size={56} color={colors.outline} />
            </View>
            <Text style={styles.notFound}>Asset não encontrado</Text>
          </FadeInView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const safeAsset = asset;
  const statusColor = STATUS_COLORS[safeAsset.status];
  const isOwner = safeAsset.createdBy === user?.id;
  const canEdit = isOwner && (safeAsset.status === 'draft' || safeAsset.status === 'rejected');
  const canSubmit = isOwner && safeAsset.status === 'draft';

  async function handleSubmit() {
    if (submitFlowRef.current) return;
    Alert.alert(
      'Enviar para aprovação',
      'O asset será enviado para revisão. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            if (submitFlowRef.current) return;
            submitFlowRef.current = true;
            setIsSubmitFlow(true);
            try {
              await submit(safeAsset.id, safeAsset.version, safeAsset.updatedAt);
              const result = await SyncEngine.sync({ force: true });
              await refresh();
              if (result.state === 'offline') {
                Alert.alert('Envio pendente', 'Sem conexão agora. O asset ficou na fila para enviar à revisão.');
                return;
              }
              if (result.state === 'error' || result.pendingMetadataCount > 0 || result.pendingMediaCount > 0) {
                Alert.alert('Envio pendente', result.message ?? 'O asset foi salvo, mas ainda aguarda confirmação do servidor.');
                return;
              }
              Alert.alert('Enviado', 'O asset foi enviado ao admin para revisão.');
            } catch {
              Alert.alert('Erro', 'Não foi possível enviar. Tente novamente.');
            } finally {
              submitFlowRef.current = false;
              setIsSubmitFlow(false);
            }
          },
        },
      ],
    );
  }

  async function handleShareQR() {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(safeAsset.qrCode)}`;
      await Share.share({
        message: `Ativo: ${safeAsset.assetTypeName}\nCódigo de Identificação: ${safeAsset.qrCode}\n\nImagem do QR Code para impressão ou leitura:\n${qrUrl}`,
        title: `EcoInventário — ${safeAsset.assetTypeName}`,
      });
    } catch {
      // Usuário cancelou o compartilhamento — sem ação necessária
    }
  }

  const photosToShow = media;
  const lightboxPhotos = photosToShow.map((m) => ({ id: m.id, uri: m.localFilePath }));

  return (
    <GradientBackground>
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <FadeInView from="up" style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="back" size={20} color={colors.onBackground} />
        </PressableScale>
        <Text style={styles.headerTitle} numberOfLines={1}>{safeAsset.assetTypeName}</Text>
        {canEdit ? (
          <PressableScale
            onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/edit`)}
            style={styles.editBtn}
          >
            <Icon name="edit" size={20} color={colors.secondary} />
          </PressableScale>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </FadeInView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status + sync row */}
        <FadeInView delay={SECTION_DELAY.status} style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[safeAsset.status]}
            </Text>
          </View>
          {!safeAsset.isSynced && (
            <View style={styles.unsyncedBadge}>
              <Icon name="cloudOff" size={14} color={colors.outline} />
              <Text style={styles.unsyncedText}>Não sincronizado</Text>
            </View>
          )}
        </FadeInView>

        {/* Motivo da rejeição */}
        {safeAsset.status === 'rejected' && safeAsset.rejectionReason && (
          <FadeInView delay={SECTION_DELAY.status} style={styles.rejectionCard}>
            <Icon name="cancel" size={18} color={colors.onErrorContainer} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Motivo da rejeição</Text>
              <Text style={styles.rejectionReason}>{safeAsset.rejectionReason}</Text>
            </View>
          </FadeInView>
        )}

        {/* Galeria de fotos — subiu para logo abaixo do status: é a evidência
            de campo mais consultada, então merece o topo da hierarquia. */}
        {photosToShow.length > 0 && (
          <FadeInView delay={SECTION_DELAY.gallery} style={styles.gallerySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Fotos</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{photosToShow.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
              contentContainerStyle={styles.galleryContent}
              snapToInterval={GALLERY_PHOTO_SIZE + spacing.sm}
              decelerationRate="fast"
            >
              {photosToShow.map((m, i) => (
                <PressableScale
                  key={m.id}
                  onPress={() => setLightboxIndex(i)}
                  style={styles.galleryItem}
                  scaleTo={0.95}
                >
                  <ExpoImage
                    source={m.localFilePath}
                    style={styles.galleryPhoto}
                    contentFit="cover"
                    transition={250}
                  />
                  <LinearGradient
                    colors={gradients.photoScrim}
                    style={styles.galleryScrim}
                    pointerEvents="none"
                  />
                  <View style={styles.galleryExpandBadge}>
                    <Icon name="expand" size={16} color="#fff" />
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </FadeInView>
        )}

        {/* Mapa com sombra e borda limpa */}
        <FadeInView delay={SECTION_DELAY.map} style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: safeAsset.latitude,
              longitude: safeAsset.longitude,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
          >
            <Marker coordinate={{ latitude: safeAsset.latitude, longitude: safeAsset.longitude }} />
          </MapView>
        </FadeInView>

        {/* Card de informações - Design Limpo e Sólido */}
        <FadeInView delay={SECTION_DELAY.info} style={styles.infoCard}>
          <InfoRow icon="place" label="Coordenadas" value={`${safeAsset.latitude.toFixed(5)}, ${safeAsset.longitude.toFixed(5)}`} />
          {safeAsset.gpsAccuracyM !== null && (
            <InfoRow icon="radar" label="Precisão GPS" value={`${safeAsset.gpsAccuracyM.toFixed(0)}m`} />
          )}
          <InfoRow icon="calendar" label="Criado em" value={formatDateTime(safeAsset.createdAt)} />
          {safeAsset.status === 'approved' && safeAsset.approvedBy && (
            <InfoRow icon="verified" label="Aprovado por" value={safeAsset.approvedBy} />
          )}
        </FadeInView>

        {/* QR Code — Card Premium, Fundo Branco e Sombreamento Suave */}
        <FadeInView delay={SECTION_DELAY.qr} style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <Icon name="qrCode" size={18} color={colors.secondary} />
            <Text style={styles.qrTitle}>QR Code</Text>
          </View>
          <View style={styles.qrWrapper}>
            <View style={styles.qrFrame}>
              <OfflineQRCode value={safeAsset.qrCode} size={QR_SIZE} />
            </View>
          </View>
          <Text style={styles.qrCodeText} numberOfLines={1} ellipsizeMode="middle">
            {safeAsset.qrCode}
          </Text>
          {/* Botão de compartilhar */}
          <PressableScale style={styles.qrShareBtn} onPress={handleShareQR}>
            <Icon name="share" size={16} color={colors.onSecondaryContainer} />
            <Text style={styles.qrShareText}>Compartilhar QR Code</Text>
          </PressableScale>
        </FadeInView>

        {/* Notas */}
        {safeAsset.notes && (
          <FadeInView delay={SECTION_DELAY.notes} style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notesText}>{safeAsset.notes}</Text>
          </FadeInView>
        )}

        {/* Ações rápidas circulares perfeitamente alinhadas */}
        <FadeInView delay={SECTION_DELAY.actions} style={styles.quickActionsRow}>
          <PressableScale
            style={styles.quickActionBtn}
            scaleTo={0.94}
            onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/manejo`)}
          >
            <View style={styles.quickActionCircle}>
              <Icon name="cut" size={28} color={colors.secondary} style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.quickActionLabel}>Manejo</Text>
          </PressableScale>

          <PressableScale
            style={styles.quickActionBtn}
            scaleTo={0.94}
            onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/monitoramento`)}
          >
            <View style={styles.quickActionCircle}>
              <Icon name="visibility" size={28} color={colors.secondary} />
            </View>
            <Text style={styles.quickActionLabel}>Monitorar</Text>
          </PressableScale>
        </FadeInView>

        {/* Painel de ações — Sem fundo transparente bugado, estilo Stitch Flat */}
        <FadeInView delay={SECTION_DELAY.actions} style={styles.actionsPanel}>
          <View style={styles.secondaryActionsRow}>
            {canEdit && (
              <PressableScale
                style={styles.secondaryActionBtn}
                onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/edit`)}
              >
                <Icon name="edit" size={18} color={colors.secondary} />
                <Text style={styles.secondaryActionText}>Editar Dados</Text>
              </PressableScale>
            )}
            {/* TODO: Histórico ainda não tem tela — desabilitado para não
                entregar um botão que não faz nada ao ser tocado. */}
            <View style={[styles.secondaryActionBtn, styles.buttonDisabled]}>
              <Icon name="history" size={18} color={colors.outline} />
              <Text style={[styles.secondaryActionText, { color: colors.outline }]}>Histórico em breve</Text>
            </View>
          </View>

          {canSubmit && (
            <PressableScale
              style={[styles.submitButton, (isSubmitting || isSubmitFlow) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || isSubmitFlow}
              scaleTo={0.96}
            >
              <LinearGradient
                colors={gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {isSubmitting || isSubmitFlow
                ? <ActivityIndicator color={colors.accentDeep} size="small" />
                : <Icon name="send" size={20} color={colors.accentDeep} />}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Enviando...' : 'Enviar para aprovação'}
              </Text>
            </PressableScale>
          )}
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={lightboxPhotos}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </SafeAreaView>
    </GradientBackground>
  );
}

/** Stagger das seções na entrada da tela (ms). */
const SECTION_DELAY = {
  status: 60,
  gallery: 120,
  map: 180,
  info: 240,
  qr: 300,
  notes: 340,
  actions: 380,
} as const;

const GALLERY_PHOTO_SIZE = 200;

const styles = StyleSheet.create({
  // Fundo vem do GradientBackground — o safe area fica transparente.
  safe: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 40 },

  skeletonWrap: { paddingHorizontal: spacing.marginMobile, paddingTop: spacing.sm },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  notFoundRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.gutter,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  headerTitle: {
    ...typography.headlineMd,
    color: colors.onBackground,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
    fontSize: 18,
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  notFound: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.sm },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.marginMobile,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusText: { ...typography.labelLg },
  unsyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
  },
  unsyncedText: { ...typography.labelSm, color: colors.outline },

  rejectionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.marginMobile,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.default,
  },
  rejectionTitle: { ...typography.labelLg, color: colors.onErrorContainer },
  rejectionReason: { ...typography.bodyMd, color: colors.onErrorContainer, marginTop: 2 },

  mapContainer: {
    height: 200,
    marginHorizontal: spacing.marginMobile,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  map: { flex: 1 },

  infoCard: {
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.marginMobile,
    borderRadius: 24,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  infoIcon: { marginRight: spacing.sm, width: 24 },
  infoTexts: { flex: 1 },
  infoLabel: { ...typography.labelSm, color: colors.outline },
  infoValue: { ...typography.bodyMd, color: colors.onBackground, marginTop: 2 },

  qrCard: {
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.marginMobile,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  qrTitle: { ...typography.labelLg, color: colors.secondary },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  qrFrame: {
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeText: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: spacing.xs,
    maxWidth: QR_SIZE + spacing.md * 2,
    textAlign: 'center',
  },
  qrShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer,
  },
  qrShareText: { ...typography.labelLg, color: colors.onSecondaryContainer },

  notesCard: {
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.marginMobile,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  sectionTitle: { ...typography.headlineMd, color: colors.primary, marginBottom: spacing.sm, fontSize: 18 },
  notesText: { ...typography.bodyMd, color: colors.onBackground },

  gallerySection: { marginBottom: spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.marginMobile,
  },
  countPill: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(183,245,105,0.35)',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  countPillText: { ...typography.labelMd, color: colors.accentDeep },
  gallery: { paddingLeft: spacing.marginMobile },
  galleryContent: { paddingRight: spacing.marginMobile },
  galleryItem: {
    marginRight: spacing.sm,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  galleryPhoto: {
    width: GALLERY_PHOTO_SIZE,
    height: GALLERY_PHOTO_SIZE,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
  },
  // Scrim inferior: dá peso à foto e garante contraste do badge de zoom.
  galleryScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
  },
  galleryExpandBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,32,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.marginMobile,
    marginBottom: spacing.sm,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: spacing.sm,
    width: 90,
  },
  quickActionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(183,245,105,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  quickActionLabel: { ...typography.labelLg, color: colors.onSurface, textAlign: 'center' },

  actionsPanel: {
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.marginMobile,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceContainerLow,
  },
  secondaryActionText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  
  // CTA primário em neon: mesma linguagem do FAB da lista (ação que avança estado).
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 18,
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
  submitButtonText: {
    ...typography.labelLg,
    color: colors.accentDeep,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  buttonDisabled: { opacity: 0.4 },
});
