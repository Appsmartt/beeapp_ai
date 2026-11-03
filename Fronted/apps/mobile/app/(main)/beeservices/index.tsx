import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ClipboardList,
  LayoutGrid,
  List,
  Store,
} from 'lucide-react-native';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import type {
  CommercialModality,
  CommercialOfferType,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import HomeSideMenu from '../../../src/components/home/HomeSideMenu';
import BeeServicesBusinessFilter from '../../../src/components/beeservices/BeeServicesBusinessFilter';
import BeeServicesHeader from '../../../src/components/beeservices/BeeServicesHeader';
import BeeServicesAiSearchCard from '../../../src/components/beeservices/BeeServicesAiSearchCard';
import BuddyServicesListPagination from '../../../src/components/beeservices/BuddyServicesListPagination';
import CommercialOfferCard from '../../../src/components/buddyservices/CommercialOfferCard';
import CommercialRecentBusinesses from '../../../src/components/buddyservices/CommercialRecentBusinesses';
import {
  buddyServicesMyPurchasesRoute,
  buddyServicesPublicOfferRoute,
  buddyServicesPublicProfileRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import type {
  CommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import { useBuddyServicesAiSearch } from '../../../src/features/buddyservices/useBuddyServicesAiSearch';
import {
  useBuddyServicesFeedPages,
} from '../../../src/features/buddyservices/useBuddyServicesFeedPages';
import {
  loadOwnedCommercialProfiles,
} from '../../../src/services/commercialService';
import {
  styles as beeStyles,
} from '../../../src/components/beeservices/beeServicesStyles';

const SEARCH_DEBOUNCE_MS = 350;
const MINIMUM_SEARCH_LENGTH = 2;

function getInitialError(): CommercialUiError | null {
  return null;
}

export default function BeeServicesScreen() {
  const router = useRouter();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [offerViewMode, setOfferViewMode] = useState<'grid' | 'list'>(
    'grid',
  );
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [offerType, setOfferType] = useState<
    CommercialOfferType | null
  >(null);
  const [modality, setModality] = useState<
    CommercialModality | null
  >(null);
  const skipEmptySearchEffectRef = useRef(true);
  const scrollRef = useRef<ScrollView>(null);
  const resultsOffsetRef = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;
  const activeSearchRef = useRef(activeSearch);
  activeSearchRef.current = activeSearch;
  const businessFiltersRef = useRef({
    offerType,
    modality,
  });
  businessFiltersRef.current = {
    offerType,
    modality,
  };
  const skipFilterEffectRef = useRef(true);

  const [, setHasOwnedProfiles] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    getInitialError,
  );

  const {
    productFeed,
    searchProfiles,
    offersPage,
    offersTotalCount,
    profilesPage,
    profilesTotalCount,
    loadingProductFeed,
    pagingOffers,
    pagingProfiles,
    searchRequestVersionRef,
    loadProductFeed,
    goToOffersPage,
    goToProfilesPage,
  } = useBuddyServicesFeedPages({
    onError: setError,
  });

  const loadOwnedProfilesState = useCallback(async () => {
    try {
      const response = await loadOwnedCommercialProfiles();
      setHasOwnedProfiles(response.profiles.length > 0);
    } catch {
      setHasOwnedProfiles(false);
    }
  }, []);

  const loadProductFeedRef = useRef(loadProductFeed);
  loadProductFeedRef.current = loadProductFeed;
  const loadOwnedProfilesStateRef = useRef(loadOwnedProfilesState);
  loadOwnedProfilesStateRef.current = loadOwnedProfilesState;

  useFocusEffect(
    useCallback(() => {
      const currentSearch = searchRef.current.trim();
      void loadProductFeedRef.current({
        search: currentSearch.length >= MINIMUM_SEARCH_LENGTH
          ? currentSearch
          : undefined,
        offerType: businessFiltersRef.current.offerType,
        modality: businessFiltersRef.current.modality,
      });
      void loadOwnedProfilesStateRef.current();
    }, []),
  );

  const handleRetry = useCallback(() => {
    setError(null);
    searchRequestVersionRef.current += 1;
    void loadProductFeed({
      search: activeSearch || undefined,
      offerType,
      modality,
    });
    void loadOwnedProfilesState();
  }, [
    activeSearch,
    loadOwnedProfilesState,
    loadProductFeed,
    modality,
    offerType,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    searchRequestVersionRef.current += 1;

    try {
      await Promise.all([
        loadProductFeed({
          search: activeSearch || undefined,
          offerType,
          modality,
        }),
        loadOwnedProfilesState(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    activeSearch,
    loadOwnedProfilesState,
    loadProductFeed,
    modality,
    offerType,
  ]);

  const runSearch = useCallback((value: string) => {
    const normalizedSearch = value.trim();

    searchRequestVersionRef.current += 1;

    if (!normalizedSearch) {
      setActiveSearch('');
      setError(null);
      void loadProductFeed({
        offerType: businessFiltersRef.current.offerType,
        modality: businessFiltersRef.current.modality,
      });
      return;
    }

    if (normalizedSearch.length < MINIMUM_SEARCH_LENGTH) {
      setActiveSearch('');
      setError(null);
      return;
    }

    setActiveSearch(normalizedSearch);
    setError(null);
    void loadProductFeed({
      search: normalizedSearch,
      offerType: businessFiltersRef.current.offerType,
      modality: businessFiltersRef.current.modality,
    });
  }, [loadProductFeed]);

  useEffect(() => {
    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      if (skipEmptySearchEffectRef.current) {
        skipEmptySearchEffectRef.current = false;
        return;
      }

      runSearch('');
      return;
    }

    skipEmptySearchEffectRef.current = false;

    if (normalizedSearch.length < MINIMUM_SEARCH_LENGTH) {
      searchRequestVersionRef.current += 1;
      setActiveSearch('');
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      runSearch(normalizedSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [runSearch, search]);

  useEffect(() => {
    if (skipFilterEffectRef.current) {
      skipFilterEffectRef.current = false;
      return;
    }

    searchRequestVersionRef.current += 1;
    setError(null);
    void loadProductFeed({
      search: activeSearchRef.current || undefined,
      offerType,
      modality,
    });
  }, [
    loadProductFeed,
    modality,
    offerType,
    searchRequestVersionRef,
  ]);

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(resultsOffsetRef.current - 8, 0),
        animated: true,
      });
    });
  }, []);

  const handleAiSearch = useCallback(() => {
    runSearch(search);
    scrollToResults();
  }, [runSearch, scrollToResults, search]);

  const {
    listening,
    transcribing,
    toggleVoice,
  } = useBuddyServicesAiSearch({
    onError: setError,
    onSearched: scrollToResults,
    runSearch,
    setSearch,
  });

  return (
    <ScreenSafeArea style={beeStyles.safeArea}>
      <View style={beeStyles.container}>
        <ScrollView
          ref={scrollRef}
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
            busy={transcribing}
            listening={listening}
            onChangeText={setSearch}
            onPressVoice={() => {
              void toggleVoice();
            }}
            onSubmit={handleAiSearch}
            value={search}
          />

          <TouchableOpacity
            accessibilityLabel="Ver mis compras y reservas"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => router.push(
              buddyServicesMyPurchasesRoute(),
            )}
            style={localStyles.purchasesButton}
          >
            <View style={localStyles.purchasesIconWrap}>
              <ClipboardList
                color="#FFFFFF"
                size={18}
                strokeWidth={2.4}
              />
            </View>

            <View style={localStyles.purchasesTextColumn}>
              <Text style={localStyles.purchasesLabel}>
                Mis compras y reservas
              </Text>

              <Text style={localStyles.purchasesHint}>
                Consulta el estado de tus solicitudes
              </Text>
            </View>
          </TouchableOpacity>

          <BeeServicesBusinessFilter
            modality={modality}
            offerType={offerType}
            onChangeModality={setModality}
            onChangeOfferType={setOfferType}
          />

          <View
            onLayout={(event) => {
              resultsOffsetRef.current = event.nativeEvent.layout.y;
            }}
          />

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
                  accessibilityLabel="Reintentar carga de Buddy Services"
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
                  {activeSearch
                    ? 'Buscando coincidencias…'
                    : 'Cargando negocios y servicios…'}
                </Text>
              </View>
            ) : null}

            {!loadingProductFeed && !error
              && productFeed.length === 0
              && searchProfiles.length === 0 ? (
              <View style={localStyles.locationEmptyState}>
                <Store
                  color="#7B2DD9"
                  size={25}
                />

                <Text style={localStyles.locationEmptyTitle}>
                  {activeSearch
                    ? 'No encontramos coincidencias'
                    : offerType || modality
                      ? 'Ningún negocio coincide con el filtro'
                      : 'Aún no hay negocios disponibles'}
                </Text>

                <Text style={localStyles.locationEmptyText}>
                  {activeSearch
                    ? 'Prueba con otro nombre, producto o servicio.'
                    : offerType || modality
                      ? 'Prueba con otro tipo de negocio o con otra modalidad.'
                      : 'Cuando alguien publique un negocio o un servicio, aparecerá aquí.'}
                </Text>
              </View>
            ) : null}

            {!loadingProductFeed && !error
              && (offerType || modality)
              && searchProfiles.length === 0
              && productFeed.length > 0 ? (
              <View style={localStyles.filterEmpty}>
                <Text style={localStyles.filterEmptyText}>
                  No hay negocios con ese filtro.
                </Text>
              </View>
            ) : null}

            {!loadingProductFeed && searchProfiles.length > 0 ? (
              <View style={beeStyles.section}>
                <CommercialRecentBusinesses
                  profiles={searchProfiles}
                  title={
                    activeSearch
                      ? 'Negocios'
                      : 'Negocios recientes'
                  }
                  onPressProfile={(profile) => router.push(
                    buddyServicesPublicProfileRoute(profile.id),
                  )}
                />

                <BuddyServicesListPagination
                  currentPage={profilesPage}
                  loading={pagingProfiles}
                  onPageChange={(page) => {
                    void goToProfilesPage(page);
                  }}
                  totalCount={profilesTotalCount}
                />
              </View>
            ) : null}

            {!loadingProductFeed && productFeed.length > 0 ? (
              <View style={beeStyles.section}>
                <View style={localStyles.feedHeader}>
                  <Text style={beeStyles.sectionTitle}>
                    {activeSearch
                      ? 'Productos y servicios'
                      : 'Productos y servicios destacados'}
                  </Text>

                  <View
                    accessibilityLabel="Cambiar vista de productos y servicios"
                    accessibilityRole="tablist"
                    style={localStyles.viewModeControl}
                  >
                    <TouchableOpacity
                      accessibilityLabel="Ver productos y servicios en grilla"
                      accessibilityRole="tab"
                      accessibilityState={{
                        selected: offerViewMode === 'grid',
                      }}
                      activeOpacity={0.8}
                      onPress={() => setOfferViewMode('grid')}
                      style={[
                        localStyles.viewModeButton,
                        offerViewMode === 'grid'
                          && localStyles.viewModeButtonActive,
                      ]}
                    >
                      <LayoutGrid
                        color={
                          offerViewMode === 'grid'
                            ? '#FFFFFF'
                            : '#7A579D'
                        }
                        size={17}
                        strokeWidth={2.3}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityLabel="Ver productos y servicios en lista"
                      accessibilityRole="tab"
                      accessibilityState={{
                        selected: offerViewMode === 'list',
                      }}
                      activeOpacity={0.8}
                      onPress={() => setOfferViewMode('list')}
                      style={[
                        localStyles.viewModeButton,
                        offerViewMode === 'list'
                          && localStyles.viewModeButtonActive,
                      ]}
                    >
                      <List
                        color={
                          offerViewMode === 'list'
                            ? '#FFFFFF'
                            : '#7A579D'
                        }
                        size={18}
                        strokeWidth={2.3}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={[
                    localStyles.offerFeed,
                    offerViewMode === 'grid'
                      && localStyles.offerFeedGrid,
                  ]}
                >
                  {productFeed.map((offer) => (
                    <CommercialOfferCard
                      key={offer.id}
                      offer={offer}
                      onPress={(selectedOffer) => router.push(
                        buddyServicesPublicOfferRoute(
                          selectedOffer.id,
                        ),
                      )}
                      variant={offerViewMode}
                    />
                  ))}
                </View>

                <BuddyServicesListPagination
                  currentPage={offersPage}
                  loading={pagingOffers}
                  onPageChange={(page) => {
                    void goToOffersPage(page);
                  }}
                  totalCount={offersTotalCount}
                />
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
  purchasesButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 27,
    paddingBottom: 11,
    paddingLeft: 11,
    paddingRight: 16,
    paddingTop: 11,
    shadowColor: '#5F52C5',
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  purchasesIconWrap: {
    alignItems: 'center',
    backgroundColor: '#7567D9',
    borderRadius: 12,
    height: 37,
    justifyContent: 'center',
    width: 37,
  },
  purchasesTextColumn: {
    marginLeft: 10,
  },
  purchasesLabel: {
    color: '#26314D',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  purchasesHint: {
    color: '#6C7892',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  filterEmpty: {
    backgroundColor: '#F7F1FB',
    borderColor: '#E7D9F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterEmptyText: {
    color: '#5C4A78',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  feedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewModeControl: {
    backgroundColor: '#F7F1FB',
    borderColor: '#E7D9F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  viewModeButton: {
    alignItems: 'center',
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  viewModeButtonActive: {
    backgroundColor: '#7427D5',
  },
  offerFeed: {
    width: '100%',
  },
  offerFeedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingMoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 42,
  },
  loadingMoreText: {
    color: '#6A5585',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 9,
  },
  feedEndCard: {
    alignItems: 'center',
    backgroundColor: '#FBF8FE',
    borderColor: '#E8DDF4',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  feedEndLine: {
    backgroundColor: '#CDA8EE',
    borderRadius: 999,
    height: 4,
    marginBottom: 11,
    width: 42,
  },
  feedEndTitle: {
    color: '#432064',
    fontSize: 14,
    fontWeight: '800',
  },
  feedEndText: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
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
