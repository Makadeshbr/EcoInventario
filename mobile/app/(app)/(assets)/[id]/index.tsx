import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import QRCode from 'qrcode';

import { useAssetDetail } from '@/features/assets/hooks/use-asset-detail';
import { useSubmitAsset } from '@/features/assets/hooks/use-submit-asset';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import type { Asset } from '@/types/domain';

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
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={20} color={colors.secondary} style={styles.infoIcon} />
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

export default function AssetDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { asset, media, isLoading, refresh } = useAssetDetail(id);
  const { submit, isSubmitting } = useSubmitAsset();
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="error-outline" size={64} color={colors.outlineVariant} />
          <Text style={styles.notFound}>Asset não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const safeAsset = asset;
  const statusColor = STATUS_COLORS[safeAsset.status];
  const isOwner = safeAsset.createdBy === user?.id;
  const canEdit = isOwner && (safeAsset.status === 'draft' || safeAsset.status === 'rejected');
  const canSubmit = isOwner && safeAsset.status === 'draft';

  async function handleSubmit() {
    Alert.alert(
      'Enviar para aprovação',
      'O asset será enviado para revisão. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              await submit(safeAsset.id, safeAsset.version, safeAsset.updatedAt);
              await refresh();
            } catch {
              Alert.alert('Erro', 'Não foi possível enviar. Tente novamente.');
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{safeAsset.assetTypeName}</Text>
        {canEdit ? (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/edit`)}
            style={styles.editBtn}
          >
            <MaterialIcons name="edit" size={20} color={colors.secondary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status + sync row */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {STATUS_LABELS[safeAsset.status]}
            </Text>
          </View>
          {!safeAsset.isSynced && (
            <View style={styles.unsyncedBadge}>
              <MaterialIcons name="cloud-off" size={14} color={colors.outline} />
              <Text style={styles.unsyncedText}>Não sincronizado</Text>
            </View>
          )}
        </View>

        {/* Motivo da rejeição */}
        {safeAsset.status === 'rejected' && safeAsset.rejectionReason && (
          <View style={styles.rejectionCard}>
            <MaterialIcons name="cancel" size={18} color={colors.onErrorContainer} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Motivo da rejeição</Text>
              <Text style={styles.rejectionReason}>{safeAsset.rejectionReason}</Text>
            </View>
          </View>
        )}

        {/* Mapa com sombra e borda limpa */}
        <View style={styles.mapContainer}>
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
        </View>

        {/* Card de informações - Design Limpo e Sólido */}
        <View style={styles.infoCard}>
          <InfoRow icon="location-on" label="Coordenadas" value={`${safeAsset.latitude.toFixed(5)}, ${safeAsset.longitude.toFixed(5)}`} />
          {safeAsset.gpsAccuracyM !== null && (
            <InfoRow icon="radar" label="Precisão GPS" value={`${safeAsset.gpsAccuracyM.toFixed(0)}m`} />
          )}
          <InfoRow icon="event" label="Criado em" value={formatDateTime(safeAsset.createdAt)} />
          {safeAsset.status === 'approved' && safeAsset.approvedBy && (
            <InfoRow icon="verified" label="Aprovado por" value={safeAsset.approvedBy} />
          )}
        </View>

        {/* QR Code — Card Premium, Fundo Branco e Sombreamento Suave */}
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <MaterialIcons name="qr-code" size={18} color={colors.secondary} />
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
          <TouchableOpacity style={styles.qrShareBtn} onPress={handleShareQR} activeOpacity={0.8}>
            <MaterialIcons name="share" size={16} color={colors.onSecondaryContainer} />
            <Text style={styles.qrShareText}>Compartilhar QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Notas */}
        {safeAsset.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notesText}>{safeAsset.notes}</Text>
          </View>
        )}

        {/* Galeria de fotos */}
        {photosToShow.length > 0 && (
          <View style={styles.gallerySection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.marginMobile }]}>
              Fotos ({photosToShow.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
              {photosToShow.map((m) => (
                <Image key={m.id} source={{ uri: m.localFilePath }} style={styles.galleryPhoto} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Ações rápidas circulares perfeitamente alinhadas */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/manejo`)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="content-cut" size={28} color={colors.onBackground} style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.quickActionLabel}>Manejo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/monitoramento`)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="visibility" size={28} color={colors.onBackground} />
            </View>
            <Text style={styles.quickActionLabel}>Monitorar</Text>
          </TouchableOpacity>
        </View>

        {/* Painel de ações — Sem fundo transparente bugado, estilo Stitch Flat */}
        <View style={styles.actionsPanel}>
          <View style={styles.secondaryActionsRow}>
            {canEdit && (
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => router.push(`/(app)/(assets)/${safeAsset.id}/edit`)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={colors.secondary} />
                <Text style={styles.secondaryActionText}>Editar Dados</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <MaterialIcons name="history" size={18} color={colors.outline} />
              <Text style={[styles.secondaryActionText, { color: colors.outline }]}>Ver Histórico</Text>
            </TouchableOpacity>
          </View>

          {canSubmit && (
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting
                ? <ActivityIndicator color={colors.onPrimary} size="small" />
                : <MaterialIcons name="send" size={20} color={colors.onPrimary} />}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Enviando...' : 'Enviar para aprovação'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Fundo principal um pouco mais rico para destacar os cards brancos
  safe: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  scrollContent: { paddingBottom: 40 },

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
  gallery: { paddingLeft: spacing.marginMobile },
  galleryPhoto: {
    width: 160,
    height: 160,
    borderRadius: 16,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
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
  
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 18,
    borderRadius: radius.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 16 },
  buttonDisabled: { opacity: 0.4 },
});
