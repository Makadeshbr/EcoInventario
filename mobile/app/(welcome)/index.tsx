import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography, gradients, glass } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { Icon, type IconName } from '@/components/ui/icon';

/**
 * Scrim vertical: mantém a foto viva no topo e cria contraste real na base,
 * onde ficam título e botões. Substitui o véu branco chapado que lavava a imagem.
 */
const SCRIM_COLORS = [
  'rgba(247,250,245,0)',
  'rgba(247,250,245,0.5)',
  'rgba(245,239,228,0.96)',
] as const;

function GlassBadge({
  icon,
  label,
  style,
  delay,
}: {
  icon: IconName;
  label: string;
  style: object;
  delay: number;
}) {
  return (
    <FadeInView delay={delay} from="up" style={[styles.glassBadge, style]}>
      <BlurView intensity={glass.blur} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <Icon name={icon} size={18} color={colors.onSurface} />
      <Text style={styles.badgeLabel}>{label}</Text>
    </FadeInView>
  );
}

export default function WelcomeScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/plant-hero.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={[0, 0.45, 0.78]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.container}>
        <View style={styles.content}>
          {/* HERO */}
          <View style={styles.heroArea}>
            <GlassBadge icon="leaf" label="VITALITY" style={styles.badgeLeft} delay={320} />
            <GlassBadge icon="place" label="ZONAS" style={styles.badgeRight} delay={440} />
          </View>

          {/* AÇÕES */}
          <View style={styles.actionsArea}>
            <FadeInView from="up" delay={80}>
              <Text style={styles.title}>
                Bem-vindo ao{'\n'}EcoInventário
              </Text>
            </FadeInView>

            <View style={styles.buttons}>
              <FadeInView delay={160}>
                <PressableScale
                  style={styles.primaryButton}
                  scaleTo={0.96}
                  onPress={() => router.push('/(guest)/(map)')}
                >
                  <LinearGradient
                    colors={gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Icon name="explore" size={20} color={colors.accentDeep} />
                  <Text style={styles.primaryButtonText}>Explorar Mapa</Text>
                </PressableScale>
              </FadeInView>

              <FadeInView delay={240}>
                <PressableScale
                  style={styles.secondaryButton}
                  scaleTo={0.96}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.secondaryButtonText}>
                    Entrar como Profissional
                  </Text>
                </PressableScale>
              </FadeInView>
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },

  heroArea: {
    flex: 1,
    justifyContent: 'center',
  },

  glassBadge: {
    position: 'absolute',
    alignItems: 'center',
    overflow: 'hidden',
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    minWidth: 80,
    shadowColor: glass.shadowTint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },

  badgeLeft: {
    top: '15%',
    left: 0,
  },

  badgeRight: {
    bottom: '20%',
    right: 0,
  },

  badgeLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },

  actionsArea: {
    width: '100%',
    alignItems: 'center',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentDim,
  },
  brandText: {
    ...typography.labelMd,
    letterSpacing: 2.2,
    color: colors.secondary,
  },
  title: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 46,
    color: colors.onBackground,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.base,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },

  buttons: {
    width: '100%',
    gap: spacing.sm,
  },

  primaryButton: {
    height: 56,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },

  primaryButtonText: {
    ...typography.labelLg,
    color: colors.accentDeep,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  secondaryButton: {
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    ...typography.labelLg,
    color: colors.onBackground,
  },
});
