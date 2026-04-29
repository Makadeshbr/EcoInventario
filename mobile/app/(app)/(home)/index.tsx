import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useHomeData } from '@/features/assets/hooks/use-home-data';
import { useSyncStore } from '@/stores/sync-store';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, radius, typography } from '@/theme/tokens';
import type { Asset } from '@/types/domain';

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

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function SyncIndicator() {
  const { status } = useSyncStore();
  const [visible, setVisible] = React.useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (status.state === 'idle') return;

    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // Auto-dismiss apenas no estado 'synced'
    if (status.state === 'synced') {
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() =>
          setVisible(false),
        );
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status.state]);

  if (!visible && status.state === 'idle') return null;

  type BannerInfo = { icon: keyof typeof MaterialIcons.glyphMap; color: string; label: string; bg: string };

  const map: Record<string, BannerInfo> = {
    syncing: {
      icon: 'sync',
      color: colors.secondary,
      label: 'Sincronizando...',
      bg: colors.surfaceContainerLow,
    },
    synced: {
      icon: 'cloud-done',
      color: '#2e7d32',
      label: (() => {
        if (status.state !== 'synced') return 'Sincronizado';
        const pending = status.pendingCount;
        if (pending > 0) return `Sincronizado · ${pending} pendente${pending > 1 ? 's' : ''}`;
        return 'Tudo sincronizado';
      })(),
      bg: 'rgba(46,125,50,0.12)',
    },
    error: {
      icon: 'sync-problem',
      color: colors.error,
      label: 'Erro na sincronização',
      bg: colors.errorContainer,
    },
    offline: {
      icon: 'cloud-off',
      color: colors.outline,
      label: (() => {
        if (status.state !== 'offline') return 'Sem conexão';
        const p = status.pendingCount;
        return p > 0 ? `Offline · ${p} pendente${p > 1 ? 's' : ''}` : 'Sem conexão';
      })(),
      bg: colors.surfaceContainerLow,
    },
    conflict: {
      icon: 'warning',
      color: '#e65100',
      label: 'Conflitos pendentes',
      bg: 'rgba(230,81,0,0.1)',
    },
  };

  const info = map[status.state];
  if (!info) return null;

  return (
    <Animated.View style={[styles.syncBanner, { backgroundColor: info.bg, opacity }]}>
      <MaterialIcons name={info.icon} size={16} color={info.color} />
      <Text style={[styles.syncLabel, { color: info.color }]}>{info.label}</Text>
    </Animated.View>
  );
}

