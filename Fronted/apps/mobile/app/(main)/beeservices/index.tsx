import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ClipboardList,
  PlusCircle,
  Search,
  Store,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import type {
  CommercialCategory,
  CommercialCity,
  CommercialCountry,
  CommercialPublicProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import HomeSideMenu from '../../../src/components/home/HomeSideMenu';
import BeeServicesHeader from '../../../src/components/beeservices/BeeServicesHeader';
import BeeServicesAiSearchCard from '../../../src/components/beeservices/BeeServicesAiSearchCard';
import BeeServicesBusinessCard from '../../../src/components/beeservices/BeeServicesBusinessCard';
import CommercialCategoryGrid from '../../../src/components/buddyservices/CommercialCategoryGrid';
import CommercialLocationSelector from '../../../src/components/buddyservices/CommercialLocationSelector';
import CommercialRecentBusinesses from '../../../src/components/buddyservices/CommercialRecentBusinesses';
import {
  buddyServicesCreateBusinessRoute,
  buddyServicesMyBusinessesRoute,
  buddyServicesMyPurchasesRoute,
  buddyServicesPublicProfileRoute,
  buddyServicesResultsRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
  loadCommercialCities,
  loadCommercialCountries,
  loadOwnedCommercialProfiles,
  loadPublicCommercialCategories,
  loadPublicCommercialProfiles,
} from '../../../src/services/commercialService';
import {
  styles as beeStyles,
} from '../../../src/components/beeservices/beeServicesStyles';

const DEFAULT_COUNTRY_CODE = 'CO';
const RECENT_PROFILES_LIMIT = 10;

type HomeData = {
  categories: CommercialCategory[];
  profiles: CommercialPublicProfile[];
  hasOwnedProfiles: boolean;
};

function getInitialError(): CommercialUiError | null {
  return null;
}

export default function BeeServicesScreen() {
  const router = useRouter();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [countries, setCountries] = useState<
    CommercialCountry[]
  >([]);
  const [cities, setCities] = useState<CommercialCity[]>([]);
  const [countryCode, setCountryCode] = useState(
    DEFAULT_COUNTRY_CODE,
  );
  const [city, setCity] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [homeData, setHomeData] = useState<HomeData>({
    categories: [],
    profiles: [],
    hasOwnedProfiles: false,
  });

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingHome, setLoadingHome] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    getInitialError,
  );

  const loadCountries = useCallback(async () => {
    setLoadingCountries(true);

    try {
      const response = await loadCommercialCountries();

      setCountries(response.countries);

      const supportsDefaultCountry = response.countries.some(
        (item) => item.country_code === DEFAULT_COUNTRY_CODE,
      );

      if (!supportsDefaultCountry && response.countries[0]) {
        setCountryCode(response.countries[0].country_code);
      }
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  const loadCities = useCallback(async (
    selectedCountryCode: string,
  ) => {
    if (!selectedCountryCode) {
      setCities([]);
      setCity(null);
      return;
    }

    setLoadingCities(true);

    try {
      const response = await loadCommercialCities(
        selectedCountryCode,
      );

      setCities(response.cities);
    } catch (loadError) {
      setCities([]);
      setError(toCommercialUiError(loadError));
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const loadHomeData = useCallback(async (
    selectedCountryCode: string,
    selectedCity: string,
  ) => {
    setLoadingHome(true);
    setError(null);

    try {
      const [
        categoriesResponse,
        profilesResponse,
        ownedProfilesResponse,
      ] = await Promise.all([
        loadPublicCommercialCategories({
          country_code: selectedCountryCode,
          city: selectedCity,
        }),
        loadPublicCommercialProfiles({
          country_code: selectedCountryCode,
          city: selectedCity,
          ordering: 'recent',
          limit: RECENT_PROFILES_LIMIT,
          offset: 0,
        }),
        loadOwnedCommercialProfiles(),
      ]);

      setHomeData({
        categories: categoriesResponse.categories,
        profiles: profilesResponse.profiles,
        hasOwnedProfiles: ownedProfilesResponse.profiles.length > 0,
      });
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    setCity(null);
    setHomeData({
      categories: [],
      profiles: [],
      hasOwnedProfiles: false,
    });

    void loadCities(countryCode);
  }, [countryCode, loadCities]);

  useEffect(() => {
    if (!city) {
      return;
    }

    void loadHomeData(countryCode, city);
  }, [city, countryCode, loadHomeData]);

  const handleRetry = useCallback(() => {
    setError(null);

    if (!countries.length) {
      void loadCountries();
    }

    if (countryCode) {
      void loadCities(countryCode);
    }

    if (city) {
      void loadHomeData(countryCode, city);
    }
  }, [
    city,
    countryCode,
    countries.length,
    loadCities,
    loadCountries,
    loadHomeData,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      await loadCountries();
      await loadCities(countryCode);

      if (city) {
        await loadHomeData(countryCode, city);
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    city,
    countryCode,
    loadCities,
    loadCountries,
    loadHomeData,
  ]);

  const handleSelectCountry = useCallback(
    (nextCountryCode: string) => {
      if (nextCountryCode === countryCode) {
        return;
      }

      setCountryCode(nextCountryCode);
    },
    [countryCode],
  );

  const handleSelectCity = useCallback(
    (nextCity: string) => {
      if (nextCity === city) {
        return;
      }

      setCity(nextCity);
      setError(null);
    },
    [city],
  );

  const openResults = useCallback((
    options: {
      categoryId?: string;
      search?: string;
    } = {},
  ) => {
    if (!city) {
      setError({
        title: 'Selecciona una ciudad',
        message: (
          'Elige una ciudad antes de buscar negocios '
          + 'o explorar categorías.'
        ),
        retryable: false,
      });
      return;
    }

    router.push(
      buddyServicesResultsRoute({
        countryCode,
        city,
        categoryId: options.categoryId,
        search: options.search,
      }),
    );
  }, [city, countryCode, router]);

  const handleSearch = useCallback(() => {
    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      setError({
        title: 'Escribe lo que buscas',
        message: (
          'Ingresa el nombre de un negocio, producto '
          + 'o servicio para continuar.'
        ),
        retryable: false,
      });
      return;
    }

    openResults({
      search: normalizedSearch,
    });
  }, [openResults, search]);

  const handleCategoryPress = useCallback((
    category: CommercialCategory,
  ) => {
    openResults({
      categoryId: category.id,
    });
  }, [openResults]);

  const handleProfilePress = useCallback((
    profile: CommercialPublicProfile,
  ) => {
    router.push(
      buddyServicesPublicProfileRoute(profile.id),
    );
  }, [router]);

  const handleBusinessAction = useCallback(() => {
    router.push(
      homeData.hasOwnedProfiles
        ? buddyServicesMyBusinessesRoute()
        : buddyServicesCreateBusinessRoute(),
    );
  }, [homeData.hasOwnedProfiles, router]);

  const hasLocation = Boolean(city);
  const isInitialLoading = (
    loadingCountries
    || loadingCities
  );

  return (
    <ScreenSafeArea style={beeStyles.safeArea}>
      <View style={beeStyles.container}>
        <ScrollView
          contentContainerStyle={beeStyles.content}
          keyboardShouldPersistTaps="handled"
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
          <BeeServicesHeader
            onMenuPress={() => setSideMenuVisible(true)}
          />

          <CommercialLocationSelector
            cities={cities}
            countries={countries}
            countryCode={countryCode}
            city={city}
            disabled={loadingHome}
            loadingCities={loadingCities}
            loadingCountries={loadingCountries}
            onSelectCity={handleSelectCity}
            onSelectCountry={handleSelectCountry}
          />

          <BeeServicesAiSearchCard
            onPressSearch={() => openResults()}
            onPressVoice={() => {
              setError({
                title: 'Búsqueda por voz próximamente',
                message: (
                  'Por ahora usa la búsqueda manual '
                  + 'para encontrar negocios y servicios.'
                ),
                retryable: false,
              });
            }}
          />

          <View style={localStyles.searchSection}>
            <Text style={beeStyles.sectionTitle}>
              Busca negocios y servicios
            </Text>

            <View style={localStyles.searchRow}>
              <TextInput
                accessibilityLabel="Buscar negocios, productos o servicios"
                autoCapitalize="sentences"
                editable={!isInitialLoading}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
                placeholder="Ej. técnico, barbería, comida…"
                placeholderTextColor="#9B87AE"
                returnKeyType="search"
                style={localStyles.searchInput}
                value={search}
              />

              <TouchableOpacity
                accessibilityLabel="Buscar"
                accessibilityRole="button"
                activeOpacity={0.8}
                disabled={isInitialLoading}
                onPress={handleSearch}
                style={[
                  localStyles.searchButton,
                  isInitialLoading
                    && localStyles.searchButtonDisabled,
                ]}
              >
                <Search
                  color="#FFFFFF"
                  size={20}
                />
              </TouchableOpacity>
            </View>
          </View>

          <BeeServicesBusinessCard
            onPress={handleBusinessAction}
          />

          <View style={beeStyles.section}>
            <Text style={beeStyles.sectionTitle}>
              Accesos rápidos
            </Text>

            <View style={beeStyles.quickActionsRow}>
              <TouchableOpacity
                accessibilityLabel="Ver mis compras y reservas"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => router.push(
                  buddyServicesMyPurchasesRoute(),
                )}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <ClipboardList
                    color="#7B2DD9"
                    size={17}
                  />
                </View>

                <Text style={beeStyles.quickActionLabel}>
                  Mis compras
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={
                  homeData.hasOwnedProfiles
                    ? 'Abrir mis negocios'
                    : 'Crear mi primer perfil comercial'
                }
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={handleBusinessAction}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  {homeData.hasOwnedProfiles ? (
                    <Store
                      color="#7B2DD9"
                      size={17}
                    />
                  ) : (
                    <PlusCircle
                      color="#7B2DD9"
                      size={17}
                    />
                  )}
                </View>

                <Text style={beeStyles.quickActionLabel}>
                  {homeData.hasOwnedProfiles
                    ? 'Mis negocios'
                    : 'Crear negocio'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Ver todos los resultados"
                accessibilityRole="button"
                activeOpacity={0.78}
                disabled={!hasLocation}
                onPress={() => openResults()}
                style={[
                  beeStyles.quickActionCard,
                  !hasLocation && localStyles.disabledAction,
                ]}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <Search
                    color="#7B2DD9"
                    size={17}
                  />
                </View>

                <Text style={beeStyles.quickActionLabel}>
                  Explorar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View
              accessibilityLiveRegion="polite"
              style={localStyles.errorCard}
            >
              <Text style={localStyles.errorTitle}>
                {error.title}
              </Text>

              <Text style={localStyles.errorMessage}>
                {error.message}
              </Text>

              {error.retryable ? (
                <TouchableOpacity
                  accessibilityLabel="Reintentar carga de BuddyServices"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={handleRetry}
                  style={localStyles.retryButton}
                >
                  <Text style={localStyles.retryButtonText}>
                    Reintentar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {!hasLocation && !error ? (
            <View style={localStyles.locationEmptyState}>
              <Store
                color="#7B2DD9"
                size={25}
              />

              <Text style={localStyles.locationEmptyTitle}>
                Elige una ciudad para comenzar
              </Text>

              <Text style={localStyles.locationEmptyText}>
                Mostraremos negocios y categorías disponibles
                en la ciudad seleccionada.
              </Text>
            </View>
          ) : null}

          {hasLocation && loadingHome ? (
            <View style={localStyles.loadingCard}>
              <ActivityIndicator
                color="#7427D5"
                size="small"
              />

              <Text style={localStyles.loadingText}>
                Cargando negocios en {city}…
              </Text>
            </View>
          ) : null}

          {hasLocation && !loadingHome ? (
            <>
              <CommercialCategoryGrid
                categories={homeData.categories}
                disabled={false}
                onPressCategory={handleCategoryPress}
              />

              <CommercialRecentBusinesses
                onPressProfile={handleProfilePress}
                profiles={homeData.profiles}
              />

              {(
                homeData.categories.length === 0
                && homeData.profiles.length === 0
                && !error
              ) ? (
                <View style={localStyles.locationEmptyState}>
                  <Store
                    color="#7B2DD9"
                    size={25}
                  />

                  <Text style={localStyles.locationEmptyTitle}>
                    Aún no hay negocios disponibles
                  </Text>

                  <Text style={localStyles.locationEmptyText}>
                    Prueba con otra ciudad o vuelve más tarde.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          <View style={beeStyles.footer}>
            <Text style={beeStyles.footerText}>
              Impulsando economías locales con Buddy AI
            </Text>

            <View style={beeStyles.footerLine} />
          </View>
        </ScrollView>

        <HomeSideMenu
          onClose={() => setSideMenuVisible(false)}
          visible={sideMenuVisible}
        />
      </View>
    </ScreenSafeArea>
  );
}

const localStyles = StyleSheet.create({
  searchSection: {
    marginBottom: 27,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE1F1',
    borderBottomLeftRadius: 14,
    borderTopLeftRadius: 14,
    borderWidth: 1,
    color: '#38294E',
    flex: 1,
    fontSize: 14,
    minHeight: 49,
    paddingHorizontal: 14,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderBottomRightRadius: 14,
    borderTopRightRadius: 14,
    height: 49,
    justifyContent: 'center',
    width: 52,
  },
  searchButtonDisabled: {
    opacity: 0.55,
  },
  disabledAction: {
    opacity: 0.5,
  },
  errorCard: {
    backgroundColor: '#FFF4F4',
    borderColor: '#F2C9CC',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  errorTitle: {
    color: '#A82A3A',
    fontSize: 15,
    fontWeight: '800',
  },
  errorMessage: {
    color: '#78404A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#A82A3A',
    borderRadius: 10,
    marginTop: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  locationEmptyState: {
    alignItems: 'center',
    backgroundColor: '#F9F3FC',
    borderColor: '#E8D1F1',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginBottom: 26,
    paddingHorizontal: 23,
    paddingVertical: 25,
  },
  locationEmptyTitle: {
    color: '#38294E',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  locationEmptyText: {
    color: '#866D9F',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#F9F3FC',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 26,
    minHeight: 84,
    paddingHorizontal: 16,
  },
  loadingText: {
    color: '#674D85',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
});
