import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme/tokens';

export default function WelcomeScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/plant-hero.png')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Overlay leve pra contraste */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        <View style={styles.content}>
          
          {/* HERO */}
          <View style={styles.heroArea}>
            
            {/* Badge esquerdo */}
            <View style={[styles.glassBadge, styles.badgeLeft]}>
              <MaterialIcons name="eco" size={18} color={colors.onSurface} />
              <Text style={styles.badgeLabel}>VITALITY</Text>
            </View>

            {/* Badge direito */}
            <View style={[styles.glassBadge, styles.badgeRight]}>
              <MaterialIcons name="location-on" size={18} color={colors.onSurface} />
              <Text style={styles.badgeLabel}>ZONAS</Text>
            </View>

          </View>

          {/* AÇÕES */}
          <View style={styles.actionsArea}>
            <Text style={styles.title}>
              Bem-vindo ao{'\n'}EcoInventário
            </Text>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/(guest)/(map)')}
                activeOpacity={0.9}
              >
                <MaterialIcons name="explore" size={20} color={colors.onPrimary} />
                <Text style={styles.primaryButtonText}>Explorar Mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.9}
              >
                <Text style={styles.secondaryButtonText}>
                  Entrar como Profissional
                </Text>
              </TouchableOpacity>
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

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.25)',
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

  // 🔥 substituto do BlurView (seguro)
  glassBadge: {
    position: 'absolute',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    minWidth: 80,
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

  title: {
    ...typography.headlineLg,
    color: colors.onBackground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  buttons: {
    width: '100%',
    gap: spacing.sm,
  },

  primaryButton: {
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },

  primaryButtonText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },

  secondaryButton: {
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.4)',
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