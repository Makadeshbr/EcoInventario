import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { colors, spacing, typography, radius } from '@/theme/tokens';

const ROLE_LABELS: Record<string, string> = {
  tech: 'Técnico de Campo',
  admin: 'Administrador',
  viewer: 'Visualizador',
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  badge,
  destructive,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, destructive && styles.menuIconWrapDestructive]}>
        <MaterialIcons
          name={icon}
          size={20}
          color={destructive ? colors.error : colors.onSecondaryContainer}
        />
      </View>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={destructive ? colors.error : colors.outline}
        />
      )}
    </TouchableOpacity>
  );
}

export default function PerfilScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { pendingMetadataCount, pendingMediaCount, conflictCount } = useSyncStore();

  function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(welcome)');
        },
      },
    ]);
  }

  if (!user) return null;

  const pendingTotal = pendingMetadataCount + pendingMediaCount;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Avatar + identidade */}
        <View style={styles.profileCard}>
          <Avatar name={user.name} />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>
            {ROLE_LABELS[user.role] ?? user.role}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Sync status bar */}
        {pendingTotal > 0 && (
          <TouchableOpacity
            style={styles.syncBanner}
            onPress={() => router.push('/(app)/(profile)/sync')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="sync" size={18} color={colors.secondary} />
            <Text style={styles.syncBannerText}>
              {pendingTotal} item{pendingTotal > 1 ? 'ns' : ''} aguardando sincronização
            </Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.secondary} />
          </TouchableOpacity>
        )}

        {/* Menu principal */}
        <View style={styles.menuCard}>
          <MenuRow
            icon="sync"
            label="Sincronização"
            badge={pendingTotal > 0 ? pendingTotal : undefined}
            onPress={() => router.push('/(app)/(profile)/sync')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="warning"
            label="Conflitos"
            badge={conflictCount > 0 ? conflictCount : undefined}
            onPress={() => router.push('/(app)/(profile)/conflicts')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="settings"
            label="Configurações"
            onPress={() => router.push('/(app)/(profile)/settings')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="info"
            label="Sobre o App"
            onPress={() => router.push('/(app)/(profile)/about')}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <MaterialIcons name="logout" size={20} color={colors.onErrorContainer} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

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
  content: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  profileCard: {
    ...GLASS,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    shadowColor: 'rgba(45,58,45,0.05)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 2,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 4,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 32,
    color: colors.secondary,
  },
  userName: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: 2,
  },
  userRole: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  userEmail: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.default,
  },
  syncBannerText: {
    ...typography.labelLg,
    color: colors.secondary,
    flex: 1,
  },

  menuCard: {
    ...GLASS,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: 'rgba(45,58,45,0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(207,234,204,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapDestructive: {
    backgroundColor: 'rgba(255,218,214,0.5)',
  },
  menuLabel: {
    ...typography.labelLg,
    color: colors.primary,
    flex: 1,
  },
  menuLabelDestructive: {
    color: colors.error,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 9999,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(196,199,199,0.2)',
    marginHorizontal: spacing.md,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    ...typography.labelLg,
    color: colors.onErrorContainer,
  },
});
