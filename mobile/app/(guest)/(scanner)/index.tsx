import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { resolveQRCode } from '@/features/public/api';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const FRAME_SIZE = Math.min(SCREEN_W * 0.7, 280);

type ScanState = 'idle' | 'scanning' | 'loading' | 'unavailable' | 'error';

export default function ScannerVisitanteScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const scannedRef = useRef(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Animação da linha de scan
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scanLineAnim]);

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 2],
  });

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scannedRef.current || scanState === 'loading') return;
      scannedRef.current = true;
      setScanState('loading');

      try {
        const result = await resolveQRCode(data);
        if (result.is_available && result.asset_id) {
          router.push({
            pathname: '/(guest)/(map)/asset/[id]',
            params: { id: result.asset_id },
          });
          // Deixa um tempo antes de resetar, pois a navegação ocorre
          setTimeout(() => {
            scannedRef.current = false;
            setScanState('idle');
          }, 2000);
        } else {
          setScanState('unavailable');
          setTimeout(() => {
            scannedRef.current = false;
            setScanState('idle');
          }, 3000);
        }
      } catch {
        setErrorMsg('Não foi possível verificar o QR Code. Verifique sua conexão.');
        setScanState('error');
        setTimeout(() => {
          scannedRef.current = false;
          setScanState('idle');
          setErrorMsg('');
        }, 3000);
      }
    },
    [scanState]
  );

  const resetScanner = () => {
    scannedRef.current = false;
    setScanState('idle');
    setErrorMsg('');
  };

  // Permissão não solicitada ainda
  if (!permission) {
    return <View style={styles.root} />;
  }

  // Permissão negada
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <MaterialIcons name="camera-alt" size={56} color={colors.secondary} />
        <Text style={styles.permTitle}>Câmera necessária</Text>
        <Text style={styles.permBody}>
          O scanner precisa de acesso à câmera para ler QR Codes dos ativos.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir acesso à câmera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isBusy = scanState === 'loading';
  const feedbackMsg =
    scanState === 'unavailable'
      ? 'Ativo não disponível para visualização'
      : scanState === 'error'
      ? errorMsg
      : scanState === 'loading'
      ? 'Verificando ativo...'
      : 'Aponte para o QR Code do ativo';

  const feedbackColor =
    scanState === 'unavailable' || scanState === 'error' ? colors.error : colors.onPrimary;
  const feedbackBg =
    scanState === 'unavailable' || scanState === 'error'
      ? colors.errorContainer
      : 'rgba(0,0,0,0.75)';

  return (
    <View style={styles.root}>
      {/* Feed da câmera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isBusy ? undefined : handleBarcodeScanned}
      />

      {/* Overlay fosco: topo */}
      <View style={styles.overlayTop} />

      {/* Overlay fosco: linha do meio (esquerda + frame + direita) */}
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />
        <View style={[styles.frame, styles.frameHidden]}>
          {/* Cantos do frame */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {/* Linha de scan animada */}
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
          />
        </View>
        <View style={styles.overlaySide} />
      </View>

      {/* Overlay fosco: base */}
      <View style={styles.overlayBottom}>
        {/* Mensagem de feedback */}
        <View style={[styles.feedbackPill, { backgroundColor: feedbackBg }]}>
          {isBusy && (
            <MaterialIcons name="hourglass-top" size={16} color={colors.onPrimary} />
          )}
          <Text style={[styles.feedbackText, { color: feedbackColor }]}>
            {feedbackMsg}
          </Text>
        </View>

        {(scanState === 'unavailable' || scanState === 'error') && (
          <TouchableOpacity style={styles.retryBtn} onPress={resetScanner}>
            <Text style={styles.retryText}>Escanear novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(255,255,255,0.45)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.marginMobile,
    gap: spacing.md,
  },
  permTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    textAlign: 'center',
  },
  permBody: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  permBtnText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },

  // Overlay sections
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  // Faz o frame transparente (não tem background — mostra a câmera)
  frameHidden: {
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },

  // Cantos do frame
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.tertiaryFixed,
    borderStyle: 'solid',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },

  // Linha de scan
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.tertiaryFixed,
    shadowColor: colors.tertiaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 1,
  },

  // Feedback
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  feedbackText: {
    ...typography.labelLg,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  retryText: {
    ...typography.labelSm,
    color: colors.onSurface,
  },
});
