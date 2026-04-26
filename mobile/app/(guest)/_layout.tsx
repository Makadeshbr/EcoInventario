// TODO: Sem teste — scaffolding
import { Tabs } from 'expo-router';

export default function GuestLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="(map)" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="(scanner)/index" options={{ title: 'Scanner' }} />
      <Tabs.Screen name="(about)/index" options={{ title: 'Sobre' }} />
    </Tabs>
  );
}
