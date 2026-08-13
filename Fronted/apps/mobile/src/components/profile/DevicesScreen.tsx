import {
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import {
  ChevronLeft,
  Monitor,
  QrCode,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getDeviceSessions,
  revokeAllDeviceSessions,
  revokeDeviceSession,
  scanQrLogin,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  DeviceSession,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../layout/ScreenSafeArea';
import { useModuleNav } from '../embedded/EmbeddedNavContext';
import {
  getAuthSession,
  getSessionCredentials,
} from '../../services/authSession';
import { devicesStyles as styles } from './devicesStyles';


function formatLastSeen(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}


function getChallengeToken(
  scannedValue: string,
): string | null {
  const match = scannedValue.match(
    /^beeapp:\/\/web-login\?token=([^&]+)$/,
  );

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}


export default function DevicesScreen() {
  const router = useModuleNav();

  const [cameraPermission, requestCameraPermission] =
    useCameraPermissions();

  const [isScanning, setIsScanning] = useState(false);

  const [isSubmittingScan, setIsSubmittingScan] =
    useState(false);

  const [isLoadingDevices, setIsLoadingDevices] =
    useState(true);

  const [devices, setDevices] = useState<DeviceSession[]>(
    [],
  );

  const getCredentials = async (): Promise<AuthCredentials> => {
    const authSession = await getAuthSession();

    if (!authSession) {
      throw new Error(
        'Tu sesión móvil no está disponible. '
        + 'Inicia sesión nuevamente.',
      );
    }

    return getSessionCredentials(authSession);
  };

  const loadDevices = async () => {
    try {
      setIsLoadingDevices(true);

      const credentials = await getCredentials();

      const response = await getDeviceSessions(
        credentials,
      );

      setDevices(response.devices);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los dispositivos.',
      );
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    void loadDevices();
  }, []);

  const startScanning = async () => {
    if (!cameraPermission?.granted) {
      const permissionResult =
        await requestCameraPermission();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso requerido',
          'Debes permitir el uso de la cámara para '
            + 'escanear el código QR.',
        );

        return;
      }
    }

    setIsScanning(true);
  };

  const handleBarcodeScanned = async ({
    data,
  }: {
    data: string;
  }) => {
    if (isSubmittingScan) {
      return;
    }

    const challengeToken = getChallengeToken(data);

    if (!challengeToken) {
      Alert.alert(
        'Código no válido',
        'Escanea el código QR mostrado por BeeApp Web.',
      );

      return;
    }

    try {
      setIsSubmittingScan(true);

      const credentials = await getCredentials();

      const response = await scanQrLogin(
        credentials,
        {
          challenge_token: challengeToken,
        },
      );

      setIsScanning(false);

      await loadDevices();

      Alert.alert(
        'Sesión iniciada',
        `Se inició sesión en ${response.device.device_name}.`,
      );
    } catch (error) {
      Alert.alert(
        'No se pudo iniciar sesión',
        error instanceof Error
          ? error.message
          : (
              'El código QR venció, es inválido '
              + 'o ya fue utilizado.'
            ),
      );
    } finally {
      setIsSubmittingScan(false);
    }
  };

  const confirmSignOut = (device: DeviceSession) => {
    Alert.alert(
      'Cerrar sesión',
      `¿Cerrar sesión en ${device.device_name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              const credentials = await getCredentials();

              await revokeDeviceSession(
                credentials,
                device.id,
              );

              await loadDevices();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'No fue posible cerrar la sesión.',
              );
            }
          },
        },
      ],
    );
  };

  const confirmSignOutAll = () => {
    Alert.alert(
      'Cerrar todas las sesiones',
      'Se cerrarán todas las sesiones vinculadas '
        + 'a tu cuenta, incluida esta.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar todas',
          style: 'destructive',
          onPress: async () => {
            try {
              const credentials = await getCredentials();

              await revokeAllDeviceSessions(credentials);

              await loadDevices();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'No fue posible cerrar las sesiones.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {router.canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ChevronLeft
                size={24}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          ) : null}

          <Text style={styles.headerTitle}>
            Dispositivos
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            {isScanning ? (
              <>
                <CameraView
                  style={styles.scanner}
                  facing="back"
                  onBarcodeScanned={
                    isSubmittingScan
                      ? undefined
                      : handleBarcodeScanned
                  }
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                >
                  <View style={styles.scanFrame} />

                  <Text style={styles.scannerText}>
                    {isSubmittingScan
                      ? 'Iniciando sesión...'
                      : (
                          'Apunta la cámara al código QR '
                          + 'de BeeApp Web'
                        )}
                  </Text>
                </CameraView>

                <TouchableOpacity
                  style={styles.cancelScanBtn}
                  onPress={() => setIsScanning(false)}
                  activeOpacity={0.7}
                  disabled={isSubmittingScan}
                >
                  <Text style={styles.cancelScanText}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={startScanning}
                  activeOpacity={0.8}
                  accessibilityLabel="Escanear código QR"
                >
                  <QrCode
                    size={20}
                    color={colors.neutral.white}
                  />

                  <Text style={styles.scanBtnText}>
                    Escanear código QR
                  </Text>
                </TouchableOpacity>

                <Text style={styles.scanHint}>
                  Escanea el código QR que aparece en BeeApp Web
                  para vincular tu cuenta.
                </Text>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Dispositivos activos
            </Text>

            {isLoadingDevices ? (
              <Text style={styles.emptyText}>
                Cargando dispositivos...
              </Text>
            ) : null}

            {!isLoadingDevices && devices.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay dispositivos vinculados a tu cuenta.
              </Text>
            ) : null}

            {!isLoadingDevices
              ? devices.map((device, index) => (
                  <View
                    key={device.id}
                    style={[
                      styles.deviceRow,
                      index < devices.length - 1 &&
                        styles.rowSeparator,
                    ]}
                  >
                    <View style={styles.deviceIcon}>
                      <Monitor
                        size={20}
                        color={colors.neutral.gray600}
                      />
                    </View>

                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>
                        {device.device_name}
                      </Text>

                      <Text style={styles.deviceMeta}>
                        Última actividad:{' '}
                        {formatLastSeen(device.last_seen_at)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.signOutBtn}
                      onPress={() => confirmSignOut(device)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.signOutText}>
                        Cerrar sesión
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              : null}

            {!isLoadingDevices && devices.length > 0 ? (
              <TouchableOpacity
                style={styles.signOutAllBtn}
                onPress={confirmSignOutAll}
                activeOpacity={0.8}
              >
                <Text style={styles.signOutAllText}>
                  Cerrar todas las sesiones
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}