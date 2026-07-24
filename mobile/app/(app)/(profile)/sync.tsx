import { useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { GradientBackground } from '@/components/ui/gradient-background';
import { Button } from '@/components/ui/button';
import { useSyncStore } from '@/stores/sync-store';
import { SyncEngine } from '@/sync/sync-engine';
import { Icon, type IconName } from '@/components/ui/icon';

export default function SyncStatusScreen() {
  const { status, lastSyncAt, pendingMetadataCount, pendingMediaCount } = useSyncStore();
  const [manualSyncing, setManualSyncing] = useState(false);
  const pendingTotal = pendingMetadataCount + pendingMediaCount;

  const syncState = status.state;
  const isSyncing = syncState === 'syncing' || manualSyncing;

  async function handleSyncNow() {
    if (manualSyncing) return;
    setManualSyncing(true);
    try {
      const result = await SyncEngine.sync({ force: true });
      if (result.state === 'offline') {
        Alert.alert('Sem conexao', 'Os itens continuam salvos no aparelho e serao enviados quando a internet voltar.');
        return;
      }
      if (result.state === 'error') {
        Alert.alert('Sincronizacao falhou', result.message ?? 'Nao foi possivel concluir o envio agora.');
        return;
      }
      if (result.conflictCount > 0) {
        Alert.alert('Conflito de sincronizacao', `${result.conflictCount} item(ns) precisam de revisao antes de reenviar.`);
        return;
      }
      if (result.pendingMetadataCount === 0 && result.pendingMediaCount === 0) {
        Alert.alert('Tudo sincronizado', 'Todos os dados e fotos foram confirmados pelo servidor.');
        return;
      }
      if (result.pendingMetadataCount === 0) {
        Alert.alert(
          'Dados enviados',
          `${result.pendingMediaCount} foto(s) ainda estao pendentes, mas os dados elegiveis ja foram enviados para o painel admin.`,
        );
        return;
      }
      Alert.alert(
        'Ainda ha pendencias',
        `${result.pendingMetadataCount} dado(s) e ${result.pendingMediaCount} foto(s) continuam pendentes. Verifique sua conexao e tente novamente.`,
      );
    } finally {
      setManualSyncing(false);
    }
  }

  function getStatusColor() {
    switch (syncState) {
      case 'syncing': return colors.primary;
      case 'error': return colors.error;
      case 'offline': return colors.outline;
      case 'synced': return colors.secondary;
      default: return colors.outline;
    }
  }

  function getStatusIcon(): IconName {
    switch (syncState) {
      case 'syncing': return 'sync';
      case 'error': return 'error';
      case 'offline': return 'cloudOff';
      case 'synced': return 'cloudDone';
      default: return 'cloud';
    }
  }

  function getStatusLabel() {
    switch (syncState) {
      case 'syncing': return 'Sincronizando...';
      case 'error': return 'Erro na sincronização';
      case 'offline': return 'Offline';
      case 'synced': return 'Sincronizado';
      default: return 'Pronto';
    }
  }

  return (
    <GradientBackground>
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Status de Sincronização' }} />
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.statusCard}>
          <Icon name={getStatusIcon()} size={48} color={getStatusColor()} />
          <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
          {lastSyncAt && (
            <Text style={styles.lastSyncText}>
              Última sincronização: {new Date(lastSyncAt).toLocaleString('pt-BR')}
            </Text>
          )}
          {syncState === 'error' && (
            <Text style={styles.errorText}>
              {'message' in status ? status.message : ''}
            </Text>
          )}
        </View>

        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Fila de Envio</Text>
          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Dados para o admin</Text>
            <Text style={styles.queueValue}>{pendingMetadataCount}</Text>
          </View>
          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Fotos</Text>
            <Text style={styles.queueValue}>{pendingMediaCount}</Text>
          </View>
          <View style={[styles.queueRow, styles.queueRowTotal]}>
            <Text style={styles.queueLabelBold}>Total Pendente</Text>
            <Text style={styles.queueValueBold}>{pendingTotal}</Text>
          </View>
        </View>

        <Button
          title={isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
          onPress={handleSyncNow}
          loading={isSyncing}
          disabled={isSyncing}
          style={styles.syncButton}
        />

      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.marginMobile,
    gap: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statusTitle: {
    ...typography.headlineSm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  lastSyncText: {
    ...typography.bodySm,
    color: colors.outline,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  queueCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.marginMobile,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  queueTitle: {
    ...typography.titleMd,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  queueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  queueRowTotal: {
    borderBottomWidth: 0,
    marginTop: spacing.xs,
  },
  queueLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  queueValue: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  queueLabelBold: {
    ...typography.titleSm,
    color: colors.primary,
  },
  queueValueBold: {
    ...typography.titleLg,
    color: colors.primary,
  },
  syncButton: {
    marginTop: spacing.xs,
  },
});
