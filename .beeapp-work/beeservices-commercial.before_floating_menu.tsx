import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ChevronRight,
  ClipboardList,
  PlusCircle,
  Search,
  Store,
} from "lucide-react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import type {
  CommercialOwnedProfile,
  CommercialPublicOffer,
  CommercialPublicProfile,
} from "@beeapp/shared-types";

import ScreenSafeArea from "../../src/components/layout/ScreenSafeArea";
import HomeSideMenu from "../../src/components/home/HomeSideMenu";
import BeeServicesHeader from "../../src/components/beeservices/BeeServicesHeader";
import BeeServicesAiSearchCard from "../../src/components/beeservices/BeeServicesAiSearchCard";
import BeeServicesBusinessCard from "../../src/components/beeservices/BeeServicesBusinessCard";
import CommercialOfferCard from "../../src/components/buddyservices/CommercialOfferCard";
import CommercialRecentBusinesses from "../../src/components/buddyservices/CommercialRecentBusinesses";
import {
  buddyServicesCreateBusinessRoute,
  buddyServicesMyBusinessesRoute,
  buddyServicesMyPurchasesRoute,
  buddyServicesPublicOfferRoute,
  buddyServicesPublicProfileRoute,
} from "../../src/features/buddyservices/commercialRoutes";
import {
  toCommercialUiError,
  type CommercialUiError,
} from "../../src/features/buddyservices/commercialErrors";
import {
  loadOwnedCommercialProfile,
  loadOwnedCommercialProfiles,
  loadPublicCommercialProductFeed,
} from "../../src/services/commercialService";
import { styles as beeStyles } from "../../src/components/beeservices/beeServicesStyles";

const INITIAL_PRODUCT_FEED_LIMIT = 4;
const NEXT_PRODUCT_FEED_LIMIT = 2;
const PRODUCT_FEED_END_REACHED_THRESHOLD = 140;
const SEARCH_DEBOUNCE_MS = 350;
const MINIMUM_SEARCH_LENGTH = 2;

function getInitialError(): CommercialUiError | null {
  return null;
}

