import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  StyleSheet,
  ScrollView,
  Share,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { appAlert } from '../feedback/appAlert';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { getCurrentProfile } from '@beeapp/api-client';
import {
  isProfileVisibleInNetwork,
  saveNetworkVisibility,
} from '../../services/networkVisibility';
import {
  Bot,
  ChevronRight,
  CreditCard,
  FileText,
  Grid,
  HelpCircle,
  LogOut,
  Monitor,
  Package,
  Share2,
  Shield,
  ShieldCheck,
  SquarePen,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SignOutConfirmModal from '../security/SignOutConfirmModal';
import CachedImage from '../CachedImage';
import {
  getAuthSession,
  getSessionCredentials,
  signOutCurrentDevice,
} from '../../services/authSession';
import {
  getProfileAvatarUrl,
} from '../../services/profileAvatarService';
import {
  readSideMenuProfileSnapshot,
  writeSideMenuProfileSnapshot,
} from '../../services/sideMenuProfileCache';
import {
  hasCachedImage,
  hydrateImageDiskCache,
  imageCacheUri,
  remoteImageCacheKey,
} from '../../services/imageDiskCache';
import {
  PANEL_WIDTH,
  sideMenuStyles as styles,
} from './homeSideMenuStyles';


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

interface SideMenuUserProfile {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  avatarFileId: string | null;
}

const INITIAL_USER_PROFILE: SideMenuUserProfile = {
  name: 'Cargando perfil...',
  email: '',
  initials: '?',
  avatarUrl: null,
  avatarFileId: null,
};

function getUserInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const firstInitial =
    firstName?.trim().charAt(0).toUpperCase() ?? '';

  const lastInitial =
    lastName?.trim().charAt(0).toUpperCase() ?? '';

  return `${firstInitial}${lastInitial}` || '?';
}

function getFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const fullName = [firstName, lastName]
    .filter(
      (name): name is string =>
        typeof name === 'string' &&
        name.trim().length > 0,
    )
    .join(' ');

  return fullName || 'Usuario Buddy';
}

