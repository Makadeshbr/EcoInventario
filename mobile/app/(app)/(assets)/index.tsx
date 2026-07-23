import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAssetsList, type AssetsFilter } from '@/features/assets/hooks/use-assets-list';
import { colors, spacing, radius, typography, gradients } from '@/theme/tokens';
import { GradientBackground } from '@/components/ui/gradient-background';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { Skeleton } from '@/components/ui/skeleton';
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

/** `rail` é a faixa vertical de status na borda esquerda do card. */
const STATUS_COLORS: Record<Asset['status'], { bg: string; text: string; rail: string }> = {
  draft: { bg: colors.surfaceVariant, text: colors.onSurfaceVariant, rail: colors.outlineVariant },
  pending: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer, rail: colors.secondary },
  approved: { bg: 'rgba(183,245,105,0.3)', text: colors.accentDeep, rail: colors.accentDim },
  rejected: { bg: colors.errorContainer, text: colors.onErrorContainer, rail: colors.error },
};

/** Quantidade máxima de itens com stagger — além disso a entrada é imediata. */
const MAX_STAGGER_ITEMS = 8;
const STAGGER_STEP_MS = 55;
const SKELETON_ROWS = 5;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// TODO: Sem teste — componente visual puro, lógica em hook testado
function AssetCard({ asset, index }: { asset: Asset; index: number }) {
  const statusColor = STATUS_COLORS[asset.status];

  return (
    <FadeInView delay={Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_STEP_MS}>
      <PressableScale
        style={styles.card}
        onPress={() => router.push(`/(app)/(assets)/${asset.id}`)}
      >
        {/* Faixa de status: leitura do estado sem depender só do badge */}
        <View style={[styles.cardRail, { backgroundColor: statusColor.rail }]} />

        {/* Ícone dentro de um anel tingido pelo status — integrado ao glass do card */}
        <View style={[styles.cardThumb, { backgroundColor: `${statusColor.rail}1f` }]}>
          <MaterialIcons name="park" size={28} color={colors.secondary} />
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
      </PressableScale>
    </FadeInView>
  );
}

/** Esqueleto do card durante o carregamento inicial (evita tela em branco). */
function AssetCardSkeleton({ index }: { index: number }) {
  return (
    <FadeInView delay={index * STAGGER_STEP_MS} from="none">
      <View style={styles.card}>
        <Skeleton width={52} height={52} radius={26} />
        <View style={styles.skeletonBody}>
          <Skeleton width="65%" height={18} />
          <Skeleton width="40%" height={14} style={{ marginTop: spacing.base }} />
        </View>
      </View>
    </FadeInView>
  );
}

function LoadingList() {
  return (
    <View style={styles.list}>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <AssetCardSkeleton key={i} index={i} />
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <FadeInView style={styles.emptyState} from="up">
      <View style={styles.emptyRing}>
        <MaterialIcons name="park" size={56} color={colors.secondary} />
      </View>
      <Text style={styles.emptyTitle}>Nenhum asset por aqui</Text>
      <Text style={styles.emptySubtitle}>Cadastre o primeiro registro deste filtro</Text>
      <PressableScale
        style={styles.emptyButton}
        onPress={() => router.push('/(app)/(assets)/new')}
      >
        <MaterialIcons name="add" size={20} color={colors.onPrimary} />
        <Text style={styles.emptyButtonText}>Novo registro</Text>
      </PressableScale>
    </FadeInView>
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

  // Skeleton só no carregamento inicial; refresh com lista cheia usa o RefreshControl.
  const showSkeleton = isLoading && assets.length === 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <FadeInView from="up" style={styles.header}>
          <View>
            <Text style={styles.logoText}>Inventário</Text>
            <Text style={styles.headerSubtitle}>
              {showSkeleton
                ? 'Carregando registros...'
                : `${assets.length} ${assets.length === 1 ? 'registro' : 'registros'}`}
            </Text>
          </View>
          <PressableScale
            style={styles.headerAction}
            onPress={() => router.push('/(app)/(scanner)')}
          >
            <MaterialIcons name="qr-code-scanner" size={22} color={colors.secondary} />
          </PressableScale>
        </FadeInView>

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
              <PressableScale
                key={item.key}
                onPress={() => changeFilter(item.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                scaleTo={0.94}
              >
                {isActive ? (
                  <LinearGradient
                    colors={gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* Lista */}
        {showSkeleton ? (
          <LoadingList />
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(a) => a.id}
            renderItem={({ item, index }) => <AssetCard asset={item} index={index} />}
            contentContainerStyle={[
              styles.list,
              assets.length === 0 && styles.listEmpty,
            ]}
            ListEmptyComponent={<EmptyState />}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refresh}
                tintColor={colors.secondary}
                colors={[colors.secondary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB — ação primária em neon, o único elemento de alto impacto da tela */}
        <FadeInView delay={motionDelays.fab} from="up" style={styles.fabWrap}>
          <PressableScale
            style={styles.fab}
            scaleTo={0.92}
            onPress={() => router.push('/(app)/(assets)/new')}
          >
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <MaterialIcons name="add" size={30} color={colors.accentDeep} />
          </PressableScale>
        </FadeInView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const motionDelays = { fab: 260 } as const;

const GLASS = {
  backgroundColor: 'rgba(255,255,255,0.4)',
  borderColor: 'rgba(255,255,255,0.6)',
  borderWidth: 1,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.gutter,
  },
  logoText: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  headerSubtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  headerAction: {
    ...GLASS,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    overflow: 'hidden',
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
    borderColor: colors.accentDim,
    shadowColor: colors.accentDim,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  filterText: { ...typography.labelLg, color: colors.onSurfaceVariant },
  filterTextActive: { color: colors.accentDeep, fontFamily: 'PlusJakartaSans_700Bold' },

  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.sm,
    paddingBottom: 140,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  // Card — sem BlurView por linha (custo de GPU em lista longa); vidro simulado
  // com camada translúcida + borda interna, igual ao padrão da Home.
  card: {
    ...GLASS,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.gutter,
    paddingLeft: spacing.gutter + 6,
    borderRadius: 24,
    marginBottom: spacing.gutter,
    shadowColor: 'rgba(45,58,45,0.05)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 2,
  },
  cardRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
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

  skeletonBody: { flex: 1, marginLeft: spacing.gutter },

  emptyState: {
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.xl,
  },
  emptyRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(183,245,105,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(183,245,105,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.headlineMd, color: colors.primary },
  emptySubtitle: { ...typography.bodyMd, fontSize: 14, color: colors.onSurfaceVariant },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  emptyButtonText: { ...typography.labelLg, color: colors.onPrimary },

  fabWrap: {
    position: 'absolute',
    bottom: 104,
    right: spacing.marginMobile,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    // Halo neon: o FAB "brilha" em vez de só projetar sombra cinza.
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
});
