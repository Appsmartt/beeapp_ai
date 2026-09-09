import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
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
  CalendarClock,
  Clock3,
} from 'lucide-react-native';
import {
  ApiRequestError,
} from '@beeapp/api-client';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialModality,
  CommercialPublicOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  isBookableServiceOffer,
} from '../../../../../src/features/buddyservices/commercialBookingRequestPayload';
import {
  toCommercialUiError,
  type CommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  COMMERCIAL_RESERVATION_PENDING_NOTICE,
  formatCommercialReservationDateTime,
  isValidCommercialTimezone,
  toCommercialReservationStartsAtIso,
} from '../../../../../src/features/buddyservices/commercialReservationDateTime';
import {
  createCommercialRequestIdempotencyKey,
} from '../../../../../src/features/buddyservices/cart/businessCartRequestPayload';
import {
  buddyServicesRequestDetailRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';
import {
  createBookingRequest,
  loadPublicCommercialOffer,
  loadPublicCommercialProfile,
} from '../../../../../src/services/commercialService';

function normalizeParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

export default function BuddyServicesBookingRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    offerId?: string | string[];
  }>();
  const offerId = normalizeParam(params.offerId);

  const [offer, setOffer] = useState<CommercialPublicOffer | null>(
    null,
  );
  const [timezone, setTimezone] = useState('');
  const [requestedModality, setRequestedModality] = useState<
    CommercialModality | null
  >(null);
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CommercialUiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submissionIdempotencyKeyRef = useRef<string | null>(null);

  const invalidateSubmissionIdempotencyKey = useCallback(() => {
    submissionIdempotencyKeyRef.current = null;
  }, []);

  const loadBookingContext = useCallback(async () => {
    if (!offerId) {
      setLoading(false);
      setError({
        title: 'Servicio no identificado',
        message: (
          'No fue posible identificar el servicio que deseas reservar.'
        ),
        retryable: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offerResponse = await loadPublicCommercialOffer(offerId);
      const nextOffer = offerResponse.offer;

      if (!isBookableServiceOffer(nextOffer)) {
        setOffer(null);
        setTimezone('');
        setError({
          title: 'Reserva no disponible',
          message: (
            'Este flujo solo está disponible para servicios '
            + 'que requieren reserva.'
          ),
          retryable: false,
        });
        return;
      }

      const profileResponse = await loadPublicCommercialProfile(
        nextOffer.commercial_profile_id,
      );
      const nextTimezone = String(
        profileResponse.profile.timezone || '',
      ).trim();

      if (!isValidCommercialTimezone(nextTimezone)) {
        setOffer(null);
        setTimezone('');
        setError({
          title: 'Zona horaria no disponible',
          message: (
            'El negocio no tiene una zona horaria válida para '
            + 'recibir solicitudes de reserva.'
          ),
          retryable: true,
        });
        return;
      }

      setOffer(nextOffer);
      setTimezone(nextTimezone);
      setRequestedModality((currentModality) => (
        currentModality
        && nextOffer.modalities.includes(currentModality)
          ? currentModality
          : nextOffer.modalities[0] || null
      ));
    } catch (loadError) {
      setOffer(null);
      setTimezone('');
      setError(toCommercialUiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    void loadBookingContext();
  }, [loadBookingContext]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadBookingContext();
    } finally {
      setRefreshing(false);
    }
  }, [loadBookingContext]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(main)/beeservices');
  }, [router]);

  const requestedDateLabel = useMemo(() => {
    if (!localDate.trim() || !localTime.trim() || !timezone) {
      return null;
    }

    try {
      const startsAt = toCommercialReservationStartsAtIso({
        localDate,
        localTime,
        timezone,
      });

      return formatCommercialReservationDateTime(
        startsAt,
        timezone,
      );
    } catch {
      return null;
    }
  }, [
    localDate,
    localTime,
    timezone,
  ]);

  const canSubmit = Boolean(
    offer
    && requestedModality
    && localDate.trim()
    && localTime.trim()
    && timezone
    && !submitting
    && (
      requestedModality !== 'delivery'
      || deliveryAddress.trim()
    )
  );

  const handleSubmit = useCallback(async () => {
    if (!offer || !requestedModality || submitting) {
      return;
    }

    const idempotencyKey = (
      submissionIdempotencyKeyRef.current
      || createCommercialRequestIdempotencyKey()
    );

    submissionIdempotencyKeyRef.current = idempotencyKey;
    setSubmitting(true);

    try {
      const response = await createBookingRequest(
        {
          commercialOfferId: offer.id,
          commercialProfileId: offer.commercial_profile_id,
          requestedModality,
          customerNote,
          deliveryAddress,
          deliveryReference,
          localDate,
          localTime,
          timezone,
        },
        idempotencyKey,
      );

      submissionIdempotencyKeyRef.current = null;

      router.replace(
        buddyServicesRequestDetailRoute(
          response.request.request_id,
        ),
      );
    } catch (submitError) {
      const uiError = toCommercialUiError(submitError);
      const shouldRefresh = (
        submitError instanceof ApiRequestError
        && [400, 404, 409, 422].includes(submitError.status)
      );

      if (shouldRefresh) {
        try {
          await loadBookingContext();
          Alert.alert(
            'Información actualizada',
            `${uiError.message} Revisa la información antes de reenviar.`,
          );
        } catch {
          Alert.alert(uiError.title, uiError.message);
        }
      } else {
        Alert.alert(uiError.title, uiError.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    customerNote,
    deliveryAddress,
    deliveryReference,
    loadBookingContext,
    localDate,
    localTime,
    offer,
    requestedModality,
    router,
    submitting,
    timezone,
  ]);

  if (loading && !offer) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#7427D5" size="small" />
          <Text style={styles.centeredText}>
            Cargando servicio reservable…
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (error || !offer) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centered}>
          <CalendarClock color="#7427D5" size={36} />
          <Text style={styles.errorTitle}>
            {error?.title || 'Reserva no disponible'}
          </Text>
          <Text style={styles.errorText}>
            {error?.message || (
              'No fue posible cargar este servicio reservable.'
            )}
          </Text>

          {error?.retryable ? (
            <TouchableOpacity
              accessibilityLabel="Reintentar cargar solicitud de reserva"
              accessibilityRole="button"
              onPress={() => void loadBookingContext()}
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
            onPress={handleBack}
            style={styles.secondaryButton}
          >
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
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Volver al servicio"
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.backButton}
          >
            <ArrowLeft color="#38294E" size={22} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              Solicitud de reserva
            </Text>
            <Text style={styles.title}>
              {offer.title}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <CalendarClock color="#7427D5" size={24} />
          <Text style={styles.cardTitle}>
            Servicio reservable
          </Text>
          <Text style={styles.cardText}>
            Define una fecha propuesta. El negocio confirma
            disponibilidad, condiciones y estado final.
          </Text>
        </View>

        <View style={styles.timezoneCard}>
          <Clock3 color="#5F5274" size={20} />
          <View style={styles.timezoneContent}>
            <Text style={styles.timezoneLabel}>
              Zona horaria del negocio
            </Text>
            <Text style={styles.timezoneValue}>
              {timezone}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Fecha y hora solicitadas
          </Text>
          <Text style={styles.cardText}>
            El negocio valida disponibilidad y define la
            confirmación final.
          </Text>

          <Text style={styles.fieldLabel}>Fecha</Text>
          <TextInput
            accessibilityLabel="Fecha solicitada"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={(value) => {
              invalidateSubmissionIdempotencyKey();
              setLocalDate(value);
            }}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#8D8497"
            style={styles.input}
            value={localDate}
          />

          <Text style={styles.fieldLabel}>Hora</Text>
          <TextInput
            accessibilityLabel="Hora solicitada"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={(value) => {
              invalidateSubmissionIdempotencyKey();
              setLocalTime(value);
            }}
            placeholder="HH:mm"
            placeholderTextColor="#8D8497"
            style={styles.input}
            value={localTime}
          />

          {requestedDateLabel ? (
            <Text style={styles.previewText}>
              Vista previa: {requestedDateLabel}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Modalidad</Text>

          {offer.modalities.map((modality) => (
            <TouchableOpacity
              accessibilityLabel={
                `Elegir modalidad ${modality}`
              }
              accessibilityRole="button"
              key={modality}
              onPress={() => {
                invalidateSubmissionIdempotencyKey();
                setRequestedModality(modality);
              }}
              style={[
                styles.option,
                requestedModality === modality
                  ? styles.optionSelected
                  : null,
              ]}
            >
              <Text style={styles.optionText}>
                {modality}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {requestedModality === 'delivery' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Dirección de entrega
            </Text>

            <TextInput
              accessibilityLabel="Dirección de entrega"
              multiline
              onChangeText={(value) => {
                invalidateSubmissionIdempotencyKey();
                setDeliveryAddress(value);
              }}
              placeholder="Dirección"
              placeholderTextColor="#8D8497"
              style={styles.input}
              value={deliveryAddress}
            />

            <TextInput
              accessibilityLabel="Referencia de entrega"
              multiline
              onChangeText={(value) => {
                invalidateSubmissionIdempotencyKey();
                setDeliveryReference(value);
              }}
              placeholder="Referencia o indicaciones"
              placeholderTextColor="#8D8497"
              style={styles.input}
              value={deliveryReference}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Necesidad o comentario
          </Text>

          <TextInput
            accessibilityLabel="Necesidad o comentario"
            multiline
            onChangeText={(value) => {
              invalidateSubmissionIdempotencyKey();
              setCustomerNote(value);
            }}
            placeholder="Describe lo que necesitas"
            placeholderTextColor="#8D8497"
            style={[styles.input, styles.multilineInput]}
            value={customerNote}
          />
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            {COMMERCIAL_RESERVATION_PENDING_NOTICE}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Enviar solicitud de fecha"
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => void handleSubmit()}
          style={[
            styles.primaryButton,
            !canSubmit ? styles.disabledButton : null,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Enviar solicitud de fecha
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FCFAFF',
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  centeredText: {
    color: '#665B73',
    fontSize: 15,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#7A6E87',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#251A32',
    fontSize: 21,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9E3EF',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardTitle: {
    color: '#31223F',
    fontSize: 16,
    fontWeight: '800',
  },
  cardText: {
    color: '#655A71',
    fontSize: 14,
    lineHeight: 20,
  },
  timezoneCard: {
    alignItems: 'center',
    backgroundColor: '#F7F3FA',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  timezoneContent: {
    flex: 1,
  },
  timezoneLabel: {
    color: '#6D607B',
    fontSize: 12,
  },
  timezoneValue: {
    color: '#372849',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  fieldLabel: {
    color: '#4A3E58',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    borderColor: '#D8D0E1',
    borderRadius: 10,
    borderWidth: 1,
    color: '#2E223B',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 106,
    textAlignVertical: 'top',
  },
  previewText: {
    color: '#5B4A69',
    fontSize: 13,
    lineHeight: 19,
  },
  option: {
    borderColor: '#DED6E7',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  optionSelected: {
    backgroundColor: '#F4EAFF',
    borderColor: '#7427D5',
  },
  optionText: {
    color: '#3A2B48',
    fontSize: 14,
    fontWeight: '600',
  },
  noticeCard: {
    backgroundColor: '#FFF6DF',
    borderColor: '#EFCB75',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  noticeText: {
    color: '#6A4C00',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  disabledButton: {
    backgroundColor: '#B9A9CB',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#BEB2CA',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#4A3D59',
    fontSize: 15,
    fontWeight: '700',
  },
  errorTitle: {
    color: '#3A2B48',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: '#655A71',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
