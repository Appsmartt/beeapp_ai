import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Share,
  Linking,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  X,
  ChevronRight,
  Shield,
  CreditCard,
  Grid,
  Share2,
  HelpCircle,
  ShieldCheck,
  FileText,
  LogOut,
  Package,
  Bot,
  Monitor,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  sideMenuStyles as styles,
  PANEL_WIDTH,
} from './homeSideMenuStyles';
import { CURRENT_USER } from '../../mocks/currentUser';

interface HomeSideMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuRow {
  label: string;
  icon: typeof Shield;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

export default function HomeSideMenu({
  visible,
  onClose,
}: HomeSideMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isVisibleInNetwork, setIsVisibleInNetwork] = useState(true);
  const [rendered, setRendered] = useState(visible);
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
  }, [visible, rendered, slideAnim]);

  const userProfile = {
    name: CURRENT_USER.name,
    email: CURRENT_USER.email,
    initials: CURRENT_USER.initials,
  };

  const goTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const openBeeServices = () => {
    goTo('/(main)/beeservices');
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message:
          '¡Descarga BeeApp AI! La plataforma definitiva para optimizar tus correos, notas, archivos y automatizar tu negocio con IA. Descárgala aquí: https://beeapp.ai',
      });
    } catch (error) {
      console.log('Error compartiendo la app:', error);
    }
  };

  const handleContactSupport = () => {
    const supportPhone = '573001234567';
    const message = 'Hola soporte de BeeApp, necesito ayuda con mi cuenta.';
    const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            'Error',
            'No se pudo abrir WhatsApp en este dispositivo.',
          );
        }
      })
      .catch((error) => console.error('An error occurred', error));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión en BeeApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            onClose();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const accountRows: MenuRow[] = [
    {
      label: 'Suscripción y Verificación',
      icon: CreditCard,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(main)/profile/subscription-hub'),
    },
    {
      label: 'Integraciones Externas',
      icon: Grid,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(main)/profile/integrations'),
    },
    {
      label: 'Dispositivos',
      icon: Monitor,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(main)/profile/devices'),
    },
    {
      label: 'Seguridad y PIN',
      icon: ShieldCheck,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(main)/profile/security'),
    },
    {
      label: 'Configuración del Asistente',
      icon: Bot,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(main)/chat/ai-settings'),
    },
  ];

  const appRows: MenuRow[] = [
    {
      label: 'Compartir Aplicación',
      icon: Share2,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: handleShareApp,
    },
    {
      label: 'Contactar a Soporte',
      icon: HelpCircle,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: handleContactSupport,
    },
  ];

  const legalRows: MenuRow[] = [
    {
      label: 'Términos y Condiciones',
      icon: FileText,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(auth)/terms'),
    },
    {
      label: 'Política de Privacidad',
      icon: Shield,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => goTo('/(auth)/privacy'),
    },
  ];

  const renderRows = (rows: MenuRow[]) => (
    <View style={styles.optionsCard}>
      {rows.map((row, index) => {
        const RowIcon = row.icon;

        return (
          <TouchableOpacity
            key={row.label}
            style={[
              styles.optionRow,
              index === rows.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.optionIconWrap,
                { backgroundColor: row.iconBg },
              ]}
            >
              <RowIcon size={18} color={row.iconColor} />
            </View>

            <Text style={styles.optionLabel}>{row.label}</Text>

            <ChevronRight size={16} color={colors.neutral.gray500} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.panel,
            {
              paddingTop: insets.top + 12,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Menú</Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.neutral.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>{userProfile.initials}</Text>
                <View style={styles.onlineBadge} />
              </View>

              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileOccupation}>{userProfile.email}</Text>

              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => goTo('/(main)/profile/edit')}
                activeOpacity={0.7}
              >
                <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.groupHeader}>Mis Negocios</Text>

            <View style={styles.optionsCard}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={openBeeServices}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: colors.neutral.gray100 },
                  ]}
                >
                  <Package size={18} color={colors.neutral.gray600} />
                </View>

                <Text style={styles.optionLabel}>BeeServices</Text>

                <ChevronRight size={16} color={colors.neutral.gray500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.groupHeader}>Mi Cuenta</Text>

            {renderRows(accountRows)}

            <View style={[styles.optionsCard, { marginTop: 8 }]}>
              <View style={styles.switchOptionRow}>
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: colors.neutral.gray100 },
                  ]}
                >
                  <Shield size={18} color={colors.neutral.gray600} />
                </View>

                <View style={styles.switchTextCol}>
                  <Text style={styles.optionLabel}>
                    Visibilidad en la red
                  </Text>

                  <Text style={styles.switchDesc}>
                    Permite que otros usuarios te encuentren según tu
                    profesión, empresa e intereses registrados.
                  </Text>
                </View>

                <Switch
                  value={isVisibleInNetwork}
                  onValueChange={setIsVisibleInNetwork}
                  trackColor={{
                    false: colors.neutral.gray300,
                    true: colors.brand.primary + '80',
                  }}
                  thumbColor={
                    isVisibleInNetwork
                      ? colors.brand.primary
                      : colors.neutral.gray400
                  }
                />
              </View>
            </View>

            <Text style={styles.groupHeader}>Aplicación</Text>
            {renderRows(appRows)}

            <Text style={styles.groupHeader}>Legal</Text>
            {renderRows(legalRows)}

            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <LogOut
                size={18}
                color={colors.semantic.error}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.signOutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              BeeApp AI v1.0.0 (Build 1425)
            </Text>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}