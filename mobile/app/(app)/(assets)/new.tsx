import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { getAssetTypes } from '@/features/assets/repository';
import { useSaveAsset } from '@/features/assets/hooks/use-save-asset';
import { SyncEngine } from '@/sync/sync-engine';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { colors, spacing, radius, typography } from '@/theme/tokens';
import type { AssetType } from '@/types/domain';
import { GPS_ACCURACY_THRESHOLD_M } from '@/constants/config';

type Step = 1 | 2 | 3 | 4;

interface WizardState {
  assetTypeId: string;
  assetTypeName: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyM: number | null;
  photoUris: string[];
}

const INITIAL: WizardState = {
  assetTypeId: '',
  assetTypeName: '',
  notes: '',
  latitude: null,
  longitude: null,
  gpsAccuracyM: null,
  photoUris: [],
};

const STEP_TITLES = ['Tipo e Notas', 'Localização', 'Fotos', 'Revisão'];

// ─── Step 1: Tipo + Notas ──────────────────────────────────────────────────

function Step1({ state, onChange, onNext }: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssetTypes()
      .then(setTypes)
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, []);

  const canAdvance = state.assetTypeId !== '';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Tipo de Ativo</Text>
        {loading ? (
          <ActivityIndicator color={colors.secondary} />
        ) : types.length === 0 ? (
          <View style={styles.emptyTypes}>
            <MaterialIcons name="warning" size={24} color={colors.outline} />
            <Text style={styles.emptyTypesText}>
              Nenhum tipo disponível. Sincronize quando online.
            </Text>
          </View>
        ) : (
          <View style={styles.typeList}>
            {types.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, state.assetTypeId === t.id && styles.typeChipActive]}
                onPress={() => onChange({ assetTypeId: t.id, assetTypeName: t.name })}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.typeChipText, state.assetTypeId === t.id && styles.typeChipTextActive]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Notas (opcional)</Text>
        <TextInput
          style={styles.textArea}
          value={state.notes}
          onChangeText={(v) => onChange({ notes: v })}
          placeholder="Observações sobre o ativo..."
          placeholderTextColor={colors.outline}
          multiline
          numberOfLines={4}
          maxLength={2000}
        />
        <Text style={styles.charCount}>{state.notes.length}/2000</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, !canAdvance && styles.primaryButtonDisabled]}
          onPress={onNext}
          disabled={!canAdvance}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Próximo</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: GPS + Mapa ───────────────────────────────────────────────────

function PingRipple() {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 2, duration: 1400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.ripple,
        { transform: [{ scale }], opacity },
      ]}
      pointerEvents="none"
    />
  );
}

