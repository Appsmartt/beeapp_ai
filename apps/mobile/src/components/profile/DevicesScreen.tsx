import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import { useModuleNav } from '../embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, QrCode, Monitor } from 'lucide-react-native';
import { LINKED_DEVICES, LinkedDevice } from '../../mocks/devices';
import { devicesStyles as styles } from './devicesStyles';

/**
 * Dispositivos: vincula BeeApp Web escaneando su código QR y lista las
 * sesiones abiertas. Todo es mock — no abre la cámara real ni cierra sesiones
 * de verdad.
 */
export default function DevicesScreen() {
  const router = useModuleNav();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<LinkedDevice[]>([...LINKED_DEVICES]);

  const confirmSignOut = (device: LinkedDevice) => {
    Alert.alert('Cerrar sesión', '¿Cerrar sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => setDevices((prev) => prev.filter((d) => d.id !== device.id)),
      },
    ]);
  };

  const confirmSignOutAll = () => {
    Alert.alert('Cerrar todas las sesiones', '¿Cerrar sesión en todos los dispositivos vinculados?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar todas', style: 'destructive', onPress: () => setDevices([]) },
    ]);
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {router.canGoBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.neutral.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Dispositivos</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN 1 — Escanear código QR */}
          <View style={styles.section}>
            {scanning ? (
              <>
                <View style={styles.scanner}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scannerText}>
                    Apunta la cámara al código QR de BeeApp Web
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelScanBtn}
                  onPress={() => setScanning(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelScanText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setScanning(true)}
                  activeOpacity={0.8}
                  accessibilityLabel="Escanear código QR"
                >
                  <QrCode size={20} color={colors.neutral.white} />
                  <Text style={styles.scanBtnText}>Escanear código QR</Text>
                </TouchableOpacity>

                <Text style={styles.scanHint}>
                  Escanea el código QR que aparece en la pantalla de BeeApp Web para vincular tu cuenta.
                </Text>
              </>
            )}
          </View>

          {/* SECCIÓN 2 — Dispositivos vinculados */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dispositivos activos</Text>

            {devices.length === 0 ? (
              <Text style={styles.emptyText}>No hay dispositivos vinculados a tu cuenta.</Text>
            ) : (
              devices.map((device, index) => (
                <View
                  key={device.id}
                  style={[styles.deviceRow, index < devices.length - 1 && styles.rowSeparator]}
                >
                  <View style={styles.deviceIcon}>
                    <Monitor size={20} color={colors.neutral.gray600} />
                  </View>

                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceMeta}>{device.lastSeen}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={() => confirmSignOut(device)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signOutText}>Cerrar sesión</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {devices.length > 0 && (
              <TouchableOpacity
                style={styles.signOutAllBtn}
                onPress={confirmSignOutAll}
                activeOpacity={0.8}
              >
                <Text style={styles.signOutAllText}>Cerrar todas las sesiones</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}
