import {
  useCallback,
  useEffect,
  useMemo,
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
  ArrowLeft,
  Search,
  X,
} from 'lucide-react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialCategory,
  CommercialPublicProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import CommercialRecentBusinesses from '../../../src/components/buddyservices/CommercialRecentBusinesses';
import CommercialResultsFilters, {
  type CommercialResultsFilterValue,
} from '../../../src/components/buddyservices/CommercialResultsFilters';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesHomeRoute,
  buddyServicesPublicProfileRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
  loadPublicCommercialCategories,
  loadPublicCommercialProfiles,
} from '../../../src/services/commercialService';

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: CommercialResultsFilterValue = {
  offerType: null,
  modality: null,
  verifiedOnly: false,
  deliveryOnly: false,
  ordering: 'recent',
};

function normalizeParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

export default function BuddyServicesResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    countryCode?: string | string[];
    city?: string | string[];
    categoryId?: string | string[];
    search?: string | string[];
  }>();

  const countryCode = normalizeParam(params.countryCode)
    .toUpperCase();
  const city = normalizeParam(params.city);
  const initialCategoryId = normalizeParam(params.categoryId);
  const initialSearch = normalizeParam(params.search);

  const [query, setQuery] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(
    initialSearch,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    initialCategoryId || null,
  );
  const [categories, setCategories] = useState<
    CommercialCategory[]
  >([]);
  const [filters, setFilters] = useState<
    CommercialResultsFilterValue
  >(DEFAULT_FILTERS);
  const [profiles, setProfiles] = useState<
    CommercialPublicProfile[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCategories, setLoadingCategories] =
    useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    null,
  );

  const hasValidLocation = Boolean(countryCode && city);

  const selectedCategory = useMemo(
    () => categories.find(
      (category) => category.id === categoryId,
    ) || null,
    [categories, categoryId],
  );

  const canLoadMore = (
    profiles.length < totalCount
  );

  const loadCategories = useCallback(async () => {
    if (!hasValidLocation) {
      setCategories([]);
      return;
    }

    setLoadingCategories(true);

    try {
      const response = await loadPublicCommercialCategories({
        country_code: countryCode,
        city,
      });

      setCategories(response.categories);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoadingCategories(false);
    }
  }, [city, countryCode, hasValidLocation]);

  const loadProfiles = useCallback(async (
    nextOffset: number,
    mode: 'replace' | 'append',
  ) => {
    if (!hasValidLocation) {
      return;
    }

    if (mode === 'append') {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await loadPublicCommercialProfiles({
        country_code: countryCode,
        city,
        category_id: categoryId || undefined,
        offer_type: filters.offerType || undefined,
        modality: filters.modality || undefined,
        verified_only: filters.verifiedOnly,
        delivery_only: filters.deliveryOnly,
        search: submittedSearch || undefined,
        ordering: filters.ordering,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setProfiles((current) => (
        mode === 'append'
          ? [
            ...current,
            ...response.profiles.filter(
              (candidate) => !current.some(
                (item) => item.id === candidate.id,
              ),
            ),
          ]
          : response.profiles
      ));

      setTotalCount(response.count);
      setOffset(nextOffset);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      if (mode === 'append') {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [
    categoryId,
    city,
    countryCode,
    filters.deliveryOnly,
    filters.modality,
    filters.offerType,
    filters.ordering,
    filters.verifiedOnly,
    hasValidLocation,
    submittedSearch,
  ]);

  useEffect(() => {
    if (!hasValidLocation) {
      return;
    }

    void loadCategories();
  }, [hasValidLocation, loadCategories]);

  useEffect(() => {
    if (!hasValidLocation) {
      return;
    }

    void loadProfiles(0, 'replace');
  }, [
    categoryId,
    filters.deliveryOnly,
    filters.modality,
    filters.offerType,
    filters.ordering,
    filters.verifiedOnly,
    hasValidLocation,
    loadProfiles,
    submittedSearch,
  ]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(buddyServicesHomeRoute());
  }, [router]);

  const handleSearch = useCallback(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery === submittedSearch) {
      return;
    }

    setSubmittedSearch(normalizedQuery);
  }, [query, submittedSearch]);

  const handleFiltersChange = useCallback((
    nextFilters: CommercialResultsFilterValue,
  ) => {
    setFilters(nextFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setSubmittedSearch('');
  }, []);

  const handleClearCategory = useCallback(() => {
    setCategoryId(null);
  }, []);

  const handleRetry = useCallback(() => {
    if (!hasValidLocation) {
      return;
    }

    void Promise.all([
      loadCategories(),
      loadProfiles(0, 'replace'),
    ]);
  }, [
    hasValidLocation,
    loadCategories,
    loadProfiles,
  ]);

  const handleRefresh = useCallback(async () => {
    if (!hasValidLocation) {
      return;
    }

    setRefreshing(true);

    try {
      await Promise.all([
        loadCategories(),
        loadProfiles(0, 'replace'),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    hasValidLocation,
    loadCategories,
    loadProfiles,
  ]);

  const handleLoadMore = useCallback(() => {
    if (
      !canLoadMore
      || loading
      || loadingMore
    ) {
      return;
    }

    void loadProfiles(offset + PAGE_SIZE, 'append');
  }, [
    canLoadMore,
    loadProfiles,
    loading,
    loadingMore,
    offset,
  ]);

  const handleProfilePress = useCallback((
    profile: CommercialPublicProfile,
  ) => {
    router.push(
      buddyServicesPublicProfileRoute(profile.id),
    );
  }, [router]);

  if (!hasValidLocation) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.invalidLocationContainer}>
          <Text style={styles.invalidLocationTitle}>
            Falta la ubicación de búsqueda
          </Text>

          <Text style={styles.invalidLocationText}>
            Selecciona un país y una ciudad antes de explorar
            negocios.
          </Text>

          <TouchableOpacity
            accessibilityLabel="Volver a BuddyServices"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={handleBack}
            style={styles.primaryButton}
          >
            <ArrowLeft
              color="#FFFFFF"
              size={18}
            />

            <Text style={styles.primaryButtonText}>
              Volver a BuddyServices
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

          <View style={styles.headerText}>
            <Text
              numberOfLines={1}
              style={styles.title}
            >
              Explorar negocios
            </Text>

            <Text
              numberOfLines={1}
              style={styles.subtitle}
            >
              {city}, {countryCode}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
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
          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="Buscar negocios y servicios"
              autoCapitalize="sentences"
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder="Busca negocios, productos o servicios"
              placeholderTextColor="#9B87AE"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />

            <TouchableOpacity
              accessibilityLabel="Ejecutar búsqueda"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={handleSearch}
              style={styles.searchButton}
            >
              <Search
                color="#FFFFFF"
                size={20}
              />
            </TouchableOpacity>
          </View>

          <CommercialResultsFilters
            disabled={loading || loadingMore}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
            value={filters}
          />

          {(
            selectedCategory
            || submittedSearch
          ) ? (
            <View style={styles.chipsRow}>
              {selectedCategory ? (
                <TouchableOpacity
                  accessibilityLabel={
                    `Quitar categoría ${selectedCategory.name}`
                  }
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={handleClearCategory}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>
                    {selectedCategory.name}
                  </Text>

                  <X
                    color="#6F3FAB"
                    size={15}
                  />
                </TouchableOpacity>
              ) : null}

              {submittedSearch ? (
                <TouchableOpacity
                  accessibilityLabel={
                    `Quitar búsqueda ${submittedSearch}`
                  }
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={handleClearSearch}
                  style={styles.chip}
                >
                  <Text
                    numberOfLines={1}
                    style={styles.chipText}
                  >
                    “{submittedSearch}”
                  </Text>

                  <X
                    color="#6F3FAB"
                    size={15}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {loadingCategories ? (
            <Text style={styles.categoryHint}>
              Actualizando categorías disponibles…
            </Text>
          ) : null}

          {error ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.errorCard}
            >
              <Text style={styles.errorTitle}>
                {error.title}
              </Text>

              <Text style={styles.errorMessage}>
                {error.message}
              </Text>

              {error.retryable ? (
                <TouchableOpacity
                  accessibilityLabel="Reintentar resultados"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={handleRetry}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>
                    Reintentar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {loading && profiles.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator
                color="#7427D5"
                size="small"
              />

              <Text style={styles.loadingText}>
                Buscando negocios en {city}…
              </Text>
            </View>
          ) : null}

          {!loading && !error && profiles.length > 0 ? (
            <>
              <Text style={styles.resultCount}>
                {totalCount === 1
                  ? '1 negocio encontrado'
                  : `${totalCount} negocios encontrados`}
              </Text>

              <CommercialRecentBusinesses
                onPressProfile={handleProfilePress}
                profiles={profiles}
              />

              {canLoadMore ? (
                <TouchableOpacity
                  accessibilityLabel="Cargar más resultados"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  disabled={loadingMore}
                  onPress={handleLoadMore}
                  style={[
                    styles.loadMoreButton,
                    loadingMore && styles.loadMoreButtonDisabled,
                  ]}
                >
                  {loadingMore ? (
                    <ActivityIndicator
                      color="#7427D5"
                      size="small"
                    />
                  ) : null}

                  <Text style={styles.loadMoreText}>
                    {loadingMore
                      ? 'Cargando…'
                      : 'Cargar más'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {!loading && !error && profiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No encontramos negocios
              </Text>

              <Text style={styles.emptyText}>
                Prueba cambiando los filtros, la búsqueda o la
                ciudad seleccionada.
              </Text>

              {(
                categoryId
                || submittedSearch
                || filters.offerType
                || filters.modality
                || filters.verifiedOnly
                || filters.deliveryOnly
                || filters.ordering !== 'recent'
              ) ? (
                <TouchableOpacity
                  accessibilityLabel="Limpiar búsqueda y filtros"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={() => {
                    setQuery('');
                    setSubmittedSearch('');
                    setCategoryId(null);
                    setFilters(DEFAULT_FILTERS);
                  }}
                  style={styles.emptyAction}
                >
                  <Text style={styles.emptyActionText}>
                    Limpiar búsqueda y filtros
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </ScreenSafeArea>
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
    marginRight: 9,
    width: 42,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#261743',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  subtitle: {
    color: '#80699D',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  content: {
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 13,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F4EAFE',
    borderColor: '#DEC7F0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: '100%',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  chipText: {
    color: '#5C2B91',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 5,
  },
  categoryHint: {
    color: '#836D9C',
    fontSize: 12,
    marginTop: 10,
  },
  resultCount: {
    color: '#72578D',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 19,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: '#F9F3FC',
    borderRadius: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 94,
    paddingHorizontal: 18,
  },
  loadingText: {
    color: '#674D85',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  errorCard: {
    backgroundColor: '#FFF4F4',
    borderColor: '#F2C9CC',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
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
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F9F3FC',
    borderColor: '#E8D1F1',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 27,
  },
  emptyTitle: {
    color: '#38294E',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#866D9F',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  emptyAction: {
    backgroundColor: '#7427D5',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#CFA9E8',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -10,
    minHeight: 45,
    minWidth: 152,
    paddingHorizontal: 16,
  },
  loadMoreButtonDisabled: {
    opacity: 0.65,
  },
  loadMoreText: {
    color: '#7427D5',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 7,
  },
  invalidLocationContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  invalidLocationTitle: {
    color: '#261743',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  invalidLocationText: {
    color: '#786593',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 24,
    minHeight: 46,
    paddingHorizontal: 17,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
});
