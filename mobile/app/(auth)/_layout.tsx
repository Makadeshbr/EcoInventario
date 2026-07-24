// TODO: Sem teste — scaffolding
import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/theme/navigation';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Redirect href="/(app)/(home)" />;
  }
  return <Stack screenOptions={stackScreenOptions} />;
}