function StatCard({
  count,
  label,
  icon,
  borderStyle,
  accent,
  onPress,
}: {
  count: number;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  borderStyle: object;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, borderStyle]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <MaterialIcons name={icon} size={32} color={accent} style={styles.statIcon} />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

function AssetListItem({ asset }: { asset: Asset }) {
  const status = STATUS_COLORS[asset.status];
  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => router.push(`/(app)/(assets)/${asset.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.listItemThumb}>
        <MaterialIcons name="park" size={32} color={colors.secondary} />
      </View>
      <View style={styles.listItemBody}>
        <Text style={styles.listItemTitle} numberOfLines={1}>{asset.assetTypeName}</Text>
        <Text style={styles.listItemSub} numberOfLines={1}>
          {asset.notes
            ? asset.notes
            : `${asset.latitude.toFixed(4)}°, ${asset.longitude.toFixed(4)}°`}
        </Text>
      </View>
      <View style={styles.listItemRight}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>
            {STATUS_LABELS[asset.status]}
          </Text>
        </View>
        <Text style={styles.listItemTime}>{formatRelativeTime(asset.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { recentAssets, counts, isLoading, refresh } = useHomeData();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(' ')[0] ?? 'Profissional';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header limpo: só o nome do app */}
      <View style={styles.header}>
        <Text style={styles.logoText}>EcoInventário</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Olá, {firstName}</Text>
          <Text style={styles.greetingSubtitle}>Visão geral do sistema.</Text>
        </View>

        <SyncIndicator />

        {/* Stats 2×2 — duas linhas explícitas para evitar overflow com flexWrap */}
        {isLoading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginVertical: spacing.md }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                count={counts.approved}
                label="Aprovados"
                icon="check-circle"
                borderStyle={styles.cardOrganic1}
                accent={colors.tertiaryFixedDim}
                onPress={() => router.push('/(app)/(assets)?filter=approved')}
              />
              <StatCard
                count={counts.pending}
                label="Pendentes"
                icon="pending-actions"
                borderStyle={styles.cardOrganic2}
                accent={colors.secondary}
                onPress={() => router.push('/(app)/(assets)?filter=pending')}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                count={counts.draft}
                label="Rascunhos"
                icon="edit-note"
                borderStyle={styles.cardOrganic3}
                accent={colors.outline}
                onPress={() => router.push('/(app)/(assets)?filter=draft')}
              />
              <StatCard
                count={counts.rejected}
                label="Rejeitados"
                icon="cancel"
                borderStyle={styles.cardOrganic4}
                accent={colors.error}
                onPress={() => router.push('/(app)/(assets)?filter=rejected')}
              />
            </View>
          </View>
        )}

        {/* Recent assets */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimos Cadastros</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/(assets)')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {recentAssets.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="park" size={48} color={colors.outlineVariant} />
            <Text style={styles.emptyText}>Nenhum asset cadastrado</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(app)/(assets)/new')}
            >
              <Text style={styles.emptyButtonText}>Criar primeiro asset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentAssets.map((asset) => <AssetListItem key={asset.id} asset={asset} />)
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const GLASS = {
  backgroundColor: 'rgba(255,255,255,0.4)',
  borderColor: 'rgba(255,255,255,0.6)',
  borderWidth: 1,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.gutter,
  },
  logoText: {
    ...typography.labelLg,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.onBackground,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  content: { paddingHorizontal: spacing.marginMobile, paddingBottom: 40 },
  greeting: { marginBottom: spacing.md },
  greetingTitle: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  greetingSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.default,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  syncLabel: { ...typography.labelSm },
  statsGrid: {
    marginBottom: spacing.lg,
    gap: spacing.gutter,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.gutter,
    marginBottom: spacing.gutter,
  },
  statCard: {
    flex: 1,
    ...GLASS,
    padding: spacing.md,
    minHeight: 160,
    justifyContent: 'center',
    shadowColor: 'rgba(45,58,45,0.05)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 2,
  },
  cardOrganic1: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 48,
    borderBottomLeftRadius: 16,
  },
  cardOrganic2: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 40,
  },
  cardOrganic3: {
    borderTopLeftRadius: 48,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 32,
  },
  cardOrganic4: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 48,
    borderBottomLeftRadius: 16,
  },
  statIcon: { marginBottom: spacing.sm },
  statCount: {
    ...typography.display,
    color: colors.primary,
    margin: 0,
  },
  statLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.headlineMd, color: colors.primary },
  seeAll: { ...typography.labelLg, color: colors.secondary },
  listItem: {
    ...GLASS,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.gutter,
    borderRadius: 24,
    marginBottom: spacing.gutter,
    shadowColor: 'rgba(45,58,45,0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 1,
  },
  listItemThumb: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.gutter,
    flexShrink: 0,
  },
  listItemBody: { flex: 1 },
  listItemTitle: { ...typography.labelLg, color: colors.primary },
  listItemSub: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13 },
  listItemRight: { alignItems: 'flex-end', flexShrink: 0, paddingLeft: spacing.xs },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: { ...typography.labelSm },
  listItemTime: {
    ...typography.labelSm,
    color: colors.outlineVariant,
    marginTop: 4,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    marginTop: spacing.xs,
  },
  emptyButtonText: { ...typography.labelLg, color: colors.onPrimary },
});
