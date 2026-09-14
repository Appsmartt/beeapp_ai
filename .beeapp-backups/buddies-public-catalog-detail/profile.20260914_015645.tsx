import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Store,
} from 'lucide-react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialCatalog,
  CommercialPublicOffer,
  CommercialPublicProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../src/components/layout/ScreenSafeArea';
import CommercialOfferCard from '../../../../src/components/buddyservices/CommercialOfferCard';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesPublicOfferRoute,
} from '../../../../src/features/buddyservices/commercialRoutes';
import {
  loadPublicCommercialCatalogs,
  loadPublicCommercialOffers,
  loadPublicCommercialProfile,
} from '../../../../src/services/commercialService';

type ProfileTab =
  | 'home'
  | 'catalogs'
  | 'information';

function normalizeParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function profileInitials(
  displayName: string,
): string {
  const result = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return result || 'B';
}

function offerTypeLabel(
  value: CommercialPublicProfile['offer_type'],
): string {
  if (value === 'products') {
    return 'Productos';
  }

  if (value === 'services') {
    return 'Servicios';
  }

  return 'Productos y servicios';
}

function modalityLabel(value: string): string {
  const labels: Record<string, string> = {
    at_establishment: 'En establecimiento',
    in_person: 'Presencial',
    virtual: 'Virtual',
    home_visit: 'Visita a domicilio',
    delivery: 'Entrega a domicilio',
    pickup: 'Recoger en negocio',
    phone_call: 'Llamada telefónica',
    buddy_chat: 'Chat Buddy',
  };

  return labels[value] || value;
}

function ProfileLogo({
  profile,
}: {
  profile: CommercialPublicProfile;
}) {
  return (
    <View style={styles.logoFallback}>
      <Text style={styles.logoInitials}>
        {profileInitials(profile.display_name)}
      </Text>
    </View>
  );
}

function CatalogList({
  catalogs,
}: {
  catalogs: CommercialCatalog[];
}) {
  if (catalogs.length === 0) {
    return (
      <Text style={styles.tabEmptyText}>
        Este negocio aún no tiene catálogos publicados.
      </Text>
    );
  }

  return (
    <View style={styles.catalogList}>
      {catalogs.map((catalog) => (
        <View
          key={catalog.id}
          style={styles.catalogCard}
        >
          <View style={styles.catalogIcon}>
            <ClipboardList
              color="#7B2DD9"
              size={19}
            />
          </View>

          <View style={styles.catalogContent}>
            <Text style={styles.catalogName}>
              {catalog.name}
            </Text>

            {catalog.description ? (
              <Text
                numberOfLines={2}
                style={styles.catalogDescription}
              >
                {catalog.description}
              </Text>
            ) : null}
          </View>

          <ChevronRight
            color="#8A72B2"
            size={20}
          />
        </View>
      ))}
    </View>
  );
}

