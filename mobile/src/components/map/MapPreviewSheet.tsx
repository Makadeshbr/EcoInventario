import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius, typography, glass, gradients, motion } from '@/theme/tokens';
import { PressableScale } from '@/components/ui/pressable-scale';
import { iconForAssetType } from '@/utils/asset-icon';
import type { PublicAssetMarker } from '@/features/public/types';
import { Icon, type IconName } from '@/components/ui/icon';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = 232;
/** Arrasto para baixo além disto fecha em vez de voltar ao lugar. */
const DISMISS_DISTANCE = 70;
const DISMISS_VELOCITY = 700;

interface MapPreviewSheetProps {
  asset: PublicAssetMarker | null;
  onClose: () => void;
  onOpenDetail: (assetId: string) => void;
}

/**
 * Prévia do ativo ao tocar num marcador. Substitui a navegação imediata para a
 * tela cheia: o usuário vê o essencial sem perder o mapa de vista (padrão de
 * apps de mapa) e só abre o detalhe se quiser.
 */
export function MapPreviewSheet({ asset, onClose, onOpenDetail }: MapPreviewSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (asset) {
      dragY.value = 0;
      translateY.value = withSpring(0, motion.spring.soft);
      return;
    }
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: motion.duration.fast });
  }, [asset, translateY, dragY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Só acompanha o arrasto para baixo; para cima a folha não cresce.
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dragY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        dragY.value = withTiming(SHEET_HEIGHT, { duration: motion.duration.fast });
        runOnJS(onClose)();
        return;
      }
      dragY.value = withSpring(0, motion.spring.snappy);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  if (!asset) return null;

  const typeName = asset.asset_type?.name ?? 'Ativo';
  const icon = iconForAssetType(typeName);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }, animatedStyle]}
      >
        <BlurView intensity={glass.blurStrong} tint={glass.tint} style={StyleSheet.absoluteFill} />
        <View style={styles.tintLayer} />

        {/* Alça: sinaliza que a folha é arrastável */}
        <View style={styles.handle} />

        <View style={styles.row}>
          <View style={styles.thumbWrap}>
            {asset.thumbnail_url ? (
              <ExpoImage
                source={asset.thumbnail_url}
                style={styles.thumb}
                contentFit="cover"
                transition={220}
              />
            ) : (
              <LinearGradient
                colors={gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.thumb, styles.thumbFallback]}
              >
                <Icon name={icon} size={34} color={colors.accentDeep} />
              </LinearGradient>
            )}
          </View>

          <View style={styles.info}>
            <View style={styles.typePill}>
              <Icon name={icon} size={13} color={colors.accentDeep} />
              <Text style={styles.typePillText} numberOfLines={1}>
                {typeName.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.title} numberOfLines={1}>
              {typeName}
            </Text>

            <View style={styles.metaRow}>
              <Icon name="place" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText} numberOfLines={1}>
                {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name="qrCode" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="middle">
                {asset.qr_code}
              </Text>
            </View>
          </View>

          <PressableScale
            style={styles.closeBtn}
            scaleTo={0.9}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar prévia"
          >
            <Icon name="close" size={18} color={colors.onSurfaceVariant} />
          </PressableScale>
        </View>

        <PressableScale
          style={styles.cta}
          scaleTo={0.97}
          onPress={() => onOpenDetail(asset.id)}
        >
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>Ver detalhes</Text>
          <Icon name="forward" size={18} color={colors.accentDeep} />
        </PressableScale>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    overflow: 'hidden',
    paddingTop: spacing.base,
    paddingHorizontal: spacing.marginMobile,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: glass.border,
    shadowColor: glass.shadowTint,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glass.bgStrong,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(68,71,72,0.25)',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  thumbWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  thumb: {
    width: 84,
    height: 84,
    backgroundColor: colors.surfaceContainerHigh,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(183,245,105,0.35)',
  },
  typePillText: {
    ...typography.labelMd,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.accentDeep,
  },
  title: {
    ...typography.headlineSm,
    color: colors.primary,
    marginTop: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 52,
    marginTop: spacing.sm,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: colors.accentDim,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 5,
  },
  ctaText: {
    ...typography.labelLg,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.accentDeep,
  },
});
