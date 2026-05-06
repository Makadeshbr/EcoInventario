import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '@/theme/tokens';
import { GPS_ACCURACY_THRESHOLD_M } from '@/constants/config';
import type { WizardState } from './wizard-types';
import { wizardStyles as styles } from './wizard-styles';

interface Props {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}

function PingRipple() {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 2, duration: 1400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[styles.ripple, { transform: [{ scale }], opacity }]}
      pointerEvents="none"
    />
  );
}

export function StepLocation({ state, onChange, onNext }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const hasCoords = state.latitude !== null && state.longitude !== null;

  const captureGPS = useCallback(async () => {
    setCapturing(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permissão negada. Informe as coordenadas manualmente.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onChange({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        gpsAccuracyM: loc.coords.accuracy,
      });
    } catch {
      try {
        const cached = await Location.getLastKnownPositionAsync();
        if (cached) {
          onChange({
            latitude: cached.coords.latitude,
            longitude: cached.coords.longitude,
            gpsAccuracyM: cached.coords.accuracy,
          });
          setLocationError('Usando a última localização conhecida do aparelho.');
          return;
        }
      } catch {
        // Mantém o fluxo offline: o usuário ainda pode informar coordenadas manualmente.
      }
      setLocationError('Não foi possível obter GPS agora. Informe as coordenadas manualmente.');
    } finally {
      setCapturing(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!hasCoords) captureGPS();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const region: Region | undefined = hasCoords
    ? {
        latitude: state.latitude!,
        longitude: state.longitude!,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }
    : undefined;

  const isAccurate = state.gpsAccuracyM !== null && state.gpsAccuracyM <= GPS_ACCURACY_THRESHOLD_M;

  function applyManualLocation() {
    const lat = Number(manualLatitude.replace(',', '.'));
    const lng = Number(manualLongitude.replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Coordenadas inválidas', 'Informe latitude entre -90 e 90 e longitude entre -180 e 180.');
      return;
    }
    onChange({ latitude: lat, longitude: lng, gpsAccuracyM: null });
    setLocationError(null);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.mapWrapper}>
        <View style={styles.mapCircle}>
          {hasCoords ? (
            <MapView style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} region={region} scrollEnabled={false}>
              <Marker
                coordinate={{ latitude: state.latitude!, longitude: state.longitude! }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.mapPinWrapper}>
                  <PingRipple />
                  <View style={styles.mapPin}>
                    <MaterialIcons name="location-on" size={24} color='#304f00' />
                  </View>
                </View>
              </Marker>
            </MapView>
          ) : (
            <ActivityIndicator color={colors.secondary} size="large" />
          )}
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <MaterialIcons name="my-location" size={20} color={colors.onSecondaryContainer} />
          </View>
          <View>
            <Text style={styles.infoLabel}>Coordenadas</Text>
            {hasCoords ? (
              <Text style={styles.infoValue}>
                {state.latitude!.toFixed(5)}, {state.longitude!.toFixed(5)}
              </Text>
            ) : (
              <Text style={styles.infoValueMuted}>Capturando...</Text>
            )}
          </View>
        </View>
        <View style={[styles.infoRow, styles.infoRowBorderless]}>
          <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
            <MaterialIcons name="radar" size={20} color={colors.outline} />
          </View>
          <View>
            <Text style={styles.infoLabel}>Precisão</Text>
            {state.gpsAccuracyM !== null ? (
              <Text style={[styles.infoValue, !isAccurate && { color: '#e65100' }]}>
                {state.gpsAccuracyM.toFixed(0)}m
                {!isAccurate && ' (baixa precisão)'}
              </Text>
            ) : (
              <Text style={styles.infoValueMuted}>—</Text>
            )}
          </View>
        </View>
      </View>

      {locationError && (
        <View style={styles.manualLocationCard}>
          <Text style={styles.manualLocationText}>{locationError}</Text>
          <View style={styles.manualLocationRow}>
            <TextInput
              style={styles.coordInput}
              value={manualLatitude}
              onChangeText={setManualLatitude}
              placeholder="Latitude"
              placeholderTextColor={colors.outline}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={styles.coordInput}
              value={manualLongitude}
              onChangeText={setManualLongitude}
              placeholder="Longitude"
              placeholderTextColor={colors.outline}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={applyManualLocation}>
            <MaterialIcons name="edit-location" size={18} color={colors.secondary} />
            <Text style={styles.secondaryButtonText}>Usar coordenadas</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={captureGPS}
          disabled={capturing}
          activeOpacity={0.8}
        >
          {capturing
            ? <ActivityIndicator color={colors.secondary} size="small" />
            : <MaterialIcons name="gps-fixed" size={18} color={colors.secondary} />}
          <Text style={styles.secondaryButtonText}>
            {capturing ? 'Capturando...' : 'Recapturar GPS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !hasCoords && styles.primaryButtonDisabled]}
          onPress={onNext}
          disabled={!hasCoords || capturing}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Próximo</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
