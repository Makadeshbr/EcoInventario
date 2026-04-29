import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import {
  getConflictById,
  resolveConflictAcceptServer,
  resolveConflictForceLocal,
  type ConflictRecord,
} from '@/sync/conflict-handler';

export default function ConflictDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conflict, setConflict] = useState<ConflictRecord | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function load() {
    const data = await getConflictById(id);
    setConflict(data);
  }

  async function handleAcceptServer() {
    Alert.alert(
      'Aceitar Servidor',
      'Isso vai sobrescrever suas alterações locais com a versão do servidor. Confirmar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setIsResolving(true);
            try {
              await resolveConflictAcceptServer(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Erro', err.message);
              setIsResolving(false);
            }
          },
        },
      ]
    );
  }

  async function handleForceLocal() {
    Alert.alert(
      'Forçar Local',
      'Isso vai reenviar suas alterações para o servidor. Confirmar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsResolving(true);
            try {
              await resolveConflictForceLocal(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Erro', err.message);
              setIsResolving(false);
            }
          },
        },
      ]
    );
  }

  if (!conflict) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Resolver Conflito' }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  let localPayload: Record<string, any> = {};
  let serverPayload: Record<string, any> = {};
  let serverUpdatedAt = '';
  try {
    localPayload = JSON.parse(conflict.local_payload);
    const serverData = JSON.parse(conflict.server_payload);
    serverPayload = serverData.data ?? {};
    serverUpdatedAt = serverData.updated_at ?? '';
  } catch { /* noop */ }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Resolver Conflito' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={20} color={colors.secondary} />
          <Text style={styles.infoText}>
            Este item foi modificado no servidor enquanto você estava offline. Escolha qual versão manter.
          </Text>
        </View>

        {/* Local version */}
        <View style={[styles.column, styles.localColumn]}>
          <Text style={styles.columnTitle}>✏️ Sua Edição (Local)</Text>
          <View style={styles.payloadBox}>
            <Text style={styles.payloadKey}>Notas</Text>
            <Text style={styles.payloadText}>{localPayload.notes || '—'}</Text>
            <Text style={styles.payloadKey}>Atualizado em</Text>
            <Text style={styles.payloadText}>
              {localPayload.updated_at ? new Date(localPayload.updated_at).toLocaleString('pt-BR') : '—'}
            </Text>
          </View>
          <Button
            title="Manter Minha Edição"
            onPress={handleForceLocal}
            loading={isResolving}
            style={styles.fullWidth}
          />
        </View>

        {/* Server version */}
        <View style={[styles.column, styles.serverColumn]}>
          <Text style={styles.columnTitleServer}>☁️ Versão do Servidor</Text>
          <View style={styles.payloadBox}>
            <Text style={styles.payloadKey}>Notas</Text>
            <Text style={styles.payloadText}>{serverPayload.notes || '—'}</Text>
            <Text style={styles.payloadKey}>Atualizado em</Text>
            <Text style={styles.payloadText}>
              {serverUpdatedAt ? new Date(serverUpdatedAt).toLocaleString('pt-BR') : '—'}
            </Text>
          </View>
          <Button
            title="Aceitar Servidor"
            onPress={handleAcceptServer}
            loading={isResolving}
            variant="outline"
            style={styles.fullWidth}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyMd, color: colors.outline },
  content: {
    padding: spacing.marginMobile,
    gap: spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.secondaryContainer,
    padding: spacing.sm,
    borderRadius: radius.default,
  },
  infoText: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  column: {
    backgroundColor: colors.surface,
    padding: spacing.marginMobile,
    borderRadius: radius.default,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  localColumn: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  serverColumn: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  columnTitle: {
    ...typography.titleMd,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  columnTitleServer: {
    ...typography.titleMd,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  payloadBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  payloadKey: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 4,
  },
  payloadText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  fullWidth: {
    width: '100%',
  },
});
