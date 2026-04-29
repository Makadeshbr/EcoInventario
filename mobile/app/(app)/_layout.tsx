import { Tabs, Redirect } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { useEffect } from 'react';
import { SyncEngine } from '@/sync/sync-engine';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { colors } from '@/theme/tokens';

type NestedRouteState = {
  index?: number;
  routes?: Array<{ name: string }>;
};

const TABS = [
  { icon: 'home' as const, label: 'Home' },
  { icon: 'assignment' as const, label: 'Assets' },
  { icon: 'center-focus-strong' as const, label: 'Scanner' },
  { icon: 'person' as const, label: 'Perfil' },
] as const;

function getActiveChildRouteName(route: BottomTabBarProps['state']['routes'][number]): string | null {
  const childState = route.state as NestedRouteState | undefined;
  if (!childState?.routes?.length) return null;

  return childState.routes[childState.index ?? 0]?.name ?? null;
}

function shouldShowTabBar(state: BottomTabBarProps['state']): boolean {
  const activeRoute = state.routes[state.index];
  const childRouteName = getActiveChildRouteName(activeRoute);
  return childRouteName === null || childRouteName === 'index';
}

function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const { pendingMetadataCount, conflictCount } = useSyncStore();

  if (!shouldShowTabBar(state)) return null;

  const badges = [0, pendingMetadataCount, 0, conflictCount];

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="light" style={styles.blur}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const hasBadge = badges[index] > 0;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name, undefined, { merge: true });
                }
              }}
              activeOpacity={0.8}
              style={[styles.tab, isActive && styles.activeTab]}
            >
              <MaterialIcons
                name={TABS[index].icon}
                size={24}
                color={isActive ? colors.onPrimary : '#757575'}
              />
              {hasBadge && <View style={styles.badge} />}
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blur: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    padding: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      SyncEngine.start();
    } else {
      SyncEngine.stop();
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        SyncEngine.start();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        SyncEngine.stop();
      }
    });

    return () => {
      SyncEngine.stop();
      subscription.remove();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Redirect href="/(welcome)" />;
  }

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(home)/index" />
      <Tabs.Screen name="(assets)" />
      <Tabs.Screen name="(scanner)/index" />
      <Tabs.Screen name="(profile)" />
    </Tabs>
  );
}