export default function HomeSideMenu({
  visible,
  onClose,
}: HomeSideMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isVisibleInNetwork, setIsVisibleInNetwork] =
    useState(true);
  const [isSavingVisibility, setIsSavingVisibility] =
    useState(false);

  const [rendered, setRendered] = useState(visible);

  const [userProfile, setUserProfile] =
    useState<SideMenuUserProfile>(
      INITIAL_USER_PROFILE,
    );

  const [signOutModalOpen, setSignOutModalOpen] = useState(false);

  const slideAnim = useRef(
    new Animated.Value(PANEL_WIDTH),
  ).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();

      return;
    }

    if (!rendered) {
      return;
    }

    const animation = Animated.timing(slideAnim, {
      toValue: PANEL_WIDTH,
      duration: 180,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });

    const timeout = setTimeout(() => {
      setRendered(false);
    }, 240);

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [visible, rendered, slideAnim]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await readSideMenuProfileSnapshot();
      if (!snapshot || cancelled) {
        return;
      }

      await hydrateImageDiskCache();
      if (cancelled) {
        return;
      }

      const stableKey = remoteImageCacheKey({
        fileId: snapshot.avatarFileId,
      });
      const cachedAvatar = stableKey && hasCachedImage(stableKey)
        ? imageCacheUri(stableKey)
        : null;

      setUserProfile((current) => (
        current.name === INITIAL_USER_PROFILE.name
          ? {
              name: snapshot.name,
              email: snapshot.email,
              initials: snapshot.initials,
              avatarFileId: snapshot.avatarFileId,
              avatarUrl: cachedAvatar,
            }
          : current
      ));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    const loadCurrentUserProfile = async () => {
      try {
        const authSession = await getAuthSession();

        if (!authSession) {
          throw new Error('No active session was found.');
        }

        const credentials = getSessionCredentials(
          authSession,
        );

        const response = await getCurrentProfile(
          credentials,
        );

        if (!isMounted) {
          return;
        }

        const avatarFileId = response.profile.avatar_file_id || null;
        await hydrateImageDiskCache();
        const stableKey = remoteImageCacheKey({
          fileId: avatarFileId,
          url: response.profile.avatar_url,
        });
        let avatarUrl: string | null = stableKey && hasCachedImage(stableKey)
          ? imageCacheUri(stableKey)
          : (response.profile.avatar_url || null);

        if (!avatarUrl && avatarFileId) {
          try {
            const avatarAccess = await getProfileAvatarUrl(
              credentials,
              avatarFileId,
            );

            avatarUrl = avatarAccess.url;
          } catch {
            avatarUrl = null;
          }
        }

        if (!isMounted) {
          return;
        }

        const nextProfile = {
          name: getFullName(
            response.profile.first_name,
            response.profile.last_name,
          ),
          email: response.profile.email ?? '',
          initials: getUserInitials(
            response.profile.first_name,
            response.profile.last_name,
          ),
          avatarFileId,
          avatarUrl,
        };
        setUserProfile(nextProfile);
        setIsVisibleInNetwork(
          isProfileVisibleInNetwork(response.profile),
        );
        void writeSideMenuProfileSnapshot({
          name: nextProfile.name,
          email: nextProfile.email,
          initials: nextProfile.initials,
          avatarFileId,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setUserProfile((current) => (
          current.avatarFileId || current.name !== INITIAL_USER_PROFILE.name
            ? current
            : {
                name: 'No fue posible cargar el perfil',
                email: '',
                initials: '?',
                avatarFileId: null,
                avatarUrl: null,
              }
        ));
      }
    };

    void loadCurrentUserProfile();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const goTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const openBuddyServices = () => {
    goTo('/(main)/beeservices');
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message:
          '¡Descarga Buddy AI! La plataforma definitiva para '
          + 'optimizar tus correos, notas, archivos y automatizar '
          + 'tu negocio con IA. Descárgala aquí: https://beeapp.ai',
      });
    } catch (error) {
      console.log('Error compartiendo la app:', error);
    }
  };

  const handleContactSupport = () => {
    const supportPhone = '573001234567';

    const message =
      'Hola soporte de Buddy, necesito ayuda con mi cuenta.';

    const url =
      `https://wa.me/${supportPhone}?text=${encodeURIComponent(
        message,
      )}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
          return;
        }

        appAlert(
          'Error',
          'No se pudo abrir WhatsApp en este dispositivo.',
        );
      })
      .catch((error) => {
        console.error('An error occurred', error);
      });
  };

  const handleSignOut = () => {
    setSignOutModalOpen(true);
  };

  const confirmSignOut = async () => {
    try {
      await signOutCurrentDevice();
      setSignOutModalOpen(false);
      onClose();
      router.replace('/(auth)/login');
    } catch {
      appAlert(
        'No se pudo cerrar sesión',
        'Comprueba la conexión e inténtalo de nuevo.',
      );
    }
  };

  const accountRows: MenuRow[] = [
    {
      label: 'Suscripción y Verificación',
      icon: CreditCard,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => {
        goTo('/(main)/profile/subscription-hub');
      },
    },
    {
      label: 'Integraciones Externas',
      icon: Grid,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => {
        goTo('/(main)/profile/integrations');
      },
    },
    {
      label: 'Dispositivos',
      icon: Monitor,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => {
        goTo('/(main)/profile/devices');
      },
    },
    {
      label: 'Seguridad y PIN',
      icon: ShieldCheck,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => {
        goTo('/(main)/profile/security');
      },
    },
    {
      label: 'Configuración del Asistente',
      icon: Bot,
      iconBg: colors.neutral.gray100,
      iconColor: colors.neutral.gray600,
      onPress: () => {
        goTo('/(main)/chat/ai-settings');
      },
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
              index === rows.length - 1 && {
                borderBottomWidth: 0,
              },
            ]}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.optionIconWrap,
                {
                  backgroundColor: row.iconBg,
                },
              ]}
            >
              <RowIcon
                size={18}
                color={row.iconColor}
              />
            </View>

            <Text style={styles.optionLabel}>
              {row.label}
            </Text>

            <ChevronRight
              size={16}
              color={colors.neutral.gray500}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (!rendered) {
    return null;
  }

  return (
    <>
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={localStyles.host}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          disabled={!visible}
          onPress={onClose}
          activeOpacity={1}
          style={styles.backdrop}
        />

        <Animated.View
          style={[
            styles.panel,
            {
              paddingTop: insets.top + 12,
              transform: [
                {
                  translateX: slideAnim,
                },
              ],
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
              <X
                size={20}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                {userProfile.avatarUrl || userProfile.avatarFileId ? (
                  <CachedImage
                    cacheKey={userProfile.avatarFileId}
                    uri={userProfile.avatarUrl}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {userProfile.initials}
                  </Text>
                )}
              </View>

              <View style={styles.profileInfoColumn}>
                <View style={styles.profileTitleRow}>
                  <Text
                    numberOfLines={1}
                    style={styles.profileName}
                  >
                    {userProfile.name}
                  </Text>

                  <TouchableOpacity
                    accessibilityLabel="Editar perfil"
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    hitSlop={8}
                    onPress={() => {
                      goTo('/(main)/profile/edit');
                    }}
                    style={styles.editProfileIconBtn}
                  >
                    <SquarePen
                      color={colors.brand.primary}
                      size={16}
                      strokeWidth={2.3}
                    />
                  </TouchableOpacity>
                </View>

                {userProfile.email ? (
                  <Text
                    numberOfLines={1}
                    style={styles.profileOccupation}
                  >
                    {userProfile.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.groupHeader}>
              Mis Negocios
            </Text>

            <View style={styles.optionsCard}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={openBuddyServices}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.optionIconWrap,
                    {
                      backgroundColor: colors.neutral.gray100,
                    },
                  ]}
                >
                  <Package
                    size={18}
                    color={colors.neutral.gray600}
                  />
                </View>

                <Text style={styles.optionLabel}>
                  Buddy Services
                </Text>

                <ChevronRight
                  size={16}
                  color={colors.neutral.gray500}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.groupHeader}>
              Mi Cuenta
            </Text>

            {renderRows(accountRows)}

            <View
              style={[
                styles.optionsCard,
                {
                  marginTop: 8,
                },
              ]}
            >
              <View style={styles.switchOptionRow}>
                <View
                  style={[
                    styles.optionIconWrap,
                    {
                      backgroundColor: colors.neutral.gray100,
                    },
                  ]}
                >
                  <Shield
                    size={18}
                    color={colors.neutral.gray600}
                  />
                </View>

                <View style={styles.switchTextCol}>
                  <Text style={styles.optionLabel}>
                    Visibilidad en la red
                  </Text>

                  <Text style={styles.switchDesc}>
                    Permite que otros usuarios te encuentren según
                    tu profesión, empresa e intereses registrados.
                  </Text>
                </View>

                <Switch
                  value={isVisibleInNetwork}
                  disabled={isSavingVisibility}
                  onValueChange={(visible) => {
                    const previous = isVisibleInNetwork;
                    setIsVisibleInNetwork(visible);
                    setIsSavingVisibility(true);

                    void (async () => {
                      try {
                        const authSession = await getAuthSession();

                        if (!authSession) {
                          throw new Error(
                            'Tu sesión no está disponible.',
                          );
                        }

                        await saveNetworkVisibility(
                          getSessionCredentials(authSession),
                          visible,
                        );
                      } catch (error) {
                        setIsVisibleInNetwork(previous);
                        appAlert(
                          'No fue posible guardar la visibilidad',
                          error instanceof Error
                            ? error.message
                            : 'Inténtalo nuevamente.',
                        );
                      } finally {
                        setIsSavingVisibility(false);
                      }
                    })();
                  }}
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

            <Text style={styles.groupHeader}>
              Aplicación
            </Text>

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
                style={{
                  marginRight: 8,
                }}
              />

              <Text style={styles.signOutBtnText}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              Buddy AI v1.0.0 (Build 1425)
            </Text>

            <View
              style={{
                height: 32,
              }}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </View>

    <SignOutConfirmModal
      onClose={() => {
        setSignOutModalOpen(false);
      }}
      onConfirm={confirmSignOut}
      visible={signOutModalOpen}
    />
    </>
  );
}

const localStyles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    elevation: 40,
    zIndex: 40,
  },
});