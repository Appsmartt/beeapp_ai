import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Briefcase,
  ChevronLeft,
  Globe,
  MapPin,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getChatContactProfile,
  getStorageFileAccess,
} from '@beeapp/api-client';
import type {
  ChatContactProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  getInitials,
} from '../../../src/services/chatService';


const AVATAR_BACKGROUND = '#F3E8FF';

function buildContactMeta(
  contact: ChatContactProfile,
): string | null {
  if (contact.occupation) {
    return contact.occupation;
  }

  if (contact.location) {
    return contact.location;
  }

  if (contact.identity_type === 'commercial_profile') {
    return 'Perfil comercial de Buddy';
  }

  return null;
}

export default function ContactDetailScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const identityId = String(params.id || '').trim();
  const routeDisplayName = String(
    params.displayName || '',
  ).trim();
  const routeAvatarUrl = String(
    params.avatarUrl || '',
  ).trim();

  const [contact, setContact] =
    useState<ChatContactProfile | null>(null);

  const [avatarUrl, setAvatarUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [avatarFailed, setAvatarFailed] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadContact = useCallback(
    async (
      options: {
        refresh?: boolean;
      } = {},
    ) => {
      if (!identityId) {
        setContact(null);
        setAvatarUrl(null);
        setError(
          'No fue posible identificar el contacto.',
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (options.refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const auth = await getValidSessionCredentials();

        if (!auth) {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        const nextContact = await getChatContactProfile(
          auth,
          identityId,
        );

        setContact({
          ...nextContact,
          display_name: (
            nextContact.display_name.trim()
            || routeDisplayName
            || 'Usuario Buddy'
          ),
        });
        setAvatarFailed(false);
        setAvatarUrl(routeAvatarUrl || null);

        if (!routeAvatarUrl && nextContact.avatar_file_id) {
          try {
            const avatarAccess = await getStorageFileAccess(
              auth,
              nextContact.avatar_file_id,
            );

            setAvatarUrl(avatarAccess.url);
          } catch {
            setAvatarUrl(null);
          }
        }
      } catch (loadError) {
        setContact(null);
        setAvatarUrl(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar el perfil del contacto.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      identityId,
      routeAvatarUrl,
      routeDisplayName,
    ],
  );

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  const initials = useMemo(
    () => getInitials(contact?.display_name || ''),
    [contact?.display_name],
  );

  const contactMeta = contact
    ? buildContactMeta(contact)
    : null;

  const canRenderAvatar = Boolean(
    avatarUrl && !avatarFailed,
  );

  if (loading && !contact) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.loadingText}>
            Cargando perfil del contacto...
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!contact) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            {error || 'No fue posible cargar el contacto.'}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              void loadContact({
                refresh: true,
              });
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={styles.backLinkText}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Perfil del contacto
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={undefined}
        >
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarWrap}>
              {canRenderAvatar ? (
                <Image
                  source={{
                    uri: avatarUrl as string,
                  }}
                  style={styles.avatarImage}
                  onError={() => {
                    setAvatarFailed(true);
                  }}
                  accessibilityLabel={
                    `Foto de ${contact.display_name}`
                  }
                />
              ) : (
                <Text style={styles.avatarText}>
                  {initials}
                </Text>
              )}
            </View>

            <Text
              style={styles.profileName}
              numberOfLines={2}
            >
              {contact.display_name}
            </Text>

            {contactMeta ? (
              <Text
                style={styles.profileMeta}
                numberOfLines={2}
              >
                {contactMeta}
              </Text>
            ) : null}

            {contact.identity_type === 'commercial_profile' ? (
              <Text style={styles.profileType}>
                Perfil comercial
              </Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>
            Información general
          </Text>

          <View style={styles.infoCard}>
            {contact.occupation ? (
              <View style={styles.infoRow}>
                <Briefcase
                  size={16}
                  color={colors.neutral.gray600}
                />

                <View style={styles.infoTextColumn}>
                  <Text style={styles.infoLabel}>
                    Ocupación
                  </Text>

                  <Text style={styles.infoValue}>
                    {contact.occupation}
                  </Text>
                </View>
              </View>
            ) : null}

            {contact.location ? (
              <View style={styles.infoRow}>
                <MapPin
                  size={16}
                  color={colors.neutral.gray600}
                />

                <View style={styles.infoTextColumn}>
                  <Text style={styles.infoLabel}>
                    Ubicación
                  </Text>

                  <Text style={styles.infoValue}>
                    {contact.location}
                  </Text>
                </View>
              </View>
            ) : null}

            {!contact.occupation && !contact.location ? (
              <Text style={styles.emptyInfoText}>
                Este contacto no ha compartido información adicional.
              </Text>
            ) : null}
          </View>

          {contact.social_links.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Redes y enlaces
              </Text>

              <View style={styles.infoCard}>
                {contact.social_links.map((link, index) => (
                  <View
                    key={`${link.platform}-${link.url}`}
                    style={[
                      styles.infoRow,
                      index === contact.social_links.length - 1
                        ? styles.lastInfoRow
                        : null,
                    ]}
                  >
                    <Globe
                      size={16}
                      color={colors.neutral.gray600}
                    />

                    <View style={styles.infoTextColumn}>
                      <Text style={styles.infoLabel}>
                        {link.platform}
                      </Text>

                      <Text
                        style={styles.linkValue}
                        numberOfLines={1}
                      >
                        {link.url}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {refreshing ? (
            <ActivityIndicator
              size="small"
              color={colors.brand.primary}
              style={styles.refreshIndicator}
            />
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  profileHeaderCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: AVATAR_BACKGROUND,
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    width: 96,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: colors.brand.primary,
    fontSize: 30,
    fontWeight: '800',
  },
  profileName: {
    color: colors.neutral.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileMeta: {
    color: colors.neutral.gray600,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  profileType: {
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 20,
    marginTop: 24,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: 1,
    borderTopColor: colors.neutral.gray200,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  infoRow: {
    alignItems: 'flex-start',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 13,
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoTextColumn: {
    flex: 1,
  },
  infoLabel: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  infoValue: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
  },
  linkValue: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyInfoText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    paddingVertical: 14,
    textAlign: 'center',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
  backLink: {
    padding: 8,
  },
  backLinkText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  refreshIndicator: {
    marginTop: 20,
  },
  bottomSpacer: {
    height: 70,
  },
});
