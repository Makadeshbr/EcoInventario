import { Tabs, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography } from '@/theme/tokens';

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
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                activeOpacity={0.8}
                style={styles.tab}
              >
                <View style={[styles.scannerButton, isActive && styles.scannerButtonActive]}>
                  <MaterialIcons name="qr-code-scanner" size={26} color={colors.onPrimary} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  scannerButtonActive: {
    backgroundColor: colors.secondary,
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
