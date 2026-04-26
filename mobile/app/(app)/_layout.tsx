// TODO: Sem teste — scaffolding
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Redirect href="/(welcome)" />;
  }
  return (
    <Tabs>
      <Tabs.Screen name="(home)/index" options={{ title: 'Home' }} />
      <Tabs.Screen name="(assets)" options={{ title: 'Assets' }} />
      <Tabs.Screen name="(scanner)/index" options={{ title: 'Scanner' }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
