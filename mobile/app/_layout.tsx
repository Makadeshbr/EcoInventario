// TODO: Sem teste — config/infra
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Animated,
  StyleSheet,
  Image,
  View,
  StatusBar,
} from 'react-native';
import { getDb } from '@/db/database';
import { runMigrations } from '@/db/migrations';

// Mantém o splash nativo visível enquanto preparamos a transição JS
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();


// Duração da animação de saída (ms)
const FADE_DURATION = 900;
// Tempo mínimo de exibição da splash (branding moment)
const MIN_SHOW_MS = 2200;

function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Anima: fade-out + leve scale-up (saída premium)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.05,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View
      style={[styles.splashContainer, { opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <Image
        source={require('../assets/images/SplashScreen.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [dbReady, setDbReady] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const readyTime = useRef<number>(0);

  // 1. Roda migrações do banco
  useEffect(() => {
    runMigrations(getDb())
      .catch(console.error)
      .finally(() => setDbReady(true));
  }, []);

  // 2. Quando fontes + DB estiverem prontos, esconde o splash nativo
  //    e marca o momento para garantir MIN_SHOW_MS de branding
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (!dbReady) return;

    readyTime.current = Date.now();
    SplashScreen.hideAsync();

    // Garante branding mínimo antes de iniciar o fade-out JS
    const elapsed = Date.now() - readyTime.current;
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);

    const timer = setTimeout(() => setAppReady(true), remaining);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError, dbReady]);

  // Enquanto fontes não carregam, não renderiza nada (splash nativo cobre)
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" translucent={false} />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(welcome)" />
        <Stack.Screen name="(guest)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>

      {/* Splash JS animado — fica na frente até splashDone */}
      {!splashDone && appReady && (
        <AnimatedSplash onDone={() => setSplashDone(true)} />
      )}

      {/* Placeholder opaco enquanto ainda não podemos animar */}
      {!splashDone && !appReady && (
        <View style={styles.splashContainer} pointerEvents="none">
          <Image
            source={require('../assets/images/SplashScreen.png')}
            style={styles.splashImage}
            resizeMode="cover"
          />
        </View>
      )}
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    // Cobre a tela INTEIRA incluindo status bar e navigation bar
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#F5F0E8',
  },
  splashImage: {
    // Preenche todo o container absoluteFill
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
});
