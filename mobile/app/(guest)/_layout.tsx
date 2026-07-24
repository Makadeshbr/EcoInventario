import { Tabs, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography, glass, gradients, motion } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';

const TABS = [
  { name: '(map)', label: 'Mapa', icon: 'map' as const },
  { name: '(scanner)', label: 'Scanner', icon: 'qr-code-scanner' as const },
  { name: '(about)', label: 'Sobre', icon: 'info' as const },
] as const;

function GuestTabBar({ state, navigation }: BottomTabBarProps) {
  const pathname = usePathname();
  
  // Esconde o TabBar se estiver em uma tela de detalhe (asset/[id])
  const isDetailScreen = pathname.includes('/asset/');
  if (isDetailScreen) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.pill}>
        <BlurView intensity={glass.blur} tint={glass.tint} style={StyleSheet.absoluteFill} />
        {TABS.map((tab, index) => {
          const isActive = state.index === index;
          const isScanner = tab.name === '(scanner)';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index]?.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(tab.name as never);
            }
          };

          if (isScanner) {
            return (
              <PressableScale
                key={tab.name}
                onPress={onPress}
                scaleTo={motion.scale.pressInStrong}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                <View style={[styles.scannerButton, isActive && styles.scannerButtonActive]}>
                  <LinearGradient
                    colors={gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <MaterialIcons name="qr-code-scanner" size={26} color={colors.accentDeep} />
                </View>
              </PressableScale>
            );
          }

          return (
            <PressableScale
              key={tab.name}
              onPress={onPress}
              scaleTo={motion.scale.pressInStrong}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

export default function GuestLayout() {
  return (
    <Tabs
      tabBar={(props) => <GuestTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(map)" />
      <Tabs.Screen name="(scanner)" />
      <Tabs.Screen name="(about)" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '88%',
    maxWidth: 420,
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: glass.bgStrong,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.gutter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  scannerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  scannerButtonActive: {
    shadowOpacity: 0.75,
    shadowRadius: 20,
  },
  tabLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tabLabelActive: {
    ...typography.labelSm,
    color: colors.primary,
  },
});
