import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing } from '@/theme/tokens';
import type { WizardState } from './wizard-types';
import { wizardStyles as styles } from './wizard-styles';

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}

export function StepPhotos({ state, onChange, onNext }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [taking, setTaking] = useState(false);

  async function takePhoto() {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        onChange({ photoUris: [...state.photoUris, photo.uri] });
        setShowCamera(false);
      }
    } finally {
      setTaking(false);
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.permissionView}>
        <MaterialIcons name="camera-alt" size={64} color={colors.outlineVariant} />
        <Text style={styles.permissionText}>O app precisa de acesso à câmera</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Conceder permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { marginTop: spacing.xs }]} onPress={onNext}>
          <Text style={styles.secondaryButtonText}>Pular fotos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraBar}>
          <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraCancel}>
            <MaterialIcons name="close" size={28} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={takePhoto} style={styles.shutterButton} disabled={taking}>
            {taking
              ? <ActivityIndicator color={colors.primary} />
              : <View style={styles.shutterInner} />}
          </TouchableOpacity>
          <View style={{ width: 48 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>
          Fotos ({state.photoUris.length}/20)
        </Text>
        <View style={styles.photoGrid}>
          {state.photoUris.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} resizeMode="cover" />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() =>
                  onChange({ photoUris: state.photoUris.filter((_, j) => j !== i) })
                }
              >
                <MaterialIcons name="close" size={14} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          ))}
          {state.photoUris.length < 20 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => setShowCamera(true)}>
              <MaterialIcons name="add-a-photo" size={28} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>
            {state.photoUris.length === 0 ? 'Pular fotos' : 'Próximo'}
          </Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
