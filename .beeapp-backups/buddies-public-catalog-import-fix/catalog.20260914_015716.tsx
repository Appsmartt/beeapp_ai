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
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ClipboardList,
} from 'lucide-react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialCatalog,
  CommercialPublicOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../../../src/components/layout/ScreenSafeArea';
import CommercialOfferCard from '../../../../../../../src/components/buddyservices/CommercialOfferCard';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../../../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesPublicOfferRoute,
} from '../../../../../../../src/features/buddyservices/commercialRoutes';
import {
  loadPublicCommercialCatalogs,
  loadPublicCommercialOffers,
} from '../../../../../../../src/services/commercialService';

function normalizeParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

export default function BuddyServicesPublicCatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    profileId?: string | string[];
    catalogId?: string | string[];
  }>();

  const profileId = normalizeParam(params.profileId);
  const catalogId = normalizeParam(params.catalogId);

  const [catalog, setCatalog] = useState<CommercialCatalog | null>(
    null,
  );
  const [offers, setOffers] = useState<CommercialPublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(null);

  const catalogTitle = useMemo(
    () => catalog?.name || 'Catálogo',
    [catalog],
  );

  const loadCatalog = useCallback(async () => {
    if (!profileId || !catalogId) {
      setLoading(false);
      setError({
        title: 'Catálogo no identificado',
        message: (
          'No fue posible identificar el catálogo '
          + 'que deseas consultar.'
        ),
        retryable: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        catalogsResponse,
        offersResponse,
      ] = await Promise.all([
        loadPublicCommercialCatalogs(profileId),
        loadPublicCommercialOffers(profileId, {
          catalog_id: catalogId,
          limit: 50,
          offset: 0,
        }),
      ]);

      setCatalog(
        catalogsResponse.catalogs.find(
          (item) => item.id === catalogId,
        ) || null,
      );
      setOffers(offersResponse.offers);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [catalogId, profileId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadCatalog();
    } finally {
      setRefreshing(false);
    }
  }, [loadCatalog]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(main)/beeservices');
  }, [router]);

  if (loading && !catalog) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#7427D5" size="small" />
          <Text style={styles.loadingText}>
            Cargando catálogo…
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (error) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            {error.title}
          </Text>
          <Text style={styles.errorText}>
            {error.message}
          </Text>
          {error.retryable ? (
            <TouchableOpacity
              accessibilityLabel="Reintentar carga del catálogo"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => void loadCatalog()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityLabel="Volver al perfil comercial"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={handleBack}
            style={styles.secondaryButton}
          >
            <ArrowLeft color="#7427D5" size={18} />
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
            accessibilityLabel="Volver al perfil comercial"
            accessibilityRole="button"
            activeOpacity={0.78}
            onPress={handleBack}
            style={styles.backButton}
          >
            <ArrowLeft color="#38294E" size={23} />
          </TouchableOpacity>

          <Text numberOfLines={1} style={styles.headerTitle}>
            {catalogTitle}
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
          <View style={styles.catalogHero}>
            <View style={styles.catalogIcon}>
              <ClipboardList color="#7B2DD9" size={22} />
            </View>
            <View style={styles.catalogHeroContent}>
              <Text style={styles.catalogName}>
                {catalogTitle}
              </Text>
              {catalog?.description ? (
                <Text style={styles.catalogDescription}>
                  {catalog.description}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Productos del catálogo
          </Text>

          {offers.length > 0 ? (
            offers.map((offer) => (
              <CommercialOfferCard
                key={offer.id}
                offer={offer}
                onPress={(selectedOffer) => router.push(
                  buddyServicesPublicOfferRoute(
                    selectedOffer.id,
                  ),
                )}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Aún no hay productos en este catálogo
              </Text>
              <Text style={styles.emptyText}>
                El negocio todavía no ha agregado productos disponibles.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FAF8FC',
    flex: 1,
  },
  container: {
    backgroundColor: '#FAF8FC',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EEE7F4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: '#2D2141',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 18,
    paddingBottom: 34,
  },
  catalogHero: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE4F3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 22,
    padding: 16,
  },
  catalogIcon: {
    alignItems: 'center',
    backgroundColor: '#F4E9FD',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginRight: 13,
    width: 50,
  },
  catalogHeroContent: {
    flex: 1,
  },
  catalogName: {
    color: '#2D2141',
    fontSize: 16,
    fontWeight: '800',
  },
  catalogDescription: {
    color: '#786593',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#261743',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: {
    color: '#786593',
    fontSize: 14,
    marginTop: 10,
  },
  errorTitle: {
    color: '#A82A3A',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: '#78404A',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#7427D5',
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#D9C2F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#7427D5',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 7,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE4F3',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: '#432064',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#786593',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
});