export default function BeeServicesCommercialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();
  const routeBusinessId = Array.isArray(params.businessId)
    ? params.businessId[0]
    : params.businessId;
  const selectedBusinessId = String(routeBusinessId || "").trim();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] =
    useState<CommercialOwnedProfile | null>(null);
  const [selectedBusinessError, setSelectedBusinessError] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const searchRequestVersionRef = useRef(0);
  const [searchProfiles, setSearchProfiles] = useState<
    CommercialPublicProfile[]
  >([]);
  const [hasMoreSearchProfiles, setHasMoreSearchProfiles] = useState(false);
  const [productFeed, setProductFeed] = useState<CommercialPublicOffer[]>([]);
  const [productFeedSeed, setProductFeedSeed] = useState("");
  const [loadingProductFeed, setLoadingProductFeed] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const [, setHasOwnedProfiles] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(getInitialError);

  const loadProductFeed = useCallback(
    async (
      options: {
        search?: string;
        seed?: string;
      } = {},
    ) => {
      const normalizedSearch = String(options.search || "").trim();
      const requestVersion = searchRequestVersionRef.current;

      setLoadingProductFeed(true);

      try {
        const response = await loadPublicCommercialProductFeed({
          limit: INITIAL_PRODUCT_FEED_LIMIT,
          offset: 0,
          search: normalizedSearch || undefined,
          seed: normalizedSearch ? undefined : options.seed,
        });

        if (requestVersion !== searchRequestVersionRef.current) {
          return;
        }

        setProductFeed(response.offers);
        setProductFeedSeed(response.seed);
        setHasMoreProducts(response.has_more);
        setSearchProfiles(response.profiles || []);
        setHasMoreSearchProfiles(Boolean(response.profiles_has_more));
        setActiveSearch(normalizedSearch);
        setError(null);
      } catch (loadError) {
        if (requestVersion !== searchRequestVersionRef.current) {
          return;
        }

        setProductFeed([]);
        setSearchProfiles([]);
        setHasMoreProducts(false);
        setHasMoreSearchProfiles(false);
        setError(toCommercialUiError(loadError));
      } finally {
        if (requestVersion === searchRequestVersionRef.current) {
          setLoadingProductFeed(false);
        }
      }
    },
    [],
  );

  const loadOwnedProfilesState = useCallback(async () => {
    try {
      const response = await loadOwnedCommercialProfiles();
      setHasOwnedProfiles(response.profiles.length > 0);
    } catch {
      setHasOwnedProfiles(false);
    }
  }, []);

  const loadSelectedBusiness = useCallback(async () => {
    if (!selectedBusinessId) {
      setSelectedBusiness(null);
      setSelectedBusinessError(null);
      return;
    }

    try {
      const response = await loadOwnedCommercialProfile(selectedBusinessId);

      setSelectedBusiness(response.profile);
      setSelectedBusinessError(null);
    } catch (loadError) {
      setSelectedBusiness(null);
      setSelectedBusinessError(toCommercialUiError(loadError).message);
    }
  }, [selectedBusinessId]);

  useFocusEffect(
    useCallback(() => {
      void loadProductFeed();
      void loadOwnedProfilesState();
      void loadSelectedBusiness();
    }, [loadOwnedProfilesState, loadProductFeed, loadSelectedBusiness]),
  );

  const handleRetry = useCallback(() => {
    setError(null);
    searchRequestVersionRef.current += 1;
    void loadProductFeed({
      search: activeSearch || undefined,
    });
    void loadOwnedProfilesState();
  }, [activeSearch, loadOwnedProfilesState, loadProductFeed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    searchRequestVersionRef.current += 1;

    try {
      await Promise.all([
        loadProductFeed({
          search: activeSearch || undefined,
        }),
        loadOwnedProfilesState(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [activeSearch, loadOwnedProfilesState, loadProductFeed]);

  const handleLoadMoreProducts = useCallback(async () => {
    if (
      loadingMoreProducts ||
      loadingProductFeed ||
      (!hasMoreProducts && (!activeSearch || !hasMoreSearchProfiles))
    ) {
      return;
    }

    const requestVersion = searchRequestVersionRef.current;

    setLoadingMoreProducts(true);

    try {
      const response = await loadPublicCommercialProductFeed({
        limit: NEXT_PRODUCT_FEED_LIMIT,
        offset: productFeed.length,
        search: activeSearch || undefined,
        seed: activeSearch ? undefined : productFeedSeed || undefined,
      });

      if (requestVersion !== searchRequestVersionRef.current) {
        return;
      }

      setProductFeed((current) => {
        const existingIds = new Set(current.map((offer) => offer.id));

        return [
          ...current,
          ...response.offers.filter((offer) => !existingIds.has(offer.id)),
        ];
      });
      if (activeSearch) {
        setSearchProfiles((current) => {
          const existingIds = new Set(current.map((profile) => profile.id));

          return [
            ...current,
            ...(response.profiles || []).filter(
              (profile) => !existingIds.has(profile.id),
            ),
          ];
        });
        setHasMoreSearchProfiles(Boolean(response.profiles_has_more));
      }

      setProductFeedSeed(response.seed);
      setHasMoreProducts(response.has_more);
      setError(null);
    } catch (loadError) {
      if (requestVersion === searchRequestVersionRef.current) {
        setError(toCommercialUiError(loadError));
      }
    } finally {
      if (requestVersion === searchRequestVersionRef.current) {
        setLoadingMoreProducts(false);
      }
    }
  }, [
    activeSearch,
    hasMoreProducts,
    loadingMoreProducts,
    loadingProductFeed,
    productFeed.length,
    productFeedSeed,
  ]);

  const runSearch = useCallback(
    (value: string) => {
      const normalizedSearch = value.trim();

      searchRequestVersionRef.current += 1;

      if (!normalizedSearch) {
        setActiveSearch("");
        setError(null);
        void loadProductFeed();
        return;
      }

      if (normalizedSearch.length < MINIMUM_SEARCH_LENGTH) {
        setActiveSearch("");
        setError(null);
        return;
      }

      setError(null);
      void loadProductFeed({
        search: normalizedSearch,
      });
    },
    [loadProductFeed],
  );

  useEffect(() => {
    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      return;
    }

    if (normalizedSearch.length < MINIMUM_SEARCH_LENGTH) {
      searchRequestVersionRef.current += 1;
      setActiveSearch("");
      setLoadingProductFeed(false);
      setLoadingMoreProducts(false);
      setHasMoreProducts(false);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      runSearch(normalizedSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [runSearch, search]);

  const handleSearch = useCallback(() => {
    runSearch(search);
  }, [runSearch, search]);

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
              colors={["#7427D5"]}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor="#7427D5"
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const distanceToEnd =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;

            if (distanceToEnd <= PRODUCT_FEED_END_REACHED_THRESHOLD) {
              void handleLoadMoreProducts();
            }
          }}
          scrollEventThrottle={160}
        >
          <BeeServicesHeader
            title="BuddyService comercial"
            onBackToMainPress={() => router.replace("/(main)")}
            onMenuPress={() => setSideMenuVisible(true)}
          />

          {selectedBusiness ? (
            <View style={localStyles.selectedBusinessCard}>
              <View style={localStyles.selectedBusinessIcon}>
                <Store color="#7427D5" size={19} />
              </View>

              <View style={localStyles.selectedBusinessContent}>
                <Text style={localStyles.selectedBusinessLabel}>
                  Negocio seleccionado
                </Text>

                <Text
                  numberOfLines={1}
                  style={localStyles.selectedBusinessName}
                >
                  {selectedBusiness.display_name}
                </Text>

                <Text
                  numberOfLines={1}
                  style={localStyles.selectedBusinessMeta}
                >
                  {`${selectedBusiness.city}, ${selectedBusiness.country_code}`}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Cambiar negocio seleccionado"
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={handleBusinessAction}
                style={localStyles.changeBusinessButton}
              >
                <Text style={localStyles.changeBusinessText}>Cambiar</Text>

                <ChevronRight color="#7427D5" size={16} />
              </TouchableOpacity>
            </View>
          ) : selectedBusinessError ? (
            <TouchableOpacity
              accessibilityLabel="Elegir otro negocio"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={handleBusinessAction}
              style={localStyles.selectedBusinessErrorCard}
            >
              <Store color="#9A5B00" size={18} />

              <Text style={localStyles.selectedBusinessErrorText}>
                {selectedBusinessError}
              </Text>

              <ChevronRight color="#9A5B00" size={17} />
            </TouchableOpacity>
          ) : null}

          <BeeServicesAiSearchCard
            onPressSearch={() => {
              setError({
                title: "Búsqueda próximamente",
                message:
                  "Estamos preparando la búsqueda general de " +
                  "productos y servicios.",
                retryable: false,
              });
            }}
            onPressVoice={() => {
              setError({
                title: "Búsqueda por voz próximamente",
                message:
                  "Por ahora usa la búsqueda manual " +
                  "para encontrar negocios y servicios.",
                retryable: false,
              });
            }}
          />

          <BeeServicesBusinessCard onPress={handleBusinessAction} />

          <View style={beeStyles.section}>
            <Text style={beeStyles.sectionTitle}>Accesos rápidos</Text>

            <View style={beeStyles.quickActionsRow}>
              <TouchableOpacity
                accessibilityLabel="Ver mis compras y reservas"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => router.push(buddyServicesMyPurchasesRoute())}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <ClipboardList color="#7B2DD9" size={17} />
                </View>

                <Text style={beeStyles.quickActionLabel}>Mis compras</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Abrir mis negocios"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={handleBusinessAction}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <Store color="#7B2DD9" size={17} />
                </View>

                <Text style={beeStyles.quickActionLabel}>Mis negocios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Crear negocio"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => router.push(buddyServicesCreateBusinessRoute())}
                style={beeStyles.quickActionCard}
              >
                <View style={beeStyles.quickActionIconWrap}>
                  <PlusCircle color="#7B2DD9" size={17} />
                </View>

                <Text style={beeStyles.quickActionLabel}>Crear negocio</Text>
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
                  isInitialLoading && localStyles.searchButtonDisabled,
                ]}
              >
                <Search color="#FFFFFF" size={20} />
              </TouchableOpacity>
            </View>

            {search.trim().length === 1 ? (
              <Text style={localStyles.searchHint}>
                Escribe al menos 2 caracteres para buscar.
              </Text>
            ) : null}
          </View>

          {error ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={localStyles.errorCard}
            >
              <Text style={localStyles.errorTitle}>{error.title}</Text>

              <Text style={localStyles.errorMessage}>{error.message}</Text>

              {error.retryable ? (
                <TouchableOpacity
                  accessibilityLabel="Reintentar carga de BuddyServices"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={handleRetry}
                  style={localStyles.retryButton}
                >
                  <Text style={localStyles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {loadingProductFeed ? (
            <View style={localStyles.loadingCard}>
              <ActivityIndicator color="#7427D5" size="small" />

              <Text style={localStyles.loadingText}>
                {activeSearch
                  ? "Buscando coincidencias…"
                  : "Cargando productos y servicios…"}
              </Text>
            </View>
          ) : null}

          {!loadingProductFeed && !error && productFeed.length === 0 ? (
            <View style={localStyles.locationEmptyState}>
              <Store color="#7B2DD9" size={25} />

              <Text style={localStyles.locationEmptyTitle}>
                {activeSearch
                  ? "No encontramos coincidencias"
                  : "Aún no hay productos disponibles"}
              </Text>

              <Text style={localStyles.locationEmptyText}>
                {activeSearch
                  ? "Prueba con otro nombre, producto o servicio."
                  : "Vuelve a intentarlo más tarde."}
              </Text>
            </View>
          ) : null}

          {!loadingProductFeed && activeSearch && searchProfiles.length > 0 ? (
            <CommercialRecentBusinesses
              profiles={searchProfiles}
              onPressProfile={(profile) =>
                router.push(buddyServicesPublicProfileRoute(profile.id))
              }
            />
          ) : null}

          {!loadingProductFeed && productFeed.length > 0 ? (
            <View style={beeStyles.section}>
              <Text style={beeStyles.sectionTitle}>
                {activeSearch
                  ? "Productos y servicios"
                  : "Productos y servicios destacados"}
              </Text>

              {productFeed.map((offer) => (
                <CommercialOfferCard
                  key={offer.id}
                  offer={offer}
                  onPress={(selectedOffer) =>
                    router.push(buddyServicesPublicOfferRoute(selectedOffer.id))
                  }
                />
              ))}

              {loadingMoreProducts ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={localStyles.loadingMoreRow}
                >
                  <ActivityIndicator color="#7427D5" size="small" />

                  <Text style={localStyles.loadingMoreText}>
                    {activeSearch
                      ? "Cargando más resultados…"
                      : "Cargando más productos…"}
                  </Text>
                </View>
              ) : null}

              {!hasMoreProducts && !loadingMoreProducts ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={localStyles.feedEndCard}
                >
                  <View style={localStyles.feedEndLine} />

                  <Text style={localStyles.feedEndTitle}>
                    Eso es todo por ahora
                  </Text>

                  <Text style={localStyles.feedEndText}>
                    {activeSearch
                      ? "Ya viste todas las coincidencias disponibles."
                      : "Ya viste todos los productos disponibles. " +
                        "Vuelve pronto para descubrir nuevas opciones."}
                  </Text>
                </View>
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
  selectedBusinessCard: {
    alignItems: "center",
    backgroundColor: "#F9F5FF",
    borderColor: "#DECDF3",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 18,
    padding: 13,
  },
  selectedBusinessIcon: {
    alignItems: "center",
    backgroundColor: "#EDE1FB",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  selectedBusinessContent: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  selectedBusinessLabel: {
    color: "#7D6099",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  selectedBusinessName: {
    color: "#321650",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  selectedBusinessMeta: {
    color: "#786593",
    fontSize: 11,
    marginTop: 2,
  },
  changeBusinessButton: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 8,
    paddingVertical: 8,
  },
  changeBusinessText: {
    color: "#7427D5",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 1,
  },
  selectedBusinessErrorCard: {
    alignItems: "center",
    backgroundColor: "#FFF8E9",
    borderColor: "#F1D490",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 18,
    padding: 13,
  },
  selectedBusinessErrorText: {
    color: "#7A4800",
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 9,
  },
  searchSection: {
    marginBottom: 27,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EAE1F1",
    borderBottomLeftRadius: 14,
    borderTopLeftRadius: 14,
    borderWidth: 1,
    color: "#38294E",
    flex: 1,
    fontSize: 14,
    minHeight: 49,
    paddingHorizontal: 14,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#7427D5",
    borderBottomRightRadius: 14,
    borderTopRightRadius: 14,
    height: 49,
    justifyContent: "center",
    width: 52,
  },
  searchButtonDisabled: {
    opacity: 0.55,
  },
  searchHint: {
    color: "#886B9F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
    paddingHorizontal: 2,
  },
  loadingMoreRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 42,
  },
  loadingMoreText: {
    color: "#6A5585",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 9,
  },
  feedEndCard: {
    alignItems: "center",
    backgroundColor: "#FBF8FE",
    borderColor: "#E8DDF4",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  feedEndLine: {
    backgroundColor: "#CDA8EE",
    borderRadius: 999,
    height: 4,
    marginBottom: 11,
    width: 42,
  },
  feedEndTitle: {
    color: "#432064",
    fontSize: 14,
    fontWeight: "800",
  },
  feedEndText: {
    color: "#786593",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  disabledAction: {
    opacity: 0.5,
  },
  createBusinessNotice: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#D9C2F0",
    borderRadius: 18,
    borderWidth: 1,
    bottom: 24,
    elevation: 8,
    flexDirection: "row",
    left: 18,
    padding: 14,
    position: "absolute",
    right: 18,
    shadowColor: "#3D245E",
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    zIndex: 10,
  },
  createBusinessNoticeIcon: {
    alignItems: "center",
    backgroundColor: "#F6EAFE",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    marginRight: 11,
    width: 42,
  },
  createBusinessNoticeContent: {
    flex: 1,
    paddingRight: 5,
  },
  createBusinessNoticeTitle: {
    color: "#261743",
    fontSize: 14,
    fontWeight: "800",
  },
  createBusinessNoticeMessage: {
    color: "#786593",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  createBusinessNoticeAction: {
    alignSelf: "flex-start",
    backgroundColor: "#7427D5",
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createBusinessNoticeActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  createBusinessNoticeClose: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    marginLeft: 2,
    marginTop: -3,
    width: 28,
  },
  errorCard: {
    backgroundColor: "#FFF4F4",
    borderColor: "#F2C9CC",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  errorTitle: {
    color: "#A82A3A",
    fontSize: 15,
    fontWeight: "800",
  },
  errorMessage: {
    color: "#78404A",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#A82A3A",
    borderRadius: 10,
    marginTop: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  locationEmptyState: {
    alignItems: "center",
    backgroundColor: "#F9F3FC",
    borderColor: "#E8D1F1",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    marginBottom: 26,
    paddingHorizontal: 23,
    paddingVertical: 25,
  },
  locationEmptyTitle: {
    color: "#38294E",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  locationEmptyText: {
    color: "#866D9F",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "#F9F3FC",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 26,
    minHeight: 84,
    paddingHorizontal: 16,
  },
  loadingText: {
    color: "#674D85",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
});