function Step2({ state, onChange, onNext }: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const [capturing, setCapturing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const hasCoords = state.latitude !== null && state.longitude !== null;

  const captureGPS = useCallback(async () => {
    setCapturing(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permissão negada. Informe as coordenadas manualmente.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onChange({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        gpsAccuracyM: loc.coords.accuracy,
      });
    } catch {
      try {
        const cached = await Location.getLastKnownPositionAsync();
        if (cached) {
          onChange({
            latitude: cached.coords.latitude,
            longitude: cached.coords.longitude,
            gpsAccuracyM: cached.coords.accuracy,
          });
          setLocationError('Usando a última localização conhecida do aparelho.');
          return;
        }
      } catch {
        // Mantém o fluxo offline: o usuário ainda pode informar coordenadas manualmente.
      }
      setLocationError('Não foi possível obter GPS agora. Informe as coordenadas manualmente.');
    } finally {
      setCapturing(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!hasCoords) captureGPS();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const region: Region | undefined = hasCoords
    ? {
        latitude: state.latitude!,
        longitude: state.longitude!,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }
    : undefined;

  const isAccurate = state.gpsAccuracyM !== null && state.gpsAccuracyM <= GPS_ACCURACY_THRESHOLD_M;

  function applyManualLocation() {
    const lat = Number(manualLatitude.replace(',', '.'));
    const lng = Number(manualLongitude.replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Coordenadas inválidas', 'Informe latitude entre -90 e 90 e longitude entre -180 e 180.');
      return;
    }
    onChange({ latitude: lat, longitude: lng, gpsAccuracyM: null });
    setLocationError(null);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Circular map */}
      <View style={styles.mapWrapper}>
        <View style={styles.mapCircle}>
          {hasCoords ? (
            <MapView style={StyleSheet.absoluteFillObject} region={region} scrollEnabled={false}>
              <Marker
                coordinate={{ latitude: state.latitude!, longitude: state.longitude! }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.mapPinWrapper}>
                  <PingRipple />
                  <View style={styles.mapPin}>
                    <MaterialIcons name="location-on" size={24} color='#304f00' />
                  </View>
                </View>
              </Marker>
            </MapView>
          ) : (
            <ActivityIndicator color={colors.secondary} size="large" />
          )}
        </View>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <MaterialIcons name="my-location" size={20} color={colors.onSecondaryContainer} />
          </View>
          <View>
            <Text style={styles.infoLabel}>Coordenadas</Text>
            {hasCoords ? (
              <Text style={styles.infoValue}>
                {state.latitude!.toFixed(5)}, {state.longitude!.toFixed(5)}
              </Text>
            ) : (
              <Text style={styles.infoValueMuted}>Capturando...</Text>
            )}
          </View>
        </View>
        <View style={[styles.infoRow, styles.infoRowBorderless]}>
          <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
            <MaterialIcons name="radar" size={20} color={colors.outline} />
          </View>
          <View>
            <Text style={styles.infoLabel}>Precisão</Text>
            {state.gpsAccuracyM !== null ? (
              <Text style={[styles.infoValue, !isAccurate && { color: '#e65100' }]}>
                {state.gpsAccuracyM.toFixed(0)}m
                {!isAccurate && ' (baixa precisão)'}
              </Text>
            ) : (
              <Text style={styles.infoValueMuted}>—</Text>
            )}
          </View>
        </View>
      </View>

      {locationError && (
        <View style={styles.manualLocationCard}>
          <Text style={styles.manualLocationText}>{locationError}</Text>
          <View style={styles.manualLocationRow}>
            <TextInput
              style={styles.coordInput}
              value={manualLatitude}
              onChangeText={setManualLatitude}
              placeholder="Latitude"
              placeholderTextColor={colors.outline}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={styles.coordInput}
              value={manualLongitude}
              onChangeText={setManualLongitude}
              placeholder="Longitude"
              placeholderTextColor={colors.outline}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={applyManualLocation}>
            <MaterialIcons name="edit-location" size={18} color={colors.secondary} />
            <Text style={styles.secondaryButtonText}>Usar coordenadas</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={captureGPS}
          disabled={capturing}
          activeOpacity={0.8}
        >
          {capturing
            ? <ActivityIndicator color={colors.secondary} size="small" />
            : <MaterialIcons name="gps-fixed" size={18} color={colors.secondary} />}
          <Text style={styles.secondaryButtonText}>
            {capturing ? 'Capturando...' : 'Recapturar GPS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !hasCoords && styles.primaryButtonDisabled]}
          onPress={onNext}
          disabled={!hasCoords || capturing}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Próximo</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 3: Fotos ────────────────────────────────────────────────────────

function Step3({ state, onChange, onNext }: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [taking, setTaking] = useState(false);

  async function takePhoto() {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        onChange({ photoUris: [...state.photoUris, photo.uri] });
        setShowCamera(false);
      }
    } finally {
      setTaking(false);
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.permissionView}>
        <MaterialIcons name="camera-alt" size={64} color={colors.outlineVariant} />
        <Text style={styles.permissionText}>O app precisa de acesso à câmera</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Conceder permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { marginTop: spacing.xs }]} onPress={onNext}>
          <Text style={styles.secondaryButtonText}>Pular fotos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraBar}>
          <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraCancel}>
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>
          Fotos ({state.photoUris.length}/20)
        </Text>
        <View style={styles.photoGrid}>
          {state.photoUris.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() =>
                  onChange({ photoUris: state.photoUris.filter((_, j) => j !== i) })
                }
              >
                <MaterialIcons name="close" size={14} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          ))}
          {state.photoUris.length < 20 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => setShowCamera(true)}>
              <MaterialIcons name="add-a-photo" size={28} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>
            {state.photoUris.length === 0 ? 'Pular fotos' : 'Próximo'}
          </Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 4: Revisão ──────────────────────────────────────────────────────

function Step4({ state, onSave, isSaving, isConnected }: {
  state: WizardState;
  onSave: () => void;
  isSaving: boolean;
  isConnected: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.reviewLabel}>Tipo de Ativo</Text>
        <Text style={styles.reviewValue}>{state.assetTypeName || '—'}</Text>

        <Text style={[styles.reviewLabel, { marginTop: spacing.md }]}>Localização GPS</Text>
        <Text style={styles.reviewValue}>
          {state.latitude !== null
            ? `${state.latitude.toFixed(5)}, ${state.longitude!.toFixed(5)}`
            : '—'}
        </Text>
        {state.gpsAccuracyM !== null && (
          <Text style={styles.reviewSub}>Precisão: {state.gpsAccuracyM.toFixed(0)}m</Text>
        )}

        <Text style={[styles.reviewLabel, { marginTop: spacing.md }]}>Notas</Text>
        <Text style={styles.reviewValue}>{state.notes || '(sem notas)'}</Text>

        <Text style={[styles.reviewLabel, { marginTop: spacing.md }]}>Fotos</Text>
        <Text style={styles.reviewValue}>
          {state.photoUris.length === 0
            ? 'Nenhuma foto'
            : `${state.photoUris.length} foto(s)`}
        </Text>
        {state.photoUris.length > 0 && (
          <View style={styles.reviewPhotoRow}>
            {state.photoUris.slice(0, 4).map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.reviewPhoto} />
            ))}
          </View>
        )}

        {!isConnected && (
          <View style={styles.reviewNotice}>
            <MaterialIcons name="cloud-off" size={16} color={colors.secondary} />
            <Text style={styles.reviewNoticeText}>
              O asset será salvo como rascunho e sincronizado quando o aparelho voltar a ficar online.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={onSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color={colors.onPrimary} size="small" />
            : <MaterialIcons name="save" size={18} color={colors.onPrimary} />}
          <Text style={styles.primaryButtonText}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Wizard container ─────────────────────────────────────────────────────

export default function CriarAssetScreen() {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const { save, isSaving } = useSaveAsset();
  const { isConnected } = useNetworkStatus();

  function patch(p: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...p }));
  }

  async function handleSave() {
    try {
      const assetId = await save({
        assetTypeId: state.assetTypeId,
        assetTypeName: state.assetTypeName,
        latitude: state.latitude!,
        longitude: state.longitude!,
        gpsAccuracyM: state.gpsAccuracyM,
        notes: state.notes.trim() || null,
        photoUris: state.photoUris,
      });
      if (isConnected) {
        await SyncEngine.sync({ force: true });
      }
      router.replace(`/(app)/(assets)/${assetId}`);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o asset. Tente novamente.');
    }
  }

  const progress = (step / 4) * 100;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.wizardHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.onBackground} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.stepIndicator}>Passo {step} de 4</Text>
          <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Step content */}
      <View style={{ flex: 1 }}>
        {step === 1 && <Step1 state={state} onChange={patch} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 state={state} onChange={patch} onNext={() => setStep(3)} />}
        {step === 3 && <Step3 state={state} onChange={patch} onNext={() => setStep(4)} />}
        {step === 4 && <Step4 state={state} onSave={handleSave} isSaving={isSaving} isConnected={isConnected} />}
      </View>
    </SafeAreaView>
  );
}

