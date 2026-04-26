// TODO: Sem teste — scaffolding (lógica testada em use-login.test.ts)
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { loginSchema } from '@/features/auth/schemas';
import { useLogin } from '@/features/auth/hooks/use-login';
import { colors, spacing, radius, typography } from '@/theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="eco" size={32} color={colors.onSecondaryContainer} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Acesso Profissional</Text>
              <Text style={styles.subtitle}>Sistemas de controle e monitoramento</Text>
            </View>
          </View>

          {/* Erro de API */}
          {error && (
            <View style={styles.apiError}>
              <Text style={styles.apiErrorText}>{error}</Text>
            </View>
          )}

          {/* Formulário */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={[styles.inputRow, emailError ? styles.inputError : null]}>
                <MaterialIcons name="mail" size={20} color={colors.outline} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="credencial@ecoinventario.com"
                  placeholderTextColor={colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="input-email"
                />
              </View>
              {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
            </View>

            {/* Senha */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={[styles.inputRow, passwordError ? styles.inputError : null]}>
                <MaterialIcons name="lock" size={20} color={colors.outline} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.outline}
                  secureTextEntry
                  testID="input-password"
                />
              </View>
              {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
            </View>

            {/* Botão Entrar */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={isLoading}
              activeOpacity={0.9}
              testID="btn-entrar"
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Entrando…' : 'Entrar'}
              </Text>
            </TouchableOpacity>

            {/* Voltar */}
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(welcome)')}
              testID="btn-voltar"
            >
              <Text style={styles.backLinkText}>← Voltar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
  },
  blob: {
    position: 'absolute',
    borderRadius: radius.full,
    zIndex: 0,
  },
  blobTopRight: {
    width: '50%',
    aspectRatio: 1,
    top: '-10%',
    right: '-5%',
    backgroundColor: colors.secondaryContainer,
    opacity: 0.24,
  },
  blobBottomLeft: {
    width: '60%',
    aspectRatio: 1,
    bottom: '-15%',
    left: '-10%',
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.8,
  },
  keyboardView: {
    flex: 1,
    zIndex: 1,
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
    gap: spacing.lg,
    width: '100%',
    maxWidth: 420,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerText: {
    alignItems: 'center',
    gap: spacing.xs * 2,
  },
  title: {
    ...typography.display,
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  apiError: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  apiErrorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
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
  inputError: {
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
  },
  submitButton: {
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.gutter,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  backLinkText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
