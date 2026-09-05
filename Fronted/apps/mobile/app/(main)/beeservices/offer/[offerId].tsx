import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Package,
  ShoppingBag,
  Wrench,
} from 'lucide-react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialPublicOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../../src/features/buddyservices/commercialErrors';
import {
  loadPublicCommercialOffer,
} from '../../../../src/services/commercialService';

function normalizeParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function formatCop(
  amount: number | null,
): string {
  if (amount === null) {
    return '';
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      currency: 'COP',
      maximumFractionDigits: 0,
      style: 'currency',
    },
  ).format(amount);
}

function priceLabel(
  offer: CommercialPublicOffer,
): string {
  if (offer.pricing_strategy === 'free') {
    return 'Gratis';
  }

  if (offer.pricing_strategy === 'to_be_confirmed') {
    return 'Precio por confirmar';
  }

  const amount = formatCop(offer.base_price_amount);

  if (offer.pricing_strategy === 'starting_at') {
    return amount
      ? `Desde ${amount}`
      : 'Precio desde por confirmar';
  }

  return amount || 'Precio por confirmar';
}

function paymentPolicyLabel(
  offer: CommercialPublicOffer,
): string | null {
  if (offer.offer_kind !== 'service') {
    return null;
  }

  const labels: Record<string, string> = {
    not_required: 'No requiere pago anticipado',
    required_before_confirmation: (
      'El pago externo se requiere antes de confirmar'
    ),
    required_after_service: (
      'El pago externo se coordina después del servicio'
    ),
    to_be_agreed: 'Las condiciones de pago se acuerdan',
  };

  return offer.payment_policy
    ? labels[offer.payment_policy] || null
    : null;
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

function getPrimaryImageUrl(
  offer: CommercialPublicOffer,
): string | null {
  return (
    offer.images.find((image) => image.is_primary)?.url
    || offer.images[0]?.url
    || null
  );
}

export default function BuddyServicesPublicOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    offerId?: string | string[];
  }>();

  const offerId = normalizeParam(params.offerId);

  const [offer, setOffer] = useState<
    CommercialPublicOffer | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(
    null,
  );

  const primaryImageUrl = useMemo(() => (
    offer
      ? getPrimaryImageUrl(offer)
      : null
  ), [offer]);

  const paymentLabel = useMemo(() => (
    offer
      ? paymentPolicyLabel(offer)
      : null
  ), [offer]);

  const loadOffer = useCallback(async () => {
    if (!offerId) {
      setLoading(false);
      setError({
        title: 'Oferta no identificada',
        message: (
          'No fue posible identificar el producto o servicio '
          + 'que quieres consultar.'
        ),
        retryable: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loadPublicCommercialOffer(offerId);

      setOffer(response.offer);
    } catch (loadError) {
      setError(toCommercialUiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadOffer();
    } finally {
      setRefreshing(false);
    }
  }, [loadOffer]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(main)/beeservices');
  }, [router]);

  const handleCommercialAction = useCallback(() => {
    if (!offer) {
      return;
    }

    Alert.alert(
      offer.requires_booking
        ? 'Reserva próximamente'
        : 'Solicitud próximamente',
      offer.requires_booking
        ? (
          'El flujo formal de reserva, hold y negociación '
          + 'se habilitará en el Bloque 6.'
        )
        : (
          'El flujo formal de solicitud y carrito se '
          + 'habilitará en los Bloques 4 y 5.'
        ),
    );
  }, [offer]);

  if (loading && !offer) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            color="#7427D5"
            size="small"
          />

          <Text style={styles.loadingText}>
            Cargando oferta…
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!offer || error) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            {error?.title || 'Oferta no disponible'}
          </Text>

          <Text style={styles.errorText}>
            {error?.message || (
              'Este producto o servicio ya no está disponible.'
            )}
          </Text>

          {error?.retryable ? (
            <TouchableOpacity
              accessibilityLabel="Reintentar carga de oferta"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => void loadOffer()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="Volver"
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

  const isProduct = offer.offer_kind === 'product';
  const actionLabel = offer.requires_booking
    ? 'Solicitar reserva'
    : isProduct
    ? 'Solicitar producto'
    : 'Solicitar servicio';

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
            {isProduct ? 'Producto' : 'Servicio'}
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
          <View style={styles.imageBox}>
            {primaryImageUrl ? (
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={{
                  uri: primaryImageUrl,
                }}
                style={styles.image}
              />
            ) : isProduct ? (
              <Package
                color="#7B2DD9"
                size={58}
              />
            ) : (
              <Wrench
                color="#7B2DD9"
                size={58}
              />
            )}
          </View>

          <View style={styles.kindRow}>
            {isProduct ? (
              <ShoppingBag
                color="#7A579D"
                size={16}
              />
            ) : (
              <Wrench
                color="#7A579D"
                size={16}
              />
            )}

            <Text style={styles.kindText}>
              {isProduct ? 'Producto' : 'Servicio'}
            </Text>
          </View>

          <Text style={styles.title}>
            {offer.title}
          </Text>

          <Text style={styles.price}>
            {priceLabel(offer)}
          </Text>

          {offer.pricing_strategy === 'starting_at' ? (
            <Text style={styles.priceHint}>
              El valor final puede cambiar según las condiciones
              acordadas con el negocio.
            </Text>
          ) : null}

          {offer.pricing_strategy === 'to_be_confirmed' ? (
            <Text style={styles.priceHint}>
              El negocio confirmará el valor dentro de la solicitud.
            </Text>
          ) : null}

          {offer.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Descripción
              </Text>

              <Text style={styles.description}>
                {offer.description}
              </Text>
            </View>
          ) : null}

          {offer.requires_booking ? (
            <View style={styles.infoCard}>
              <CalendarClock
                color="#7427D5"
                size={20}
              />

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Servicio con reserva
                </Text>

                <Text style={styles.infoText}>
                  El horario será una propuesta hasta que el negocio
                  lo acepte. La disponibilidad final siempre la
                  confirma el backend.
                </Text>
              </View>
            </View>
          ) : null}

          {offer.duration_minutes ? (
            <View style={styles.infoCard}>
              <Clock3
                color="#7427D5"
                size={20}
              />

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Duración estimada
                </Text>

                <Text style={styles.infoText}>
                  {offer.duration_minutes} minutos
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Modalidades disponibles
            </Text>

            {offer.modalities.length > 0 ? (
              <View style={styles.modalitiesWrap}>
                {offer.modalities.map((modality) => (
                  <View
                    key={modality}
                    style={styles.modalityChip}
                  >
                    <Text style={styles.modalityText}>
                      {modalityLabel(modality)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                El negocio no especificó modalidades para esta oferta.
              </Text>
            )}
          </View>

          {paymentLabel ? (
            <View style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>
                Política de pago
              </Text>

              <Text style={styles.paymentText}>
                {paymentLabel}
              </Text>

              <Text style={styles.paymentHint}>
                BeeApp no procesa dinero. Las instrucciones de pago
                externas solo se mostrarán cuando una solicitud
                aceptada las habilite.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={handleCommercialAction}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
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
  imageBox: {
    alignItems: 'center',
    backgroundColor: '#F4E9FC',
    borderRadius: 22,
    height: 235,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  kindRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 18,
  },
  kindText: {
    color: '#7A579D',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#261743',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    marginTop: 6,
  },
  price: {
    color: '#6527AA',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 9,
  },
  priceHint: {
    color: '#806899',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  section: {
    marginTop: 23,
  },
  sectionTitle: {
    color: '#261743',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 9,
  },
  description: {
    color: '#59496B',
    fontSize: 14,
    lineHeight: 21,
  },
  infoCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F9F3FC',
    borderColor: '#E8D1F1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 16,
    padding: 14,
  },
  infoContent: {
    flex: 1,
    marginLeft: 11,
  },
  infoTitle: {
    color: '#4C2C6D',
    fontSize: 13,
    fontWeight: '800',
  },
  infoText: {
    color: '#73568F',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  modalitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalityChip: {
    backgroundColor: '#F4EAFE',
    borderColor: '#DEC7F0',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  modalityText: {
    color: '#5C2B91',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#806899',
    fontSize: 13,
    lineHeight: 19,
  },
  paymentCard: {
    backgroundColor: '#FFF8E7',
    borderColor: '#F0D79F',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 23,
    padding: 15,
  },
  paymentTitle: {
    color: '#704E11',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentText: {
    color: '#6D551E',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  paymentHint: {
    color: '#856E37',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 15,
    marginTop: 28,
    minHeight: 51,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
