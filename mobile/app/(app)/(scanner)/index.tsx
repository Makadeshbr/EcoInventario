import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { getAssetByQR } from '@/features/assets/repository';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth-store';

type ScanMode = 'idle' | 'scanning' | 'found' | 'notfound';

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
      // Permite novo scan após 2s se não encontrou
      setTimeout(() => {
        if (mode === 'notfound') {
          isProcessing.current = false;
          setMode('idle');
          setScannedText('');
        }
      }, 2000);
    }
  }

  // ── Permissão ainda carregando ──────────────────────────────────────────────
  if (!permission) return <View style={styles.container} />;

  // ── Sem permissão ───────────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionSafe}>
        <View style={styles.centerBox}>
          <MaterialIcons name="camera-alt" size={64} color={colors.outline} />
          <Text style={styles.centerTitle}>Permissão de Câmera</Text>
          <Text style={styles.centerText}>
            Precisamos acessar a câmera para escanear QR codes dos ativos.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Permitir Câmera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Acesso restrito ─────────────────────────────────────────────────────────
  if (!isProfessional) {
    return (
      <SafeAreaView style={styles.permissionSafe}>
        <View style={styles.centerBox}>
          <MaterialIcons name="lock" size={64} color={colors.outline} />
          <Text style={styles.centerTitle}>Acesso Restrito</Text>
          <Text style={styles.centerText}>
            O scanner profissional está disponível apenas para técnicos e administradores.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Status visual ───────────────────────────────────────────────────────────
  const statusColor =
    mode === 'found' ? colors.secondary :
    mode === 'notfound' ? colors.error :
    colors.onPrimary;

  const statusLabel =
    mode === 'scanning' ? 'Buscando...' :
    mode === 'found' ? '✓ Ativo encontrado!' :
    mode === 'notfound' ? '✗ Ativo não encontrado' :
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
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusLabel}
          </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Sem permissão / acesso restrito
  permissionSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  },
  scanWindowSuccess: {
    backgroundColor: 'rgba(77,100,77,0.2)',
  },
  scanWindowError: {
    backgroundColor: 'rgba(186,26,26,0.2)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  statusLabel: {
    ...typography.titleMd,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: 4 },
});
