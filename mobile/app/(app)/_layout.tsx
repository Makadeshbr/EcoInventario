import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet, AppState } from 'react-native';
import { useEffect } from 'react';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SyncEngine } from '@/sync/sync-engine';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { colors, typography, gradients, motion } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';

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
            <PressableScale
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
              scaleTo={motion.scale.pressInStrong}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={TABS[index].label}
              style={styles.tabHitbox}
            >
              {/* A pill cresce/encolhe com mola quando a aba muda */}
              <Animated.View
                layout={LinearTransition.springify().damping(motion.spring.snappy.damping)}
                style={[styles.tab, isActive && styles.activeTab]}
              >
                {isActive ? (
                  <LinearGradient
                    colors={gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <MaterialIcons
                  name={TABS[index].icon}
                  size={24}
                  color={isActive ? colors.accentDeep : colors.outline}
                />
                {isActive ? (
                  <Animated.Text
                    entering={FadeIn.duration(motion.duration.fast)}
                    exiting={FadeOut.duration(motion.duration.instant)}
                    style={styles.tabLabel}
                    numberOfLines={1}
                  >
                    {TABS[index].label}
                  </Animated.Text>
                ) : null}
                {hasBadge && <View style={styles.badge} />}
              </Animated.View>
            </PressableScale>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabHitbox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 9999,
    position: 'relative',
  },
  activeTab: {
    paddingHorizontal: 18,
    // Halo neon acompanha a aba ativa.
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  tabLabel: {
    ...typography.labelMd,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.accentDeep,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: '#fff',
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

