import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, typography, radius, motion } from '@/theme/tokens';
import { GradientBackground } from '@/components/ui/gradient-background';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FadeInView } from '@/components/ui/fade-in-view';
import { getAssetByQR } from '@/features/assets/repository';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth-store';

type ScanMode = 'idle' | 'scanning' | 'found' | 'notfound';

const SCAN_SWEEP_MS = 2200;

/** Linha de varredura: sinaliza que a câmera está ativa e procurando. */
function ScanLine({ active }: { active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: SCAN_SWEEP_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * (WINDOW - SCAN_LINE_HEIGHT) }],
    opacity: 0.35 + progress.value * 0.5,
  }));

  if (!active) return null;

  return (
    <Animated.View style={[styles.scanLine, animatedStyle]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', colors.accent, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const STATUS_ICON: Record<ScanMode, keyof typeof MaterialIcons.glyphMap> = {
  idle: 'qr-code-scanner',
  scanning: 'sync',
  found: 'check-circle',
  notfound: 'error-outline',
};

export default function ScannerProfissionalScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>('idle');
  const [scannedText, setScannedText] = useState('');
  // isCameraActive controla se a CameraView está montada.
  // Quando a aba perde o foco a câmera é desmontada (libera o hardware),
  // quando volta a ser focada a câmera é remontada.
  const [isCameraActive, setIsCameraActive] = useState(false);
  const isProcessing = useRef(false);

  const role = useAuthStore((s) => s.user?.role);
  const isProfessional = role === 'tech' || role === 'admin';

  // Libera e readquire a câmera a cada vez que a aba é focalizada
  useFocusEffect(
    useCallback(() => {
      setIsCameraActive(true);
      isProcessing.current = false;
      setMode('idle');
      setScannedText('');

      return () => {
        // Tela perdeu o foco: desmonta a câmera para liberar o hardware
        setIsCameraActive(false);
      };
    }, [])
  );

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (isProcessing.current || mode !== 'idle') return;
    isProcessing.current = true;
    setMode('scanning');
    setScannedText(data);

    try {
      // 1. Busca local primeiro (offline-first)
      const localAsset = await getAssetByQR(data);
      if (localAsset) {
        setMode('found');
        setTimeout(() => {
          router.push(`/(app)/(assets)/${localAsset.id}` as any);
        }, 500);
        return;
      }

      // 2. Fallback: busca na API
      try {
        const response = await api.get(`assets/qr/${encodeURIComponent(data)}`).json<{ id: string }>();
        if (response?.id) {
          setMode('found');
          setTimeout(() => {
            router.push(`/(app)/(assets)/${response.id}` as any);
          }, 500);
          return;
        }
      } catch {
        // API também não encontrou
      }

      setMode('notfound');
    } finally {
      // Reseta para idle após 2s — isProcessing.current impede reentrada antes disso.
      setTimeout(() => {
        isProcessing.current = false;
        setMode('idle');
        setScannedText('');
      }, 2000);
    }
  }

  // ── Permissão ainda carregando ──────────────────────────────────────────────
  if (!permission) return <View style={styles.container} />;

  // ── Sem permissão ───────────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.permissionSafe}>
          <FadeInView from="up" style={styles.centerBox}>
            <View style={styles.centerRing}>
              <MaterialIcons name="camera-alt" size={56} color={colors.secondary} />
            </View>
            <Text style={styles.centerTitle}>Permissão de Câmera</Text>
            <Text style={styles.centerText}>
              Precisamos acessar a câmera para escanear QR codes dos ativos.
            </Text>
            <PressableScale style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Permitir Câmera</Text>
            </PressableScale>
          </FadeInView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Acesso restrito ─────────────────────────────────────────────────────────
  if (!isProfessional) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.permissionSafe}>
          <FadeInView from="up" style={styles.centerBox}>
            <View style={styles.centerRing}>
              <MaterialIcons name="lock" size={56} color={colors.outline} />
            </View>
            <Text style={styles.centerTitle}>Acesso Restrito</Text>
            <Text style={styles.centerText}>
              O scanner profissional está disponível apenas para técnicos e administradores.
            </Text>
          </FadeInView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Status visual ───────────────────────────────────────────────────────────
  const statusColor =
    mode === 'found' ? colors.accent :
    mode === 'notfound' ? '#ff8a80' :
    colors.onPrimary;

  const statusLabel =
    mode === 'scanning' ? 'Buscando...' :
    mode === 'found' ? 'Ativo encontrado!' :
    mode === 'notfound' ? 'Ativo não encontrado' :
    'Aponte para o QR Code do ativo';

  const scanWindowStyle = [
    styles.scanWindow,
    mode === 'found' && styles.scanWindowSuccess,
    mode === 'notfound' && styles.scanWindowError,
  ];

  return (
    <View style={styles.container}>
      {/* Câmera — só montada quando isCameraActive=true */}
      {isCameraActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={mode === 'idle' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}

      {/* Overlay escuro com janela de scan */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={scanWindowStyle}>
            <ScanLine active={mode === 'idle'} />
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {/* key força a re-entrada da animação a cada mudança de estado */}
          <FadeInView key={mode} from="up" duration={motion.duration.fast} style={styles.statusPill}>
            <MaterialIcons name={STATUS_ICON[mode]} size={18} color={statusColor} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </FadeInView>
          {scannedText ? (
            <Text style={styles.scannedCode} numberOfLines={1}>
              {scannedText}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const WINDOW = 260;
const CORNER = 24;
const THICKNESS = 3;
const SCAN_LINE_HEIGHT = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Sem permissão / acesso restrito
  permissionSafe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  centerRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(183,245,105,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(183,245,105,0.5)',
    marginBottom: spacing.sm,
  },
  centerTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  centerText: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  primaryButtonText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: WINDOW,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanWindow: {
    width: WINDOW,
    height: WINDOW,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  scanWindowSuccess: {
    backgroundColor: 'rgba(183,245,105,0.22)',
  },
  scanWindowError: {
    backgroundColor: 'rgba(186,26,26,0.2)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCAN_LINE_HEIGHT,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16,32,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusLabel: {
    ...typography.titleMd,
    textAlign: 'center',
  },
  scannedCode: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
    paddingHorizontal: spacing.marginMobile,
    textAlign: 'center',
  },

  // Cantos da janela de scan
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: 4 },
});
