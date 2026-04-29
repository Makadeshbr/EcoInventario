import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { Button } from '@/components/ui/button';

export default function SettingsScreen() {
  function handleClearCache() {
    Alert.alert(
      'Limpar Cache',
      'Tem certeza? Isso não apagará seus dados não sincronizados, apenas arquivos temporários.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: () => Alert.alert('Sucesso', 'Cache limpo!') },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Configurações' }} />
      <View style={styles.content}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronização</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Sincronização Automática</Text>
              <Text style={styles.rowSubtitle}>Sincroniza dados quando há conexão ativa.</Text>
            </View>
            <Switch value={true} onValueChange={() => {}} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mídia</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Alta Qualidade</Text>
              <Text style={styles.rowSubtitle}>Fotos em alta resolução. Consome mais dados.</Text>
            </View>
            <Switch value={false} onValueChange={() => {}} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Armazenamento</Text>
          <Button
            title="Limpar Cache Local"
            variant="outline"
            onPress={handleClearCache}
            style={{ borderColor: colors.error }}
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.marginMobile,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.marginMobile,
    borderRadius: radius.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rowTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
});
