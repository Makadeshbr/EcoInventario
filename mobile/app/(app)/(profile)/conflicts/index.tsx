import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router, Stack } from 'expo-router';
import { useCallback } from 'react';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { GradientBackground } from '@/components/ui/gradient-background';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { getConflicts, type ConflictRecord } from '@/sync/conflict-handler';
import { Icon } from '@/components/ui/icon';

export default function ConflictsListScreen() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setIsLoading(true);
    try {
      const data = await getConflicts();
      setConflicts(data);
    } finally {
      setIsLoading(false);
    }
  }

  function renderItem({ item }: { item: ConflictRecord }) {
    let localNotes = '';
    try {
      const local = JSON.parse(item.local_payload);
      localNotes = local.notes || local.description || 'Sem notas';
    } catch { localNotes = 'Payload inválido'; }

    return (
      <PressableScale
        style={styles.card}
        onPress={() => router.push(`/(app)/(profile)/conflicts/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Icon name="warning" size={20} color={colors.error} />
          <Text style={styles.entityType}>
            {item.entity_type === 'asset' ? 'Ativo' : item.entity_type}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <Text style={styles.cardId} numberOfLines={1}>ID: {item.entity_id}</Text>
        <Text style={styles.cardPreview} numberOfLines={2}>{localNotes}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.actionText}>Resolver conflito</Text>
          <Icon name="chevronRight" size={18} color={colors.primary} />
        </View>
      </PressableScale>
    );
  }

  return (
    <GradientBackground>
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Conflitos de Sincronização' }} />
      
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Carregando...</Text>
        </View>
      ) : conflicts.length === 0 ? (
        <FadeInView from="up" style={styles.emptyContainer}>
          <Icon name="success" size={48} color={colors.secondary} />
          <Text style={styles.emptyTitle}>Tudo certo!</Text>
          <Text style={styles.emptyText}>Nenhum conflito de sincronização encontrado.</Text>
        </FadeInView>
      ) : (
        <FlatList
          data={conflicts}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  list: {
    padding: spacing.marginMobile,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.default,
    padding: spacing.marginMobile,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  entityType: {
    ...typography.labelLg,
    color: colors.error,
    flex: 1,
    textTransform: 'capitalize',
  },
  dateText: {
    ...typography.labelSm,
    color: colors.outline,
  },
  cardId: {
    ...typography.labelSm,
    color: colors.outline,
    marginBottom: spacing.xs,
  },
  cardPreview: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
  },
  actionText: {
    ...typography.labelSm,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
