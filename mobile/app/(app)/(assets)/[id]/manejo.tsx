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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCreateManejo } from '@/features/assets/hooks/use-create-manejo';
import { useAssetDetail } from '@/features/assets/hooks/use-asset-detail';
import { SyncEngine } from '@/sync/sync-engine';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { colors, spacing, typography, radius } from '@/theme/tokens';

export default function CriarManejoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { asset, isLoading } = useAssetDetail(id);
  const { save, isSaving } = useCreateManejo();
  const { isConnected } = useNetworkStatus();

  const [description, setDescription] = useState('');
  const [beforePhotoUri, setBeforePhotoUri] = useState<string>();
  const [afterPhotoUri, setAfterPhotoUri] = useState<string>();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [activeCamera, setActiveCamera] = useState<'before' | 'after' | null>(null);
  const [taking, setTaking] = useState(false);

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

  async function takePhoto() {
    if (!cameraRef.current || taking || !activeCamera) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        if (activeCamera === 'before') setBeforePhotoUri(photo.uri);
        if (activeCamera === 'after') setAfterPhotoUri(photo.uri);
        setActiveCamera(null);
      }
    } finally {
      setTaking(false);
    }
  }

  function openCamera(type: 'before' | 'after') {
    if (!permission?.granted) {
      requestPermission();
      return;
    }
    setActiveCamera(type);
  }

  async function handleSave() {
    try {
      await save({
        assetId: id,
        description: description.trim(),
        beforePhotoUri,
        afterPhotoUri,
      });
      if (isConnected) {
        await SyncEngine.sync({ force: true });
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar o manejo.');
    }
  }

  if (activeCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraBar}>
          <TouchableOpacity onPress={() => setActiveCamera(null)} style={styles.cameraCancel}>
            <MaterialIcons name="close" size={28} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={takePhoto} style={styles.shutterButton} disabled={taking}>
            {taking
              ? <ActivityIndicator color={colors.primary} />
              : <View style={styles.shutterInner} />}
          </TouchableOpacity>
          <View style={{ width: 48 }} />
        </View>
      </View>
    );
  }

  const canSave = description.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Manejo</Text>
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

          <Text style={styles.fieldLabel}>Descrição do Manejo</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o que foi feito (ex: Poda de condução, adubação...)"
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={5}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{description.length}/2000</Text>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Evidências Fotográficas</Text>
          <View style={styles.photoSection}>
            <View style={styles.photoBox}>
              <Text style={styles.photoBoxTitle}>Antes</Text>
              {beforePhotoUri ? (
                <View style={styles.photoThumb}>
                  <Image source={{ uri: beforePhotoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setBeforePhotoUri(undefined)}>
                    <MaterialIcons name="close" size={14} color={colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={() => openCamera('before')}>
                  <MaterialIcons name="add-a-photo" size={24} color={colors.outline} />
                  <Text style={styles.addPhotoText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.photoBox}>
              <Text style={styles.photoBoxTitle}>Depois</Text>
              {afterPhotoUri ? (
                <View style={styles.photoThumb}>
                  <Image source={{ uri: afterPhotoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setAfterPhotoUri(undefined)}>
                    <MaterialIcons name="close" size={14} color={colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={() => openCamera('after')}>
                  <MaterialIcons name="add-a-photo" size={24} color={colors.outline} />
                  <Text style={styles.addPhotoText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!isConnected && (
            <View style={styles.offlineNotice}>
              <MaterialIcons name="cloud-off" size={16} color={colors.secondary} />
              <Text style={styles.offlineNoticeText}>
                Este manejo será salvo offline e sincronizado automaticamente.
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
              {isSaving ? 'Salvando...' : 'Salvar Manejo'}
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

  photoSection: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  photoBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderRadius: radius.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  photoBoxTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.sm },
  addPhotoBtn: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outline,
    gap: 4,
  },
  addPhotoText: { ...typography.labelSm, color: colors.outline },
  photoThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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

  cameraBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraCancel: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
