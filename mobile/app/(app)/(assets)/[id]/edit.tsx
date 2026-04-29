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
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAssetDetail } from '@/features/assets/hooks/use-asset-detail';
import { useUpdateAsset } from '@/features/assets/hooks/use-update-asset';
import { useAuthStore } from '@/stores/auth-store';
import { getAssetTypes } from '@/features/assets/repository';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import type { AssetType } from '@/types/domain';

export default function EditarAssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { asset, isLoading } = useAssetDetail(id);
  const { update, isSaving } = useUpdateAsset();
  const user = useAuthStore((s) => s.user);

  const [assetTypeId, setAssetTypeId] = useState('');
  const [assetTypeName, setAssetTypeName] = useState('');
  const [notes, setNotes] = useState('');
  const [types, setTypes] = useState<AssetType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getAssetTypes()
      .then(setTypes)
      .catch(() => setTypes([]))
      .finally(() => setTypesLoading(false));
  }, []);

  useEffect(() => {
    if (asset && !initialized) {
      setAssetTypeId(asset.assetTypeId);
      setAssetTypeName(asset.assetTypeName);
      setNotes(asset.notes ?? '');
      setInitialized(true);
    }
  }, [asset, initialized]);

  if (isLoading || !initialized) {
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

  const isOwner = asset.createdBy === user?.id;
  const canEdit = isOwner && (asset.status === 'draft' || asset.status === 'rejected');

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Asset</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.marginMobile }}>
          <MaterialIcons name="lock" size={64} color={colors.outlineVariant} />
          <Text style={styles.lockedText}>
            Edição disponível apenas para assets com status "Rascunho" ou "Rejeitado" do próprio usuário.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleSave() {
    try {
      await update(id, {
        assetTypeId,
        assetTypeName,
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações. Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Asset</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status warning for rejected */}
          {asset.status === 'rejected' && asset.rejectionReason && (
            <View style={styles.rejectionBanner}>
              <MaterialIcons name="info" size={16} color={colors.onErrorContainer} />
              <Text style={styles.rejectionText}>{asset.rejectionReason}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Tipo de Ativo</Text>
          {typesLoading ? (
            <ActivityIndicator color={colors.secondary} />
          ) : (
            <View style={styles.typeList}>
              {types.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, assetTypeId === t.id && styles.typeChipActive]}
                  onPress={() => { setAssetTypeId(t.id); setAssetTypeName(t.name); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeChipText, assetTypeId === t.id && styles.typeChipTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {types.length === 0 && (
                <Text style={styles.emptyTypes}>Nenhum tipo disponível.</Text>
              )}
            </View>
          )}

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Notas (opcional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações sobre o ativo..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={5}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{notes.length}/2000</Text>

          {/* Read-only GPS info */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Localização GPS</Text>
          <View style={styles.gpsReadOnly}>
            <MaterialIcons name="location-on" size={20} color={colors.secondary} />
            <Text style={styles.gpsText}>
              {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
            </Text>
          </View>
          <Text style={styles.gpsHint}>
            Para alterar o GPS, crie um novo asset na nova localização.
          </Text>

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (isSaving || !assetTypeId) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || !assetTypeId}
            activeOpacity={0.85}
          >
            {isSaving
              ? <ActivityIndicator color={colors.onPrimary} size="small" />
              : <MaterialIcons name="save" size={18} color={colors.onPrimary} />}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const GLASS = {
  backgroundColor: 'rgba(255,255,255,0.4)',
  borderColor: 'rgba(255,255,255,0.6)',
  borderWidth: 1,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.gutter,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.headlineMd, color: colors.onBackground },
  notFound: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  lockedText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  content: { paddingHorizontal: spacing.marginMobile },

  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.default,
    marginBottom: spacing.md,
  },
  rejectionText: { ...typography.bodyMd, color: colors.onErrorContainer, flex: 1 },

  fieldLabel: { ...typography.labelLg, color: colors.onBackground, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surfaceContainerLow,
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

  typeList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  typeChipTextActive: { color: colors.onPrimary },
  emptyTypes: { ...typography.bodyMd, color: colors.outline },

  gpsReadOnly: {
    ...GLASS,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.default,
  },
  gpsText: { ...typography.bodyMd, color: colors.onBackground },
  gpsHint: { ...typography.labelSm, color: colors.outline, marginTop: spacing.xs },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 16,
    borderRadius: 9999,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { ...typography.labelLg, color: colors.onPrimary },
});
