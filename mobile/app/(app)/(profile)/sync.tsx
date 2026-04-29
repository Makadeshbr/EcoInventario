import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { Button } from '@/components/ui/button';
import { useSyncStore } from '@/stores/sync-store';
import { SyncEngine } from '@/sync/sync-engine';

export default function SyncStatusScreen() {
  const { status, lastSyncAt, pendingMetadataCount, pendingMediaCount } = useSyncStore();
  const pendingTotal = pendingMetadataCount + pendingMediaCount;

  const syncState = status.state;
  const isSyncing = syncState === 'syncing';

  function handleSyncNow() {
    SyncEngine.sync({ force: true });
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

  function getStatusIcon(): keyof typeof MaterialIcons.glyphMap {
    switch (syncState) {
      case 'syncing': return 'sync';
      case 'error': return 'error-outline';
      case 'offline': return 'cloud-off';
      case 'synced': return 'cloud-done';
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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Status de Sincronização' }} />
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.statusCard}>
          <MaterialIcons name={getStatusIcon()} size={48} color={getStatusColor()} />
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
            <Text style={styles.queueLabel}>Dados (Ativos, Manejos)</Text>
            <Text style={styles.queueValue}>{pendingMetadataCount}</Text>
          </View>
          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Mídias (Fotos)</Text>
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
          disabled={isSyncing || syncState === 'offline'}
          style={styles.syncButton}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
