import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useCreateMonitoramento } from '@/features/assets/hooks/use-create-monitoramento';
import { useAssetDetail } from '@/features/assets/hooks/use-asset-detail';
import { SyncEngine } from '@/sync/sync-engine';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { colors, spacing, typography, radius } from '@/theme/tokens';

const HEALTH_OPTIONS = [
  { id: 'healthy', label: 'Saudável', icon: 'check-circle', color: '#304f00', bg: 'rgba(183,245,105,0.3)' },
  { id: 'warning', label: 'Atenção (Pragas/Doenças)', icon: 'warning', color: '#8a6500', bg: '#ffefa3' },
  { id: 'critical', label: 'Crítico (Risco de morte)', icon: 'error', color: colors.onErrorContainer, bg: colors.errorContainer },
  { id: 'dead', label: 'Morta/Caída', icon: 'cancel', color: colors.onSurfaceVariant, bg: colors.surfaceVariant },
] as const;

export default function CriarMonitoramentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { asset, isLoading } = useAssetDetail(id);
  const { save, isSaving } = useCreateMonitoramento();
  const { isConnected } = useNetworkStatus();

  const [notes, setNotes] = useState('');
  const [healthStatus, setHealthStatus] = useState<string>('');

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.notFound}>Asset não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSave = notes.trim().length > 0 && healthStatus !== '';

  async function handleSave() {
    try {
      await save({
        assetId: id,
        notes: notes.trim(),
        healthStatus,
      });
      if (isConnected) {
        await SyncEngine.sync({ force: true });
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar o monitoramento.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monitoramento</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.assetContextCard}>
            <MaterialIcons name="park" size={20} color={colors.secondary} />
            <Text style={styles.assetContextText} numberOfLines={1}>{asset.assetTypeName}</Text>
          </View>

          <Text style={styles.fieldLabel}>Estado Fitossanitário</Text>
          <View style={styles.healthOptions}>
            {HEALTH_OPTIONS.map((opt) => {
              const isActive = healthStatus === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.healthOption,
                    isActive && { backgroundColor: opt.bg, borderColor: opt.color }
                  ]}
                  onPress={() => setHealthStatus(opt.id)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={opt.icon as any}
                    size={20}
                    color={isActive ? opt.color : colors.outline}
                  />
                  <Text style={[styles.healthOptionText, isActive && { color: opt.color, fontFamily: typography.labelLg.fontFamily }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Notas da Avaliação</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Descreva a condição da planta, pragas encontradas, biometria..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={5}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{notes.length}/2000</Text>

          {!isConnected && (
            <View style={styles.offlineNotice}>
              <MaterialIcons name="cloud-off" size={16} color={colors.secondary} />
              <Text style={styles.offlineNoticeText}>
                Este monitoramento será salvo offline e sincronizado automaticamente.
              </Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!canSave || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave || isSaving}
            activeOpacity={0.85}
          >
            {isSaving
              ? <ActivityIndicator color={colors.onPrimary} size="small" />
              : <MaterialIcons name="save" size={18} color={colors.onPrimary} />}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceContainerLow },
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
  headerTitle: { ...typography.headlineMd, color: colors.onBackground, fontSize: 18 },
  notFound: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  content: { paddingHorizontal: spacing.marginMobile, paddingTop: spacing.sm },

  assetContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: radius.default,
    marginBottom: spacing.md,
    shadowColor: '#2d3a2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  assetContextText: { ...typography.labelLg, color: colors.onBackground, flex: 1 },

  fieldLabel: { ...typography.labelLg, color: colors.onBackground, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.default,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.onBackground,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  charCount: { ...typography.labelSm, color: colors.outline, textAlign: 'right', marginTop: 4 },

  healthOptions: {
    gap: spacing.sm,
  },
  healthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.default,
  },
  healthOptionText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },

  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondaryContainer,
    padding: spacing.md,
    borderRadius: radius.default,
    marginTop: spacing.md,
  },
  offlineNoticeText: { ...typography.bodyMd, color: colors.onSecondaryContainer, flex: 1 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.marginMobile,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 18,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 16 },
});
