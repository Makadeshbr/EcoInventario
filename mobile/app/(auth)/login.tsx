// TODO: Sem teste — scaffolding (lógica testada em use-login.test.ts)
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { loginSchema } from '@/features/auth/schemas';
import { useLogin } from '@/features/auth/hooks/use-login';
import { colors, spacing, radius, typography, gradients } from '@/theme/tokens';
import { GradientBackground } from '@/components/ui/gradient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [focused, setFocused] = useState<Field | null>(null);

  const { handleLogin, isLoading, error } = useLogin();

  function onSubmit() {
    setEmailError(null);
    setPasswordError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setEmailError(errs.email?.[0] ?? null);
      setPasswordError(errs.password?.[0] ?? null);
      return;
    }
    handleLogin(result.data);
  }

  /** Borda do campo: erro > foco > repouso. */
  function fieldStyle(field: Field, hasError: boolean) {
    if (hasError) return styles.inputErrorState;
    return focused === field ? styles.inputFocused : null;
  }

  return (
    <GradientBackground>
      {/* No Android o adjustResize nativo já reposiciona o conteúdo; usar
          behavior="height" aqui soma dois ajustes e o teclado fecha sozinho. */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <FadeInView from="up" style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="eco" size={32} color={colors.accentDeep} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Acesso Profissional</Text>
              <Text style={styles.subtitle}>Sistemas de controle e monitoramento</Text>
            </View>
          </FadeInView>

          {/* Erro de API */}
          {error && (
            <FadeInView style={styles.apiError}>
              <MaterialIcons name="error-outline" size={18} color={colors.onErrorContainer} />
              <Text style={styles.apiErrorText}>{error}</Text>
            </FadeInView>
          )}

          {/* Formulário em painel de vidro.
              Sem animação de entrada aqui de propósito: um container animado
              com translate desloca o conteúdo mas mantém a área de toque na
              posição antiga, e o toque cai no campo errado. */}
          <View style={styles.formWrap}>
            <GlassCard strong style={styles.form} radius={32}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>E-mail</Text>
                <View style={[styles.inputRow, fieldStyle('email', !!emailError)]}>
                  <MaterialIcons
                    name="mail"
                    size={20}
                    color={focused === 'email' ? colors.secondary : colors.outline}
                  />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="credencial@ecoinventario.com"
                    placeholderTextColor={colors.outline}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="input-email"
                  />
                </View>
                <Text style={styles.fieldError} numberOfLines={1}>
                  {emailError ?? ''}
                </Text>
              </View>

              {/* Senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={[styles.inputRow, fieldStyle('password', !!passwordError)]}>
                  <MaterialIcons
                    name="lock"
                    size={20}
                    color={focused === 'password' ? colors.secondary : colors.outline}
                  />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    placeholder="••••••••"
                    placeholderTextColor={colors.outline}
                    secureTextEntry
                    testID="input-password"
                  />
                </View>
                <Text style={styles.fieldError} numberOfLines={1}>
                  {passwordError ?? ''}
                </Text>
              </View>

              {/* Botão Entrar */}
              <PressableScale
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={isLoading}
                scaleTo={0.96}
                testID="btn-entrar"
              >
                <LinearGradient
                  colors={gradients.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {isLoading ? <ActivityIndicator size="small" color={colors.accentDeep} /> : null}
                <Text style={styles.submitButtonText}>
                  {isLoading ? 'Entrando…' : 'Entrar'}
                </Text>
              </PressableScale>
            </GlassCard>
          </View>

          {/* Voltar */}
          <FadeInView delay={200}>
            <PressableScale
              style={styles.backLink}
              haptic={false}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(welcome)'))}
              testID="btn-voltar"
            >
              <Text style={styles.backLinkText}>← Voltar</Text>
            </PressableScale>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 420,
    marginBottom: spacing.md,
  },
  // Anel neon: assina a marca já na entrada, sem poluir o resto da tela.
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: 'rgba(183,245,105,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(183,245,105,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 6,
  },
  headerText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.headlineLg,
    fontSize: 34,
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  apiError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.default,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  apiErrorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    flex: 1,
  },
  formWrap: {
    width: '100%',
    maxWidth: 420,
  },
  form: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.base,
  },
  label: {
    ...typography.labelLg,
    color: colors.onSurface,
    paddingLeft: spacing.gutter,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingLeft: spacing.marginMobile,
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  inputErrorState: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  fieldError: {
    ...typography.labelSm,
    color: colors.error,
    paddingLeft: spacing.gutter,
    // Altura reservada mesmo sem erro: a mensagem aparecer não pode empurrar
    // o layout, senão as áreas de toque se deslocam sob o dedo do usuário.
    minHeight: 16,
  },
  submitButton: {
    height: 64,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.labelLg,
    color: colors.accentDeep,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.5,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  backLinkText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
