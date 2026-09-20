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
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Package,
  Wrench,
} from 'lucide-react-native';

import {
  useModuleNav,
  useScreenParams,
} from '../../../../../src/components/embedded/EmbeddedNavContext';

import type {
  CommercialRequestListItem,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  getCommercialModalityLabel,
} from '../../../../../src/features/buddyservices/commercialLabels';
import {
  buddyServicesManageBusinessRoute,
  buddyServicesManageRequestDetailRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';
import {
  formatCommercialRequestListAmount,
  formatCommercialRequestListDate,
  getCommercialRequestListItemCountLabel,
  getCommercialRequestListStatusLabel,
  getCommercialRequestListStatusTone,
  getCommercialRequestListTypeLabel,
} from '../../../../../src/features/buddyservices/commercialRequestListPresentation';
import {
  loadOwnedCommercialRequests,
} from '../../../../../src/services/commercialService';

const REQUEST_LIST_LIMIT = 25;

type CommercialRequestFilterKey =
  | 'all'
  | 'needs_business'
  | 'waiting_customer'
  | 'payment_pending'
  | 'payment_review'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface CommercialRequestFilter {
  key: CommercialRequestFilterKey;
  label: string;
  statuses?: Array<CommercialRequestListItem['status']>;
}

const COMMERCIAL_REQUEST_FILTERS: CommercialRequestFilter[] = [
  {
    key: 'all',
    label: 'Todas',
  },
  {
    key: 'needs_business',
    label: 'Por atender',
    statuses: ['submitted', 'under_review'],
  },
  {
    key: 'waiting_customer',
    label: 'Cliente',
    statuses: ['proposal_sent', 'accepted'],
  },
  {
    key: 'payment_pending',
    label: 'Pago pendiente',
    statuses: ['payment_pending'],
  },
  {
    key: 'payment_review',
    label: 'Comprobante',
    statuses: ['payment_submitted'],
  },
  {
    key: 'in_progress',
    label: 'En proceso',
    statuses: ['confirmed'],
  },
  {
    key: 'completed',
    label: 'Completadas',
    statuses: ['completed'],
  },
  {
    key: 'cancelled',
    label: 'Cerradas',
    statuses: ['cancelled', 'rejected', 'expired'],
  },
];

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function RequestTypeIcon(
  {
    requestType,
  }: {
    requestType: CommercialRequestListItem['request_type'];
  },
) {
  if (
    requestType === 'booking_request'
    || requestType === 'mixed_request'
  ) {
    return <CalendarDays color="#7427D5" size={19} />;
  }

  if (requestType === 'service_request') {
    return <Wrench color="#7427D5" size={19} />;
  }

  return <Package color="#7427D5" size={19} />;
}

export default function BuddyServicesManageRequestsScreen() {
  const router = useModuleNav();
  const params = useScreenParams() as {
    businessId?: string | string[];
  };

  const businessId = normalizeBusinessId(params.businessId);

  const [requests, setRequests] = useState<
    CommercialRequestListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<
    CommercialRequestFilterKey
  >('all');

  const selectedFilter = COMMERCIAL_REQUEST_FILTERS.find(
    (filter) => filter.key === activeFilter,
  ) || COMMERCIAL_REQUEST_FILTERS[0];

  const attentionCount = useMemo(() => (
    requests.filter((request) => (
      request.status === 'submitted'
      || request.status === 'under_review'
    )).length
  ), [requests]);

  const loadRequests = useCallback(async () => {
    if (!businessId) {
      setError({
        title: 'Negocio no identificado',
        message: 'No fue posible identificar el negocio.',
        retryable: false,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loadOwnedCommercialRequests(
        businessId,
        {
          limit: REQUEST_LIST_LIMIT,
          offset: 0,
          statuses: selectedFilter.statuses,
        },
      );

      setRequests(response.requests);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedFilter.statuses]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadRequests();
    } finally {
      setRefreshing(false);
    }
  }, [loadRequests]);

  const handleBack = useCallback(() => {
    if (router.canGoBack) {
      router.back();
      return;
    }

    if (businessId) {
      router.replace(
        buddyServicesManageBusinessRoute(businessId),
      );
    }
  }, [businessId, router]);

  const handleOpenRequest = useCallback((
    requestId: string,
  ) => {
    router.push(
      buddyServicesManageRequestDetailRoute(
        businessId,
        requestId,
      ),
    );
  }, [businessId, router]);

  if (loading) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#7427D5" size="large" />
          <Text style={styles.centeredText}>
            Actualizando solicitudes…
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (error) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centered}>
          <View style={styles.errorIcon}>
            <ClipboardList color="#7427D5" size={30} />
          </View>

          <Text style={styles.errorTitle}>
            {error.title}
          </Text>

          <Text style={styles.errorText}>
            {error.message}
          </Text>

          {error.retryable ? (
            <TouchableOpacity
              accessibilityLabel="Reintentar cargar solicitudes del negocio"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => {
                void loadRequests();
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="Volver a gestión del negocio"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={handleBack}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              Volver a gestión
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
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
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Volver a gestión del negocio"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={handleBack}
            style={styles.backButton}
          >
            <ArrowLeft color="#38294E" size={21} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              OPERACIÓN COMERCIAL
            </Text>

            <Text style={styles.title}>
              Solicitudes
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              Controla cada venta
            </Text>

            <Text style={styles.summaryText}>
              Compras, servicios y reservas que requieren seguimiento.
            </Text>
          </View>

          <View style={styles.summaryCounter}>
            <Text style={styles.summaryCounterValue}>
              {requests.length}
            </Text>

            <Text style={styles.summaryCounterLabel}>
              {requests.length === 1 ? 'solicitud' : 'solicitudes'}
            </Text>
          </View>
        </View>

        {attentionCount > 0 ? (
          <View style={styles.attentionCard}>
            <View style={styles.attentionDot} />

            <Text style={styles.attentionText}>
              {attentionCount === 1
                ? 'Tienes 1 solicitud que requiere respuesta.'
                : `Tienes ${attentionCount} solicitudes que requieren respuesta.`}
            </Text>
          </View>
        ) : null}

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>
            Filtrar por estado
          </Text>

          <ScrollView
            contentContainerStyle={styles.filterContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {COMMERCIAL_REQUEST_FILTERS.map((filter) => {
              const isActive = filter.key === activeFilter;

              return (
                <TouchableOpacity
                  key={filter.key}
                  accessibilityLabel={`Filtrar solicitudes: ${filter.label}`}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => {
                    setActiveFilter(filter.key);
                  }}
                  style={[
                    styles.filterButton,
                    isActive ? styles.filterButtonActive : null,
                  ]}
                >
                  <Text style={[
                    styles.filterButtonText,
                    isActive ? styles.filterButtonTextActive : null,
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <ClipboardList color="#7427D5" size={30} />
            </View>

            <Text style={styles.emptyTitle}>
              No hay solicitudes aquí
            </Text>

            <Text style={styles.emptyText}>
              Las solicitudes que coincidan con este filtro aparecerán en este espacio.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((request) => {
              const statusTone = getCommercialRequestListStatusTone(
                request.status,
              );
              const needsAttention = (
                request.status === 'submitted'
                || request.status === 'under_review'
              );

              return (
                <TouchableOpacity
                  key={request.id}
                  accessibilityHint="Abre el detalle de esta solicitud"
                  accessibilityLabel={
                    `Abrir ${getCommercialRequestListTypeLabel(request.request_type)} `
                    + `${request.code}`
                  }
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => handleOpenRequest(request.id)}
                  style={[
                    styles.requestCard,
                    needsAttention ? styles.requestCardAttention : null,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.typeIcon}>
                      <RequestTypeIcon
                        requestType={request.request_type}
                      />
                    </View>

                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.requestType}>
                        {getCommercialRequestListTypeLabel(
                          request.request_type,
                        )}
                      </Text>

                      <Text style={styles.requestCode}>
                        {request.code}
                      </Text>
                    </View>

                    <ChevronRight color="#8B769D" size={20} />
                  </View>

                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusBadge,
                      statusToneStyles[statusTone],
                    ]}>
                      <Text style={[
                        styles.statusText,
                        statusTextToneStyles[statusTone],
                      ]}>
                        {getCommercialRequestListStatusLabel(
                          request.status,
                        )}
                      </Text>
                    </View>

                    <Text style={styles.itemCount}>
                      {getCommercialRequestListItemCountLabel(
                        request.item_count,
                      )}
                    </Text>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.metaRow}>
                    <Text
                      numberOfLines={1}
                      style={styles.metaText}
                    >
                      {request.requested_modality
                        ? getCommercialModalityLabel(
                          request.requested_modality,
                        )
                        : 'Modalidad por confirmar'}
                    </Text>

                    <Text style={styles.metaText}>
                      {formatCommercialRequestListDate(
                        request.created_at,
                      )}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      Total
                    </Text>

                    <Text style={styles.totalAmount}>
                      {formatCommercialRequestListAmount(
                        request.total_amount,
                        request.currency_code,
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F7FC',
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 118,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  centeredText: {
    color: '#5E506B',
    fontSize: 15,
    marginTop: 14,
    textAlign: 'center',
  },
  errorIcon: {
    alignItems: 'center',
    backgroundColor: '#F2E9FB',
    borderRadius: 20,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  errorTitle: {
    color: '#38294E',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#6D5C7B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#7427D5',
    borderRadius: 13,
    marginTop: 21,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 11,
    padding: 12,
  },
  secondaryButtonText: {
    color: '#7427D5',
    fontSize: 14,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8DFF0',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
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
    color: '#38294E',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#261743',
    borderRadius: 20,
    flexDirection: 'row',
    marginTop: 20,
    overflow: 'hidden',
    padding: 18,
  },
  summaryCopy: {
    flex: 1,
    paddingRight: 14,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  summaryText: {
    color: '#DCC8FF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  summaryCounter: {
    alignItems: 'center',
    backgroundColor: '#3C2860',
    borderColor: '#5A3D87',
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  summaryCounterValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryCounterLabel: {
    color: '#DCC8FF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  attentionCard: {
    alignItems: 'center',
    backgroundColor: '#FFF4DE',
    borderColor: '#F5D9AC',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attentionDot: {
    backgroundColor: '#D17A00',
    borderRadius: 5,
    height: 9,
    marginRight: 9,
    width: 9,
  },
  attentionText: {
    color: '#87510A',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  filterSection: {
    marginTop: 23,
  },
  filterLabel: {
    color: '#5D4D6C',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  filterScroll: {
    marginHorizontal: -20,
  },
  filterContent: {
    gap: 9,
    paddingHorizontal: 20,
    paddingRight: 34,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D7E8',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  filterButtonActive: {
    backgroundColor: '#7427D5',
    borderColor: '#7427D5',
  },
  filterButtonText: {
    color: '#5D4D6C',
    fontSize: 13,
    fontWeight: '800',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 12,
    marginTop: 18,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE3F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#38294E',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  requestCardAttention: {
    borderColor: '#E6C47B',
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  typeIcon: {
    alignItems: 'center',
    backgroundColor: '#F3E8FE',
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  cardTitleWrap: {
    flex: 1,
  },
  requestType: {
    color: '#806995',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  requestCode: {
    color: '#38294E',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusNeutral: {
    backgroundColor: '#EEE7F3',
  },
  statusSuccess: {
    backgroundColor: '#E1F4E8',
  },
  statusWarning: {
    backgroundColor: '#FFF0D8',
  },
  statusDanger: {
    backgroundColor: '#FCE3E5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextNeutral: {
    color: '#5D4D6C',
  },
  statusTextSuccess: {
    color: '#177245',
  },
  statusTextWarning: {
    color: '#9A5B00',
  },
  statusTextDanger: {
    color: '#B42318',
  },
  itemCount: {
    color: '#766383',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDivider: {
    backgroundColor: '#F0EBF4',
    height: 1,
    marginTop: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaText: {
    color: '#6E5B7C',
    flex: 1,
    fontSize: 12,
    paddingRight: 8,
  },
  totalRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  totalLabel: {
    color: '#6E5B7C',
    fontSize: 13,
    fontWeight: '700',
  },
  totalAmount: {
    color: '#38294E',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7DDF2',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 35,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#F3E8FE',
    borderRadius: 20,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  emptyTitle: {
    color: '#38294E',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6D5C7B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
});

const statusToneStyles = StyleSheet.create({
  neutral: styles.statusNeutral,
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
});

const statusTextToneStyles = StyleSheet.create({
  neutral: styles.statusTextNeutral,
  success: styles.statusTextSuccess,
  warning: styles.statusTextWarning,
  danger: styles.statusTextDanger,
});
