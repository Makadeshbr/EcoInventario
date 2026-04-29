import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@/theme/tokens';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const CONTACT_EMAIL = 'contato@ecoinventario.com.br';

export default function SobreScreen() {
  return (
    <View style={styles.root}>
      {/* Decoração de fundo */}
      <View style={styles.bgBlurTopRight} />
      <View style={styles.bgBlurBottomLeft} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="eco" size={28} color={colors.secondary} />
          <Text style={styles.headerTitle}>EcoInventário</Text>
          <Text style={styles.headerVersion}>v{APP_VERSION}</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Seção Missão */}
        <View style={styles.heroSection}>
          <Text style={styles.missionLabel}>Nossa Missão</Text>
          <Text style={styles.missionTitle}>
            Conectando tecnologia à preservação natural.
          </Text>
          <View style={styles.accentBar} />
          <Text style={styles.missionBody}>
            O EcoInventário nasceu da urgência em documentar, analisar e proteger
            a biodiversidade global através de um ecossistema digital limpo,
            preciso e colaborativo. Acreditamos que a clareza dos dados é o
            primeiro passo para a conservação efetiva.
          </Text>
        </View>

        {/* Cards Bento */}
        <View style={styles.bentoRow}>
          {/* Card Impacto */}
          <View style={[styles.card, styles.cardLarge]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="public" size={28} color={colors.secondary} />
              <Text style={styles.cardTitle}>Impacto</Text>
            </View>
            <Text style={styles.cardBody}>
              Nossa plataforma auxilia pesquisadores a catalogar espécies em
              áreas de risco, gerando dados cruciais para políticas ambientais.
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>45k+</Text>
                <Text style={styles.statLabel}>Espécies{'\n'}Catalogadas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>120</Text>
                <Text style={styles.statLabel}>Técnicos{'\n'}Ativos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Contato */}
        <View style={[styles.card, styles.contactCard]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="mail-outline" size={24} color={colors.secondary} />
            <Text style={styles.cardTitle}>Contato</Text>
          </View>
          <Text style={styles.cardBody}>
            Dúvidas, sugestões ou parcerias? Fale conosco.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.contactEmail}>{CONTACT_EMAIL}</Text>
            <MaterialIcons name="open-in-new" size={16} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* CTA Profissional */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaHint}>Faz parte de uma instituição parceira?</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="login" size={20} color={colors.onPrimary} />
            <Text style={styles.ctaBtnText}>Login Profissional</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            EcoInventário v{APP_VERSION} · Todos os direitos reservados
          </Text>
        </View>

        {/* Espaço para a tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
  },
  bgBlurTopRight: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(179,205,177,0.3)', // secondaryFixedDim / 30
  },
  bgBlurBottomLeft: {
    position: 'absolute',
    bottom: '20%',
    left: '-10%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(157,216,80,0.2)', // tertiaryFixedDim / 20
  },
  safeArea: {
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.primary,
    letterSpacing: -0.4,
  },
  headerVersion: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile,
  },

  // Hero
  heroSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  missionLabel: {
    ...typography.labelLg,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  missionTitle: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.primary,
    lineHeight: 40,
    letterSpacing: -0.64,
    marginBottom: spacing.sm,
  },
  accentBar: {
    width: 56,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.tertiaryFixed,
    marginBottom: spacing.md,
  },
  missionBody: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    lineHeight: 28,
  },

  // Cards
  bentoRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.default,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  cardLarge: {
    width: '100%',
  },
  contactCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  cardBody: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.base,
  },
  statNumber: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.primary,
    lineHeight: 44,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactEmail: {
    ...typography.labelLg,
    color: colors.secondary,
    textDecorationLine: 'underline',
  },

  // CTA
  ctaSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  ctaHint: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaBtnText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.base,
  },
  footerText: {
    ...typography.labelSm,
    color: colors.outlineVariant,
    textAlign: 'center',
  },
});
