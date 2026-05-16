import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useSaveAsset } from '@/features/assets/hooks/use-save-asset';
import { SyncEngine } from '@/sync/sync-engine';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { type Step, type WizardState, WIZARD_INITIAL, STEP_TITLES } from '@/features/assets/wizard/wizard-types';
import { wizardStyles as styles } from '@/features/assets/wizard/wizard-styles';
import { StepTypeNotes } from '@/features/assets/wizard/step-type-notes';
import { StepLocation } from '@/features/assets/wizard/step-location';
import { StepPhotos } from '@/features/assets/wizard/step-photos';
import { StepReview } from '@/features/assets/wizard/step-review';

export default function CriarAssetScreen() {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>(WIZARD_INITIAL);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmittingFlow, setIsSubmittingFlow] = useState(false);
  const flowInFlightRef = useRef(false);
  const createdAssetIdRef = useRef<string | null>(null);
  const { save, isSaving } = useSaveAsset();
  const { isConnected } = useNetworkStatus();

  function patch(p: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...p }));
  }

  async function handleSave() {
    if (flowInFlightRef.current) return;
    flowInFlightRef.current = true;
    setIsSubmittingFlow(true);
    setStatusMessage('Salvando no aparelho...');
    try {
      const assetId = createdAssetIdRef.current ?? await save({
          assetTypeId: state.assetTypeId,
          assetTypeName: state.assetTypeName,
          latitude: state.latitude!,
          longitude: state.longitude!,
          gpsAccuracyM: state.gpsAccuracyM,
          notes: state.notes.trim() || null,
          photoUris: state.photoUris,
        });
      createdAssetIdRef.current = assetId;
      if (isConnected) {
        setStatusMessage('Enviando fotos e revisão ao admin...');
        const result = await SyncEngine.sync({ force: true });
        if (result.state === 'error') {
          setStatusMessage('Salvo, mas houve erro ao enviar. Tente sincronizar novamente.');
          Alert.alert('Envio pendente', result.message ?? 'Salvo no aparelho, mas ainda não foi confirmado pelo servidor.');
          return;
        }
        if (result.pendingMetadataCount > 0 || result.pendingMediaCount > 0) {
          setStatusMessage('Salvo e ainda pendente de confirmação do servidor.');
          Alert.alert('Envio pendente', 'O registro foi salvo e continua na fila de sincronização.');
          return;
        }
        setStatusMessage('Enviado ao admin para revisão.');
      } else {
        setStatusMessage('Aguardando conexão para enviar para revisão.');
      }
      router.replace(`/(app)/(assets)/${assetId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o asset. Tente novamente.';
      setStatusMessage(message);
      Alert.alert('Erro', message);
    } finally {
      flowInFlightRef.current = false;
      setIsSubmittingFlow(false);
    }
  }

  const progress = (step / 4) * 100;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.wizardHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={20} color={styles.stepTitle.color} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.stepIndicator}>Passo {step} de 4</Text>
          <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={{ flex: 1 }}>
        {step === 1 && <StepTypeNotes state={state} onChange={patch} onNext={() => setStep(2)} />}
        {step === 2 && <StepLocation state={state} onChange={patch} onNext={() => setStep(3)} />}
        {step === 3 && <StepPhotos state={state} onChange={patch} onNext={() => setStep(4)} />}
        {step === 4 && (
          <StepReview
            state={state}
            onSave={handleSave}
            isSaving={isSaving || isSubmittingFlow}
            isConnected={isConnected}
            statusMessage={statusMessage}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
