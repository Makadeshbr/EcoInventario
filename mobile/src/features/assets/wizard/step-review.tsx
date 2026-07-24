import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import type { WizardState } from './wizard-types';
import { PressableScale } from '@/components/ui/pressable-scale';
import { wizardStyles as styles } from './wizard-styles';
import { Icon } from '@/components/ui/icon';

interface Props {
  state: WizardState;
  onSave: () => void;
  isSaving: boolean;
  isConnected: boolean;
  statusMessage?: string | null;
}

export function StepReview({ state, onSave, isSaving, isConnected, statusMessage }: Props) {
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

        {statusMessage && (
          <View style={styles.reviewNotice}>
            <Icon name="sync" size={16} color={colors.secondary} />
            <Text style={styles.reviewNoticeText}>{statusMessage}</Text>
          </View>
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
            <Icon name="cloudOff" size={16} color={colors.secondary} />
            <Text style={styles.reviewNoticeText}>
              O asset ficará aguardando conexão para ser enviado à revisão.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={onSave}
          disabled={isSaving}
         
        >
          {isSaving
            ? <ActivityIndicator color={colors.accentDeep} size="small" />
            : <Icon name="send" size={18} color={colors.accentDeep} />}
          <Text style={styles.primaryButtonText}>
            {isSaving ? 'Enviando...' : 'Enviar para revisão'}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}
