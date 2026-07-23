import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '@/theme/tokens';
import { GradientBackground } from '@/components/ui/gradient-background';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { useSaveAsset } from '@/features/assets/hooks/use-save-asset';
import { SyncEngine } from '@/sync/sync-engine';
import { getEntitySyncStatus } from '@/sync/entity-sync-status';
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
        const entityStatus = await getEntitySyncStatus('asset', assetId);
        if (entityStatus.pendingMetadataCount > 0) {
          setStatusMessage('Salvo e ainda pendente de confirmação do servidor.');
          Alert.alert('Envio pendente', 'O registro foi salvo e continua na fila de sincronização.');
          return;
        }
        if (entityStatus.pendingMediaCount > 0) {
          setStatusMessage('Enviado ao admin. Fotos ainda pendentes.');
          Alert.alert('Enviado ao admin', 'O registro chegou para aprovação. Algumas fotos ainda estão pendentes e serão reenviadas.');
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.wizardHeader}>
          <PressableScale
            style={styles.backButton}
            onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
          >
            <MaterialIcons name="arrow-back" size={20} color={styles.stepTitle.color} />
          </PressableScale>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.stepIndicator}>Passo {step} de 4</Text>
            {/* key: o título reanima a cada passo, reforçando o avanço */}
            <FadeInView key={step} from="up" duration={motion.duration.fast}>
              <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
            </FadeInView>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ProgressBar step={step} />

        {/* key: cada passo entra com fade + slide em vez de trocar seco */}
        <FadeInView key={step} style={{ flex: 1 }} duration={motion.duration.base}>
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
        </FadeInView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const TOTAL_STEPS = 4;

/** Barra de progresso que preenche com mola a cada passo concluído. */
function ProgressBar({ step }: { step: Step }) {
  const progress = useSharedValue(step / TOTAL_STEPS);

  useEffect(() => {
    progress.value = withSpring(step / TOTAL_STEPS, motion.spring.soft);
  }, [step, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, animatedStyle]} />
    </View>
  );
}
