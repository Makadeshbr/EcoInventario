import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAssetsList, type AssetsFilter } from '@/features/assets/hooks/use-assets-list';
import { colors, spacing, radius, typography } from '@/theme/tokens';
import type { Asset } from '@/types/domain';

const FILTERS: { key: AssetsFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Rascunhos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovados' },
  { key: 'rejected', label: 'Rejeitados' },
  { key: 'unsynced', label: 'Não sincronizados' },
];

const VALID_FILTERS = FILTERS.map((f) => f.key);

const STATUS_LABELS: Record<Asset['status'], string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLORS: Record<Asset['status'], { bg: string; text: string }> = {
  draft: { bg: colors.surfaceVariant, text: colors.onSurfaceVariant },
  pending: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer },
  approved: { bg: 'rgba(183,245,105,0.3)', text: '#304f00' },
  rejected: { bg: colors.errorContainer, text: colors.onErrorContainer },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// TODO: Sem teste — componente visual puro, lógica em hook testado
function AssetCard({ asset }: { asset: Asset }) {
  const statusColor = STATUS_COLORS[asset.status];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/(assets)/${asset.id}`)}
      activeOpacity={0.82}
    >
      {/* Ícone da planta — sem fundo branco, integrado ao glass do card */}
      <View style={styles.cardThumb}>
        <MaterialIcons name="park" size={44} color={colors.secondary} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{asset.assetTypeName}</Text>
        <View style={styles.cardBadgeRow}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {STATUS_LABELS[asset.status]}
            </Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(asset.createdAt)}</Text>
        </View>
      </View>

      {/* Ícone de sync — alinhado ao Stitch (cloud_done / cloud_off) */}
      <View style={styles.syncIcon}>
        {asset.isSynced ? (
          <MaterialIcons name="cloud-done" size={22} color={colors.secondary} />
        ) : (
          <MaterialIcons name="cloud-off" size={22} color={colors.outline} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="park" size={72} color={colors.outlineVariant} />
      <Text style={styles.emptyTitle}>Nenhum asset cadastrado</Text>
      <Text style={styles.emptySubtitle}>Toque no botão + para criar o primeiro</Text>
    </View>
  );
}

function normalizeFilter(filter: string | string[] | undefined): AssetsFilter {
  const value = Array.isArray(filter) ? filter[0] : filter;
  return VALID_FILTERS.includes(value as AssetsFilter) ? (value as AssetsFilter) : 'all';
}

export default function AssetsListScreen() {
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const initialFilter = normalizeFilter(filterParam);
  const lastRouteFilterRef = useRef<string | undefined>(Array.isArray(filterParam) ? filterParam[0] : filterParam);
  const { assets, activeFilter, isLoading, changeFilter, refresh } = useAssetsList(initialFilter);

  useEffect(() => {
    const routeFilter = Array.isArray(filterParam) ? filterParam[0] : filterParam;
    if (!routeFilter || routeFilter === lastRouteFilterRef.current) return;

    lastRouteFilterRef.current = routeFilter;
    const nextFilter = normalizeFilter(filterParam);
    if (nextFilter !== activeFilter) {
      void changeFilter(nextFilter);
    }
  }, [activeFilter, changeFilter, filterParam]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="menu" size={24} color={colors.onBackground} />
        <Text style={styles.logoText}>EcoInventário</Text>
        <View style={styles.avatarPlaceholder}>
          <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
        </View>
      </View>

      {/* Filtros — ScrollView horizontal sem FlatList para evitar animação de layout */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersScroll}
      >
        {FILTERS.map((item) => {
          const isActive = item.key === activeFilter;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => changeFilter(item.key)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={assets}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AssetCard asset={item} />}
        contentContainerStyle={[
          styles.list,
          assets.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={isLoading ? null : <EmptyState />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/(assets)/new')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const GLASS = {
  backgroundColor: 'rgba(255,255,255,0.4)',
  borderColor: 'rgba(255,255,255,0.5)',
  borderWidth: 1,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.gutter,
  },
  logoText: {
    ...typography.labelLg,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.onBackground,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  // Filtros: ScrollView em vez de FlatList evita animação de reflow ao mudar seleção
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filters: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    ...GLASS,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    elevation: 4,
  },
  filterText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  filterTextActive: { color: colors.onPrimary },

  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.sm,
    paddingBottom: 140,
  },

  // Card — thumb sem fundo, integrado ao glassmorphism do card
  card: {
    ...GLASS,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.gutter,
    borderRadius: 24,
    marginBottom: spacing.gutter,
    shadowColor: 'rgba(45,58,45,0.05)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 2,
  },
  cardThumb: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.gutter,
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.headlineMd, color: colors.onBackground, marginBottom: 4, fontSize: 18 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: { ...typography.labelSm },
  cardDate: { ...typography.labelSm, color: colors.onSurfaceVariant, opacity: 0.7 },
  syncIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    flexShrink: 0,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: { ...typography.headlineMd, color: colors.onSurfaceVariant },
  emptySubtitle: { ...typography.bodyMd, color: colors.outline },

  fab: {
    position: 'absolute',
    bottom: 104,
    right: spacing.marginMobile,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
});
