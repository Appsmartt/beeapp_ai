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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import type {
  BusinessSalesMetrics,
  BusinessSalesMetricsBucket,
  BusinessSalesMetricsGrain,
} from '@beeapp/shared-types';

import {
  useModuleNav,
  useScreenParams,
} from '../../../../../src/components/embedded/EmbeddedNavContext';
import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import { toCommercialUiError } from '../../../../../src/features/buddyservices/commercialErrors';
import { formatCommercialRequestListAmount } from '../../../../../src/features/buddyservices/commercialRequestListPresentation';
import { loadOwnedBusinessSalesMetrics } from '../../../../../src/services/commercialService';

const GRAINS: Array<{
  key: BusinessSalesMetricsGrain;
  label: string;
}> = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const WEEKDAY_LABELS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayIsoDate(): string {
  return formatIsoDate(new Date());
}

function shiftAnchor(
  anchor: string,
  grain: BusinessSalesMetricsGrain,
  direction: -1 | 1,
): string {
  const date = parseIsoDate(anchor);

  if (grain === 'day') {
    date.setDate(date.getDate() + direction);
  } else if (grain === 'week') {
    date.setDate(date.getDate() + (direction * 7));
  } else {
    date.setMonth(date.getMonth() + direction);
  }

  return formatIsoDate(date);
}

function bucketLabel(
  bucket: BusinessSalesMetricsBucket,
  grain: BusinessSalesMetricsGrain,
): string {
  const date = parseIsoDate(bucket.date);

  if (grain === 'week') {
    return WEEKDAY_LABELS[date.getDay()] || '';
  }

  return String(date.getDate());
}

function offerKindLabel(kind: string): string {
  return kind === 'service' ? 'Servicio' : 'Producto';
}

function formatUnits(units: number): string {
  const value = Number(units);
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString('es-CO')
    : rounded.toLocaleString('es-CO', { maximumFractionDigits: 2 });

  return rounded === 1 ? `${text} unidad` : `${text} unidades`;
}