export default function BuddyServicesPublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    profileId?: string | string[];
  }>();

  const profileId = normalizeParam(params.profileId);

  const [activeTab, setActiveTab] = useState<ProfileTab>(
    'home',
  );
  const [profile, setProfile] = useState<
    CommercialPublicProfile | null
  >(null);
  const [catalogs, setCatalogs] = useState<
    CommercialCatalog[]
  >([]);
  const [offers, setOffers] = useState<
    CommercialPublicOffer[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    null,
  );

  const publicPhone = useMemo(() => {
    if (
      !profile?.contact.is_phone_public
      || !profile.contact.phone_number
    ) {
      return null;
    }

    return [
      profile.contact.phone_dial_code
        ? `+${profile.contact.phone_dial_code}`
        : '',
      profile.contact.phone_number,
    ]
      .filter(Boolean)
      .join(' ');
  }, [profile]);

  const publicEmail = useMemo(() => (
    profile?.contact.is_email_public
      ? profile.contact.email
      : null
  ), [profile]);

  const publicAddress = useMemo(() => {
    if (!profile?.location.is_address_public) {
      return null;
    }

    return [
      profile.location.address,
      profile.location.neighborhood,
      profile.location.location_reference,
    ]
      .filter((
        value,
      ): value is string => Boolean(value?.trim()))
      .join(' · ');
  }, [profile]);

  const loadProfile = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setError({
        title: 'Negocio no identificado',
        message: (
          'No fue posible identificar el perfil comercial '
          + 'que quieres consultar.'
        ),
        retryable: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        profileResponse,
        catalogsResponse,
        offersResponse,
      ] = await Promise.all([
        loadPublicCommercialProfile(profileId),
        loadPublicCommercialCatalogs(profileId),
        loadPublicCommercialOffers(profileId, {
          limit: 20,
          offset: 0,
        }),
      ]);

      setProfile(profileResponse.profile);
      setCatalogs(catalogsResponse.catalogs);
      setOffers(offersResponse.offers);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(main)/beeservices');
  }, [router]);

  const handleOfferPress = useCallback((
    offer: CommercialPublicOffer,
  ) => {
    router.push(
      buddyServicesPublicOfferRoute(offer.id),
    );
  }, [router]);

  const handleMessage = useCallback(() => {
    Alert.alert(
      'Chat comercial',
      (
        'El chat con identidad de negocio se habilitará '
        + 'en el Bloque 7. Por ahora las solicitudes y '
        + 'acciones críticas se gestionan desde pantallas '
        + 'formales.'
      ),
    );
  }, []);

  if (loading && !profile) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            color="#7427D5"
            size="small"
          />

          <Text style={styles.loadingText}>
            Cargando negocio…
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!profile || error) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            {error?.title || 'Negocio no disponible'}
          </Text>

          <Text style={styles.errorText}>
            {error?.message || (
              'Este negocio ya no está disponible.'
            )}
          </Text>

          {error?.retryable ? (
            <TouchableOpacity
              accessibilityLabel="Reintentar carga del negocio"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => void loadProfile()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="Volver a resultados"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={handleBack}
            style={styles.secondaryButton}
          >
            <ArrowLeft
              color="#7427D5"
              size={18}
            />

            <Text style={styles.secondaryButtonText}>
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
            accessibilityLabel="Volver"
            accessibilityRole="button"
            activeOpacity={0.78}
            onPress={handleBack}
            style={styles.backButton}
          >
            <ArrowLeft
              color="#38294E"
              size={23}
            />
          </TouchableOpacity>

          <Text
            numberOfLines={1}
            style={styles.headerTitle}
          >
            Perfil comercial
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={['#7427D5']}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor="#7427D5"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileTop}>
            <ProfileLogo profile={profile} />

            <View style={styles.profileHeading}>
              <View style={styles.nameRow}>
                <Text
                  numberOfLines={2}
                  style={styles.profileName}
                >
                  {profile.display_name}
                </Text>

                {profile.is_verified ? (
                  <BadgeCheck
                    color="#5B2DC7"
                    fill="#EDE2FF"
                    size={20}
                  />
                ) : null}
              </View>

              <Text style={styles.offerType}>
                {offerTypeLabel(profile.offer_type)}
              </Text>

              {profile.category ? (
                <Text style={styles.category}>
                  {profile.category.name}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.description}>
            {profile.description}
          </Text>

          <View style={styles.locationRow}>
            <MapPin
              color="#7A579D"
              size={16}
            />

            <Text style={styles.locationText}>
              {profile.city}, {profile.country_code}
            </Text>
          </View>

          {profile.custom_activity_text ? (
            <View style={styles.activityBox}>
              <Text style={styles.activityLabel}>
                Actividad
              </Text>

              <Text style={styles.activityText}>
                {profile.custom_activity_text}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <TouchableOpacity
              accessibilityLabel="Enviar mensaje al negocio"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={handleMessage}
              style={styles.messageButton}
            >
              <MessageCircle
                color="#FFFFFF"
                size={18}
              />

              <Text style={styles.messageButtonText}>
                Mensaje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Ver ofertas del negocio"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => setActiveTab('home')}
              style={styles.offersButton}
            >
              <Store
                color="#7427D5"
                size={18}
              />

              <Text style={styles.offersButtonText}>
                Ver ofertas
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <ProfileTabButton
              active={activeTab === 'home'}
              label="Inicio"
              onPress={() => setActiveTab('home')}
            />

            <ProfileTabButton
              active={activeTab === 'catalogs'}
              label="Catálogos"
              onPress={() => setActiveTab('catalogs')}
            />

            <ProfileTabButton
              active={activeTab === 'information'}
              label="Información"
              onPress={() => setActiveTab('information')}
            />
          </View>

          {activeTab === 'home' ? (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>
                Ofertas publicadas
              </Text>

              {offers.length > 0 ? (
                offers.map((offer) => (
                  <CommercialOfferCard
                    key={offer.id}
                    offer={offer}
                    onPress={handleOfferPress}
                  />
                ))
              ) : (
                <Text style={styles.tabEmptyText}>
                  Este negocio aún no tiene ofertas publicadas.
                </Text>
              )}
            </View>
          ) : null}

          {activeTab === 'catalogs' ? (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>
                Catálogos publicados
              </Text>

              <CatalogList catalogs={catalogs} />
            </View>
          ) : null}

          {activeTab === 'information' ? (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>
                Información del negocio
              </Text>

              <InfoRow
                icon={<MapPin color="#7A579D" size={18} />}
                label="Ubicación"
                value={
                  publicAddress
                  || `${profile.city}, ${profile.country_code}`
                }
              />

              {publicPhone ? (
                <InfoRow
                  icon={<Phone color="#7A579D" size={18} />}
                  label="Teléfono"
                  value={publicPhone}
                />
              ) : null}

              {publicEmail ? (
                <InfoRow
                  icon={<Mail color="#7A579D" size={18} />}
                  label="Correo"
                  value={publicEmail}
                />
              ) : null}

              <InfoRow
                icon={
                  <CalendarClock
                    color="#7A579D"
                    size={18}
                  />
                }
                label="Modalidades"
                value={
                  profile.modalities.length > 0
                    ? profile.modalities
                      .map(modalityLabel)
                      .join(' · ')
                    : 'No especificadas'
                }
              />

              <Text style={styles.paymentHint}>
                Los pagos, cuando apliquen, se coordinan de forma
                externa. Las instrucciones detalladas solo estarán
                disponibles dentro de una solicitud aceptada.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

function ProfileTabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{
        selected: active,
      }}
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        styles.tabButton,
        active && styles.tabButtonActive,
      ]}
    >
      <Text
        style={[
          styles.tabLabel,
          active && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        {icon}
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFCF9',
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFCF9',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#F0EAF3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 66,
    paddingHorizontal: 20,
  },
  backButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerTitle: {
    color: '#261743',
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingText: {
    color: '#674D85',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  errorTitle: {
    color: '#A82A3A',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: '#78404A',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    textAlign: 'center',
  },
  profileTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logoFallback: {
    alignItems: 'center',
    backgroundColor: '#F1E6FB',
    borderRadius: 23,
    height: 86,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 86,
  },
  logoImage: {
    borderRadius: 23,
    height: 86,
    width: 86,
  },
  logoInitials: {
    color: '#7427D5',
    fontSize: 27,
    fontWeight: '800',
  },
  profileHeading: {
    flex: 1,
    marginLeft: 15,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  profileName: {
    color: '#261743',
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  offerType: {
    color: '#70469B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  category: {
    color: '#8A72B2',
    fontSize: 12,
    marginTop: 3,
  },
  description: {
    color: '#59496B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 19,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 13,
  },
  locationText: {
    color: '#71548E',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  activityBox: {
    backgroundColor: '#F9F3FC',
    borderColor: '#E8D1F1',
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 15,
    padding: 13,
  },
  activityLabel: {
    color: '#7B2DD9',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activityText: {
    color: '#49385B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 21,
  },
  messageButton: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 7,
  },
  offersButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCC5EE',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
  },
  offersButtonText: {
    color: '#7427D5',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 7,
  },
  tabs: {
    borderBottomColor: '#EDE4F2',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 25,
  },
  tabButton: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    minHeight: 43,
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderBottomColor: '#7427D5',
  },
  tabLabel: {
    color: '#8A72A1',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#7427D5',
  },
  tabContent: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#261743',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 13,
  },
  tabEmptyText: {
    color: '#806899',
    fontSize: 13,
    lineHeight: 20,
  },
  catalogList: {
    gap: 10,
  },
  catalogCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  catalogIcon: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  catalogContent: {
    flex: 1,
    marginHorizontal: 11,
  },
  catalogName: {
    color: '#38294E',
    fontSize: 14,
    fontWeight: '800',
  },
  catalogDescription: {
    color: '#806899',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  infoRow: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 13,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  infoContent: {
    flex: 1,
    marginLeft: 11,
  },
  infoLabel: {
    color: '#806899',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#38294E',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  paymentHint: {
    color: '#806899',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#7427D5',
    borderRadius: 13,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#D8C0E9',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#7427D5',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 7,
  },
});
