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
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  ChevronRight,
  Package,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Wrench,
} from 'lucide-react-native';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  LIST_CACHE_TTL,
  commercialRequestsCacheKey,
} from '@beeapp/api-client';
import type {
  CommercialRequestListItem,
} from '@beeapp/shared-types';

import { useCachedResource } from '../../../src/hooks/useCachedResource';

import BeeServicesHeader from '../../../src/components/beeservices/BeeServicesHeader';
import { styles as beeStyles } from '../../../src/components/beeservices/beeServicesStyles';
import HomeSideMenu from '../../../src/components/home/HomeSideMenu';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
  getCommercialModalityLabel,
} from '../../../src/features/buddyservices/commercialLabels';
import {
  buddyServicesCartRoute,
  buddyServicesRequestDetailRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
  getBusinessCartItemCount,
  subscribeBusinessCart,
} from '../../../src/features/buddyservices/cart/businessCartStore';

import {
  formatCommercialRequestListAmount,
  formatCommercialRequestListDate,
  getCommercialRequestListItemCountLabel,
  getCommercialRequestListStatusLabel,
  getCommercialRequestListStatusTone,
  getCommercialRequestListTypeLabel,
} from '../../../src/features/buddyservices/commercialRequestListPresentation';
import {
  loadCommercialRequests,
} from '../../../src/services/commercialService';

const REQUEST_LIST_LIMIT = 25;
const BEE_PURPLE = '#7567D9';

function RequestTypeIcon({
  requestType,
}: {
  requestType: CommercialRequestListItem['request_type'];
}) {
  if (requestType === 'booking_request') {
    return <CalendarDays color={BEE_PURPLE} size={19} />;
  }

  if (requestType === 'service_request') {
    return <Wrench color={BEE_PURPLE} size={19} />;
  }

  return <Package color={BEE_PURPLE} size={19} />;
}

