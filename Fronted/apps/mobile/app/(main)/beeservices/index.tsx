import {
  useCallback,
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
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import type {
  CommercialPublicOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import HomeSideMenu from '../../../src/components/home/HomeSideMenu';
import BeeServicesHeader from '../../../src/components/beeservices/BeeServicesHeader';
import BeeServicesAiSearchCard from '../../../src/components/beeservices/BeeServicesAiSearchCard';
import BeeServicesBusinessCard from '../../../src/components/beeservices/BeeServicesBusinessCard';
import CommercialOfferCard from '../../../src/components/buddyservices/CommercialOfferCard';
import {
  buddyServicesCreateBusinessRoute,
  buddyServicesMyBusinessesRoute,
  buddyServicesMyPurchasesRoute,
  buddyServicesPublicOfferRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
  loadOwnedCommercialProfiles,
  loadPublicCommercialProductFeed,
} from '../../../src/services/commercialService';
import {
  styles as beeStyles,
} from '../../../src/components/beeservices/beeServicesStyles';

const PRODUCT_FEED_LIMIT = 12;

function getInitialError(): CommercialUiError | null {
  return null;
}

export default function BeeServicesScreen() {
  const router = useRouter();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [productFeed, setProductFeed] = useState<
    CommercialPublicOffer[]
  >([]);
  const [productFeedSeed, setProductFeedSeed] = useState('');
  const [loadingProductFeed, setLoadingProductFeed] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const [, setHasOwnedProfiles] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    getInitialError,
  );

  const loadProductFeed = useCallback(async (
    seed?: string,
  ) => {
    setLoadingProductFeed(true);

    try {
      const response = await loadPublicCommercialProductFeed({
        limit: PRODUCT_FEED_LIMIT,
        offset: 0,
        seed,
      });

      setProductFeed(response.offers);
      setProductFeedSeed(response.seed);
      setHasMoreProducts(response.has_more);
      setError(null);
    } catch (loadError) {
      setProductFeed([]);
      setHasMoreProducts(false);
      setError(toCommercialUiError(loadError));
    } finally {
      setLoadingProductFeed(false);
    }
  }, []);

  const loadOwnedProfilesState = useCallback(async () => {
    try {
      const response = await loadOwnedCommercialProfiles();
      setHasOwnedProfiles(response.profiles.length > 0);
    } catch {
      setHasOwnedProfiles(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProductFeed();
      void loadOwnedProfilesState();
    }, [
      loadOwnedProfilesState,
      loadProductFeed,
    ]),
  );

  const handleRetry = useCallback(() => {
    setError(null);
    void loadProductFeed(productFeedSeed || undefined);
    void loadOwnedProfilesState();
  }, [
    loadOwnedProfilesState,
    loadProductFeed,
    productFeedSeed,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      await Promise.all([
        loadProductFeed(productFeedSeed || undefined),
        loadOwnedProfilesState(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadOwnedProfilesState,
    loadProductFeed,
    productFeedSeed,
  ]);

  const handleLoadMoreProducts = useCallback(async () => {
    if (
      loadingMoreProducts
      || loadingProductFeed
      || !hasMoreProducts
    ) {
      return;
    }

    setLoadingMoreProducts(true);

    try {
      const response = await loadPublicCommercialProductFeed({
        limit: PRODUCT_FEED_LIMIT,
        offset: productFeed.length,
        seed: productFeedSeed || undefined,
      });

      setProductFeed((current) => {
        const existingIds = new Set(
          current.map((offer) => offer.id),
        );

        return [
          ...current,
          ...response.offers.filter(
            (offer) => !existingIds.has(offer.id),
          ),
        ];
      });
      setProductFeedSeed(response.seed);
      setHasMoreProducts(response.has_more);
      setError(null);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoadingMoreProducts(false);
    }
  }, [
    hasMoreProducts,
    loadingMoreProducts,
    loadingProductFeed,
    productFeed.length,
    productFeedSeed,
  ]);

  const handleSearch = useCallback(() => {
    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      setError({
        title: "Escribe lo que buscas",
        message: (
          "Ingresa el nombre de un negocio, producto "
          + "o servicio para continuar."
        ),
        retryable: false,
      });
      return;
    }

    setError({
      title: 'Búsqueda próximamente',
      message: (
        'Estamos preparando la búsqueda general de '
        + 'productos y servicios.'
      ),
      retryable: false,
    });
  }, [search]);

  const handleBusinessAction = useCallback(() => {
    router.push(buddyServicesMyBusinessesRoute());
  }, [router]);

  const isInitialLoading = loadingProductFeed;

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
            onBackToMainPress={() => router.replace("/(main)")}
            onMenuPress={() => setSideMenuVisible(true)}
          />


          <BeeServicesAiSearchCard
            onPressSearch={() => {
              setError({
                title: 'Búsqueda próximamente',
                message: (
                  'Estamos preparando la búsqueda general de '
                  + 'productos y servicios.'
                ),
                retryable: false,
              });
            }}
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
                accessibilityLabel="Abrir mis negocios"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={handleBusinessAction}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <Store
                    color="#7B2DD9"
                    size={17}
                  />
                </View>

                <Text style={beeStyles.quickActionLabel}>
                  Mis negocios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Crear negocio"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => router.push(
                  buddyServicesCreateBusinessRoute(),
                )}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <PlusCircle
                    color="#7B2DD9"
                    size={17}
                  />
                </View>

                <Text style={beeStyles.quickActionLabel}>
                  Crear negocio
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
accessibilityState={{
disabled: isInitialLoading,
}}
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

          {error ? (
            <View
              accessibilityLiveRegion="polite"
accessibilityRole="alert"
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

            {loadingProductFeed ? (
              <View style={localStyles.loadingCard}>
                <ActivityIndicator
                  color="#7427D5"
                  size="small"
                />

                <Text style={localStyles.loadingText}>
                  Cargando productos y servicios…
                </Text>
              </View>
            ) : null}

            {!loadingProductFeed && !error && productFeed.length === 0 ? (
              <View style={localStyles.locationEmptyState}>
                <Store
                  color="#7B2DD9"
                  size={25}
                />

                <Text style={localStyles.locationEmptyTitle}>
                  Aún no hay productos disponibles
                </Text>

                <Text style={localStyles.locationEmptyText}>
                  Vuelve a intentarlo más tarde.
                </Text>
              </View>
            ) : null}

            {!loadingProductFeed && productFeed.length > 0 ? (
              <View style={beeStyles.section}>
                <Text style={beeStyles.sectionTitle}>
                  Productos y servicios destacados
                </Text>

                {productFeed.map((offer) => (
                  <CommercialOfferCard
                    key={offer.id}
                    offer={offer}
                    onPress={(selectedOffer) => router.push(
                      buddyServicesPublicOfferRoute(
                        selectedOffer.id,
                      ),
                    )}
                  />
                ))}

                {hasMoreProducts ? (
                  <TouchableOpacity
                    accessibilityLabel="Cargar más productos y servicios"
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    disabled={loadingMoreProducts}
                    onPress={handleLoadMoreProducts}
                    style={[
                      localStyles.loadMoreButton,
                      loadingMoreProducts
                        && localStyles.searchButtonDisabled,
                    ]}
                  >
                    {loadingMoreProducts ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />
                    ) : (
                      <Text style={localStyles.loadMoreButtonText}>
                        Cargar más
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
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
    loadMoreButton: {
      alignItems: 'center',
      backgroundColor: '#7427D5',
      borderRadius: 12,
      justifyContent: 'center',
      marginTop: 4,
      minHeight: 46,
      paddingHorizontal: 18,
    },
    loadMoreButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  disabledAction: {
    opacity: 0.5,
  },
  createBusinessNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#D9C2F0',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 24,
    elevation: 8,
    flexDirection: 'row',
    left: 18,
    padding: 14,
    position: 'absolute',
    right: 18,
    shadowColor: '#3D245E',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    zIndex: 10,
  },
  createBusinessNoticeIcon: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    marginRight: 11,
    width: 42,
  },
  createBusinessNoticeContent: {
    flex: 1,
    paddingRight: 5,
  },
  createBusinessNoticeTitle: {
    color: '#261743',
    fontSize: 14,
    fontWeight: '800',
  },
  createBusinessNoticeMessage: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  createBusinessNoticeAction: {
    alignSelf: 'flex-start',
    backgroundColor: '#7427D5',
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createBusinessNoticeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  createBusinessNoticeClose: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginLeft: 2,
    marginTop: -3,
    width: 28,
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