const GLASS_CARD = {
  backgroundColor: 'rgba(255,255,255,0.4)',
  borderColor: 'rgba(255,255,255,0.6)',
  borderWidth: 1,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Wizard header
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: { ...typography.labelSm, color: colors.outline, letterSpacing: 2 },
  stepTitle: { ...typography.headlineMd, color: colors.onBackground, marginTop: 2 },

  // Progress
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: spacing.marginMobile,
    borderRadius: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.tertiaryFixedDim,
    borderRadius: 2,
  },

  // Step content container
  stepContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.xl,
  },

  // Fields
  fieldLabel: { ...typography.labelLg, color: colors.onBackground, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.default,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.onBackground,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  charCount: { ...typography.labelSm, color: colors.outline, textAlign: 'right', marginTop: 4 },

  // Type selection
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
  emptyTypes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.default,
  },
  emptyTypesText: { ...typography.bodyMd, color: colors.outline, flex: 1 },

  // Map
  mapWrapper: { alignItems: 'center', paddingVertical: spacing.md },
  mapCircle: {
    width: 288,
    height: 288,
    borderRadius: 144,
    overflow: 'hidden',
    ...GLASS_CARD,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(45,58,45,0.15)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 6,
  },
  mapPinWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(183,245,105,0.35)',
  },
  mapPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Info card
  infoCard: {
    ...GLASS_CARD,
    borderRadius: 16,
    marginHorizontal: spacing.marginMobile,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 32,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(68,71,72,0.1)',
  },
  infoRowBorderless: { paddingBottom: 0, borderBottomWidth: 0 },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  infoLabel: { ...typography.labelSm, color: colors.outline },
  infoValue: { ...typography.bodyLg, color: colors.onBackground },
  infoValueMuted: { ...typography.bodyMd, color: colors.outline },
  manualLocationCard: {
    ...GLASS_CARD,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.default,
    gap: spacing.sm,
  },
  manualLocationText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  manualLocationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coordInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.onBackground,
  },

  // Camera
  cameraBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cameraCancel: { padding: 12 },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },

  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceContainerHigh,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.marginMobile,
  },
  permissionText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },

  // Review
  reviewLabel: { ...typography.labelLg, color: colors.outline, letterSpacing: 1 },
  reviewValue: { ...typography.bodyLg, color: colors.onBackground, marginTop: 2 },
  reviewSub: { ...typography.labelSm, color: colors.outline, marginTop: 2 },
  reviewPhotoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  reviewPhoto: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.default,
    opacity: 0.8,
  },
  reviewNoticeText: { ...typography.labelSm, color: colors.onSecondaryContainer, flex: 1 },

  // Footer / buttons
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { ...typography.labelLg, color: colors.onPrimary },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  secondaryButtonText: { ...typography.labelLg, color: colors.secondary },
});
