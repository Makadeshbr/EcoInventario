import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme/tokens';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Sobre o App' }} />
      <View style={styles.content}>

        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="eco" size={64} color={colors.primary} />
          </View>
          <Text style={styles.appName}>EcoInventario</Text>
          <Text style={styles.appVersion}>Versão 1.0.0 (Build 42)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sobre</Text>
          <Text style={styles.cardText}>
            Aplicativo de gestão e inventário de ativos ambientais, desenvolvido para uso em campo com suporte offline completo.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suporte Técnico</Text>
          <View style={styles.supportRow}>
            <MaterialIcons name="email" size={18} color={colors.outline} />
            <Text style={styles.supportText}>suporte@ecoinventario.com</Text>
          </View>
          <View style={styles.supportRow}>
            <MaterialIcons name="phone" size={18} color={colors.outline} />
            <Text style={styles.supportText}>0800 123 4567</Text>
          </View>
        </View>

        <Text style={styles.footerText}>Desenvolvido com 💚 por EcoTech Solutions</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.marginMobile,
    gap: spacing.sm,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: 4,
  },
  appVersion: {
    ...typography.bodyMd,
    color: colors.outline,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.default,
    padding: spacing.marginMobile,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    ...typography.titleMd,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 24,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  supportText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  footerText: {
    ...typography.labelSm,
    color: colors.outline,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
