import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, useWindowDimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PressableScale } from './pressable-scale';
import { motion } from '@/theme/tokens';
import { Icon } from '@/components/ui/icon';

const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 90; // distância p/ trocar de foto
const CLOSE_THRESHOLD = 130; // distância vertical p/ fechar

export interface LightboxPhoto {
  id: string;
  uri: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

/**
 * Visualizador de fotos em tela cheia com pinch-zoom, double-tap, pan (quando
 * ampliado), swipe horizontal para trocar de foto e swipe-down para fechar.
 * Construído sobre reanimated 4 + gesture-handler (sem libs de terceiros
 * incompatíveis com o SDK 54).
 */
export function PhotoLightbox({ photos, initialIndex, visible, onClose }: PhotoLightboxProps) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  // Estado de zoom espelhado em shared value para checagem nos worklets.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const indexSV = useSharedValue(initialIndex);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      indexSV.value = initialIndex;
      resetTransform();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialIndex]);

  function resetTransform() {
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
  }

  function goTo(newIndex: number) {
    setIndex(newIndex);
    indexSV.value = newIndex;
    resetTransform();
    Haptics.selectionAsync().catch(() => {});
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(1, Math.min(next, MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        scale.value = withTiming(1, { duration: motion.duration.fast });
        tx.value = withTiming(0, { duration: motion.duration.fast });
        ty.value = withTiming(0, { duration: motion.duration.fast });
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1, { duration: motion.duration.fast });
        tx.value = withTiming(0, { duration: motion.duration.fast });
        ty.value = withTiming(0, { duration: motion.duration.fast });
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        scale.value = withTiming(2.5, { duration: motion.duration.fast });
        savedScale.value = 2.5;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        // Ampliado: move a imagem dentro do zoom.
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      } else {
        // Sem zoom: acompanha o dedo para dar feedback de swipe.
        tx.value = e.translationX;
        ty.value = e.translationY * 0.6;
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
        return;
      }
      // Sem zoom: decide entre fechar, trocar de foto ou voltar.
      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);

      if (absY > CLOSE_THRESHOLD && absY > absX) {
        runOnJS(onClose)();
        return;
      }
      if (e.translationX <= -SWIPE_THRESHOLD && indexSV.value < photos.length - 1) {
        runOnJS(goTo)(indexSV.value + 1);
        return;
      }
      if (e.translationX >= SWIPE_THRESHOLD && indexSV.value > 0) {
        runOnJS(goTo)(indexSV.value - 1);
        return;
      }
      // Snap back.
      tx.value = withTiming(0, { duration: motion.duration.fast });
      ty.value = withTiming(0, { duration: motion.duration.fast });
    });

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const current = photos[index];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.header} edges={['top']}>
          <PressableScale style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Icon name="close" size={24} color="#fff" />
          </PressableScale>
          {photos.length > 1 && (
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {index + 1} / {photos.length}
              </Text>
            </View>
          )}
          <View style={styles.closeBtn} />
        </SafeAreaView>

        {current && (
          <GestureDetector gesture={composed}>
            <View style={styles.stage} collapsable={false}>
              <Animated.View style={[{ width, height: height * 0.8 }, imageStyle]}>
                <Image
                  source={current.uri}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  transition={220}
                />
              </Animated.View>
            </View>
          </GestureDetector>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,10,4,0.96)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  counterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  counterText: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