export default function BuddyServicesBusinessMetricsScreen() {
  const router = useModuleNav();
  const params = useScreenParams() as {
    businessId?: string | string[];
  };
  const businessId = String(
    Array.isArray(params.businessId)
      ? params.businessId[0]
      : params.businessId || '',
  ).trim();

  const [grain, setGrain] = useState<BusinessSalesMetricsGrain>('month');
  const [anchor, setAnchor] = useState(todayIsoDate);
  const [metrics, setMetrics] = useState<BusinessSalesMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadMetrics = useCallback(async (mode: 'initial' | 'refresh') => {
    if (!businessId) {
      setErrorMessage('No fue posible identificar el negocio.');
      setIsLoading(false);
      return;
    }

    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setIsLoading(true);
      setMetrics(null);
    }

    setErrorMessage(null);
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    try {
      const response = await loadOwnedBusinessSalesMetrics(businessId, {
        grain,
        anchor,
      });

      if (requestId.current !== currentRequest) {
        return;
      }

      setMetrics(response);
    } catch (error) {
      if (requestId.current !== currentRequest) {
        return;
      }

      if (mode !== 'refresh') {
        setMetrics(null);
      }
      setErrorMessage(toCommercialUiError(error).message);
    } finally {
      if (requestId.current === currentRequest) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [anchor, businessId, grain]);

  useEffect(() => {
    void loadMetrics('initial');
  }, [loadMetrics]);

  const canGoNext = (metrics?.period.end || anchor) < todayIsoDate();
  const maxBucketAmount = Math.max(
    0,
    ...(metrics?.buckets || []).map((bucket) => Number(bucket.amount) || 0),
  );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            colors={['#7427D5']}
            onRefresh={() => {
              void loadMetrics('refresh');
            }}
            refreshing={refreshing}
            tintColor="#7427D5"
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {router.canGoBack ? (
            <TouchableOpacity
              accessibilityLabel="Volver a la gestión del negocio"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft color="#38294E" size={21} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>OPERACIÓN COMERCIAL</Text>
            <Text style={styles.title}>Métricas</Text>
          </View>
        </View>

        <View style={styles.grainRow}>
          {GRAINS.map((option) => {
            const selected = option.key === grain;

            return (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.82}
                onPress={() => setGrain(option.key)}
                style={[
                  styles.grainButton,
                  selected && styles.grainButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.grainLabel,
                    selected && styles.grainLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.periodRow}>
          <TouchableOpacity
            accessibilityLabel="Periodo anterior"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => setAnchor((current) => shiftAnchor(current, grain, -1))}
            style={styles.periodButton}
          >
            <ChevronLeft color="#7427D5" size={20} />
          </TouchableOpacity>

          <Text style={styles.periodLabel}>
            {metrics?.period.label || 'Cargando periodo'}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Periodo siguiente"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGoNext }}
            activeOpacity={0.82}
            disabled={!canGoNext}
            onPress={() => setAnchor((current) => shiftAnchor(current, grain, 1))}
            style={[
              styles.periodButton,
              !canGoNext && styles.periodButtonDisabled,
            ]}
          >
            <ChevronRight
              color={canGoNext ? '#7427D5' : '#C8B8D8'}
              size={20}
            />
          </TouchableOpacity>
        </View>

        {isLoading && !metrics ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#7427D5" size="large" />
            <Text style={styles.stateText}>Cargando métricas…</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => {
                void loadMetrics('initial');
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {metrics ? (
          <>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Dinero ganado</Text>
                <Text style={styles.kpiValue}>
                  {formatCommercialRequestListAmount(
                    Number(metrics.totals.amount) || 0,
                    metrics.totals.currency_code || 'COP',
                  )}
                </Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Ventas</Text>
                <Text style={styles.kpiValue}>
                  {Number(metrics.totals.sales_count) || 0}
                </Text>
                <Text style={styles.kpiHint}>
                  Completadas
                </Text>
              </View>
            </View>

            {Number(metrics.totals.sales_count) === 0 ? (
              <Text style={styles.emptyText}>
                No hay ventas completadas en este periodo.
              </Text>
            ) : null}

            {grain !== 'day' ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ventas por día</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.barsContent}
                >
                  {metrics.buckets.map((bucket) => {
                    const amount = Number(bucket.amount) || 0;
                    const height = maxBucketAmount > 0
                      ? Math.max(8, Math.round((amount / maxBucketAmount) * 96))
                      : 8;

                    return (
                      <View key={bucket.date} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height,
                                backgroundColor: amount > 0
                                  ? '#7427D5'
                                  : '#E7DFF0',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.barLabel}>
                          {bucketLabel(bucket, grain)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Más vendidos</Text>
              <Text style={styles.sectionSubtitle}>
                Productos y servicios con más unidades en este periodo.
              </Text>

              {metrics.top_offers.length === 0 ? (
                <Text style={styles.emptyText}>
                  Todavía no hay productos o servicios vendidos en este periodo.
                </Text>
              ) : (
                metrics.top_offers.map((offer, index) => (
                  <View
                    key={`${offer.id || offer.title}-${index}`}
                    style={[
                      styles.offerRow,
                      index === metrics.top_offers.length - 1
                        && styles.offerRowLast,
                    ]}
                  >
                    <View style={styles.offerRank}>
                      <Text style={styles.offerRankText}>{index + 1}</Text>
                    </View>

                    <View style={styles.offerCopy}>
                      <Text numberOfLines={2} style={styles.offerTitle}>
                        {offer.title}
                      </Text>
                      <Text style={styles.offerMeta}>
                        {offerKindLabel(offer.offer_kind)}
                        {' · '}
                        {formatUnits(Number(offer.units) || 0)}
                      </Text>
                    </View>

                    <Text style={styles.offerAmount}>
                      {formatCommercialRequestListAmount(
                        Number(offer.amount) || 0,
                        metrics.totals.currency_code || 'COP',
                      )}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFCF9',
    flex: 1,
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F4EDF9',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    marginRight: 12,
    width: 42,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#88709E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  title: {
    color: '#261743',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  grainRow: {
    backgroundColor: '#F6F1FA',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 4,
  },
  grainButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 10,
  },
  grainButtonSelected: {
    backgroundColor: '#7427D5',
  },
  grainLabel: {
    color: '#6D5C7B',
    fontSize: 14,
    fontWeight: '800',
  },
  grainLabelSelected: {
    color: '#FFFFFF',
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  periodButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE3F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  periodButtonDisabled: {
    backgroundColor: '#F7F4FA',
  },
  periodLabel: {
    color: '#261743',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 10,
    textAlign: 'center',
  },
  stateBox: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 12,
  },
  stateText: {
    color: '#6D5C7B',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#8A3A44',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7427D5',
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE3F0',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  kpiLabel: {
    color: '#786593',
    fontSize: 12,
    fontWeight: '800',
  },
  kpiValue: {
    color: '#261743',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  kpiHint: {
    color: '#88709E',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: '#6D5C7B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE3F0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: {
    color: '#261743',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  barsContent: {
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 16,
  },
  barColumn: {
    alignItems: 'center',
    width: 28,
  },
  barTrack: {
    height: 96,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 8,
    width: 16,
  },
  barLabel: {
    color: '#786593',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  offerRow: {
    alignItems: 'center',
    borderBottomColor: '#F1EAF6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  offerRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  offerRank: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  offerRankText: {
    color: '#7427D5',
    fontSize: 13,
    fontWeight: '900',
  },
  offerCopy: {
    flex: 1,
    marginHorizontal: 10,
  },
  offerTitle: {
    color: '#261743',
    fontSize: 14,
    fontWeight: '800',
  },
  offerMeta: {
    color: '#786593',
    fontSize: 12,
    marginTop: 2,
  },
  offerAmount: {
    color: '#261743',
    fontSize: 13,
    fontWeight: '800',
  },
});
