import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { getAssetTypes } from '@/features/assets/repository';
import { colors, spacing } from '@/theme/tokens';
import type { AssetType } from '@/types/domain';
import type { WizardState } from './wizard-types';
import { wizardStyles as styles } from './wizard-styles';

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}

export function StepTypeNotes({ state, onChange, onNext }: Props) {
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