export default function BuddyServicesMyPurchasesScreen() {
  const router = useRouter();
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const purchases = useCachedResource({
    cacheKey: commercialRequestsCacheKey({
      limit: REQUEST_LIST_LIMIT,
      offset: 0,
    }),
    ttlMs: LIST_CACHE_TTL.fresh,
    load: () => loadCommercialRequests({
      limit: REQUEST_LIST_LIMIT,
      offset: 0,
    }),
  });

  const requests = purchases.data?.requests ?? [];
  const loading = purchases.loading && requests.length === 0;
  const refreshing = purchases.refreshing;
  const error = purchases.error && requests.length === 0
    ? toCommercialUiError(purchases.error)
    : null;

  const [cartItemCount, setCartItemCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setCartItemCount(getBusinessCartItemCount());

      return subscribeBusinessCart(() => {
        setCartItemCount(getBusinessCartItemCount());
      });
    }, []),
  );

  const handleRefresh = useCallback(async () => {
    await purchases.reload();
  }, [purchases]);

  const handleOpenRequest = useCallback((
    requestId: string,
  ) => {
    router.push(
      buddyServicesRequestDetailRoute(requestId),
    );
  }, [router]);

  return (
    <ScreenSafeArea style={beeStyles.safeArea}>
      <View style={beeStyles.container}>
        <ScrollView
          contentContainerStyle={beeStyles.content}
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
            onBackToMainPress={() => router.back()}
            onMenuPress={() => setSideMenuVisible(true)}
            subtitle="Historial, carrito y promociones"
            title="Mis compras"
          />

          <View style={localStyles.shortcutsRow}>
            <TouchableOpacity
              accessibilityLabel="Abrir carrito de compra"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => router.push(buddyServicesCartRoute())}
              style={localStyles.shortcutCard}
            >
              <View style={localStyles.shortcutIconWrap}>
                <ShoppingCart
                  color="#FFFFFF"
                  size={18}
                  strokeWidth={2.3}
                />
              </View>

              <View style={localStyles.shortcutTextColumn}>
                <Text style={localStyles.shortcutTitle}>
                  Carrito
                </Text>

                <Text style={localStyles.shortcutHint}>
                  {cartItemCount === 0
                    ? 'Sin productos pendientes'
                    : cartItemCount === 1
                      ? '1 producto'
                      : `${cartItemCount} productos`}
                </Text>
              </View>

              <ChevronRight
                color="#7567D9"
                size={18}
                strokeWidth={2.3}
              />
            </TouchableOpacity>

            <View style={localStyles.shortcutCardMuted}>
              <View style={localStyles.shortcutIconWrapMuted}>
                <Tag
                  color={BEE_PURPLE}
                  size={18}
                  strokeWidth={2.2}
                />
              </View>

              <View style={localStyles.shortcutTextColumn}>
                <Text style={localStyles.shortcutTitle}>
                  Promociones
                </Text>

                <Text style={localStyles.shortcutHint}>
                  Próximamente disponibles
                </Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={localStyles.loadingCard}>
              <ActivityIndicator
                color="#7427D5"
                size="small"
              />

              <Text style={localStyles.loadingText}>
                Cargando tus solicitudes…
              </Text>
            </View>
          ) : null}

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
                  accessibilityLabel="Reintentar cargar solicitudes"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={() => {
                    void purchases.reload();
                  }}
                  style={localStyles.retryButton}
                >
                  <Text style={localStyles.retryButtonText}>
                    Reintentar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {!loading && !error ? (
            <View style={beeStyles.section}>
              <Text style={beeStyles.sectionTitle}>
                Historial de compras
              </Text>

              {requests.length === 0 ? (
                <View style={localStyles.emptyState}>
                  <ShoppingBag
                    color={BEE_PURPLE}
                    size={28}
                    strokeWidth={2.2}
                  />

                  <Text style={localStyles.emptyTitle}>
                    Aún no tienes solicitudes
                  </Text>

                  <Text style={localStyles.emptyText}>
                    Cuando envíes una compra, servicio o reserva,
                    podrás seguir su estado aquí.
                  </Text>
                </View>
              ) : (
                <View style={localStyles.list}>
                  {requests.map((request) => (
                    <TouchableOpacity
                      key={request.id}
                      accessibilityHint="Abre el detalle de esta solicitud"
                      accessibilityLabel={
                        `Abrir ${getCommercialRequestListTypeLabel(request.request_type)} `
                        + `${request.code}`
                      }
                      accessibilityRole="button"
                      activeOpacity={0.8}
                      onPress={() => handleOpenRequest(request.id)}
                      style={localStyles.requestCard}
                    >
                      <View style={localStyles.cardTopRow}>
                        <View style={localStyles.typeIcon}>
                          <RequestTypeIcon
                            requestType={request.request_type}
                          />
                        </View>

                        <View style={localStyles.cardTitleWrap}>
                          <Text style={localStyles.requestType}>
                            {getCommercialRequestListTypeLabel(
                              request.request_type,
                            )}
                          </Text>

                          <Text style={localStyles.requestCode}>
                            {request.code}
                          </Text>
                        </View>

                        <ChevronRight
                          color="#8D9ABE"
                          size={20}
                          strokeWidth={2.2}
                        />
                      </View>

                      <View style={localStyles.statusRow}>
                        <View
                          accessibilityLabel={
                            `Estado de solicitud: ${getCommercialRequestListStatusLabel(
                              request.status,
                            )}`
                          }
                          style={[
                            localStyles.statusBadge,
                            statusToneStyles[
                              getCommercialRequestListStatusTone(
                                request.status,
                              )
                            ],
                          ]}
                        >
                          <Text style={localStyles.statusText}>
                            {getCommercialRequestListStatusLabel(
                              request.status,
                            )}
                          </Text>
                        </View>

                        <Text style={localStyles.itemCount}>
                          {getCommercialRequestListItemCountLabel(
                            request.item_count,
                          )}
                        </Text>
                      </View>

                      <View style={localStyles.cardDetails}>
                        <Text style={localStyles.detailText}>
                          Modalidad:{' '}
                          {request.requested_modality
                            ? getCommercialModalityLabel(
                              request.requested_modality,
                            )
                            : 'Por confirmar'}
                        </Text>

                        <Text style={localStyles.detailText}>
                          Creada:{' '}
                          {formatCommercialRequestListDate(
                            request.created_at,
                          )}
                        </Text>
                      </View>

                      <View style={localStyles.totalRow}>
                        <Text style={localStyles.totalLabel}>
                          Total
                        </Text>

                        <Text style={localStyles.totalAmount}>
                          {formatCommercialRequestListAmount(
                            request.total_amount,
                            request.currency_code,
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
  shortcutsRow: {
    gap: 10,
    marginBottom: 24,
  },
  shortcutCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    paddingBottom: 11,
    paddingLeft: 11,
    paddingRight: 14,
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
  shortcutCardMuted: {
    alignItems: 'center',
    backgroundColor: '#FBFAFF',
    borderColor: '#E0E6F4',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    opacity: 0.92,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  shortcutIconWrap: {
    alignItems: 'center',
    backgroundColor: BEE_PURPLE,
    borderRadius: 12,
    height: 37,
    justifyContent: 'center',
    width: 37,
  },
  shortcutIconWrapMuted: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    height: 37,
    justifyContent: 'center',
    width: 37,
  },
  shortcutTextColumn: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  shortcutTitle: {
    color: '#26314D',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  shortcutHint: {
    color: '#6C7892',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
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
  list: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E6F4',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#8D9ABE',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  typeIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    marginRight: 11,
    width: 42,
  },
  cardTitleWrap: {
    flex: 1,
  },
  requestType: {
    color: '#6C7892',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  requestCode: {
    color: '#26314D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusNeutral: {
    backgroundColor: '#EEF2FF',
  },
  statusSuccess: {
    backgroundColor: '#E7F6EF',
  },
  statusWarning: {
    backgroundColor: '#FFF6E6',
  },
  statusDanger: {
    backgroundColor: '#FCE8EB',
  },
  statusText: {
    color: '#394561',
    fontSize: 12,
    fontWeight: '700',
  },
  itemCount: {
    color: '#6C7892',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    borderBottomColor: '#EEF2FF',
    borderBottomWidth: 1,
    gap: 4,
    marginTop: 12,
    paddingBottom: 12,
  },
  detailText: {
    color: '#6C7892',
    fontSize: 12,
    lineHeight: 17,
  },
  totalRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  totalLabel: {
    color: '#6C7892',
    fontSize: 13,
    fontWeight: '600',
  },
  totalAmount: {
    color: '#26314D',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F9F3FC',
    borderColor: '#E8D1F1',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 23,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#38294E',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: '#866D9F',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
});

const statusToneStyles = {
  neutral: localStyles.statusNeutral,
  success: localStyles.statusSuccess,
  warning: localStyles.statusWarning,
  danger: localStyles.statusDanger,
};
