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
  Modal,
  Pressable,
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
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
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
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [pendingDate, setPendingDate] = useState('');
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

  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }, []);

  const dateFieldLabel = useMemo(() => {
    if (!localDate) {
      return 'Selecciona una fecha';
    }

    const [year, month, day] = localDate.split('-').map(Number);
    const value = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
      year: 'numeric',
    }).format(value);
  }, [localDate]);

  const calendarMonthLabel = useMemo(() => (
    new Intl.DateTimeFormat('es-CO', {
      month: 'long',
      year: 'numeric',
    }).format(calendarMonth)
  ), [calendarMonth]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const leadingEmptyDays = (firstWeekday + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: Array<number | null> = Array.from(
      { length: leadingEmptyDays },
      () => null,
    );

    for (let day = 1; day <= totalDays; day += 1) {
      days.push(day);
    }

    return days;
  }, [calendarMonth]);

  const timeOptions = useMemo(() => (
    Array.from({ length: 48 }, (_, index) => {
      const hour = String(Math.floor(index / 2)).padStart(2, '0');
      const minute = index % 2 === 0 ? '00' : '30';

      return `${hour}:${minute}`;
    })
  ), []);

  const openDatePicker = useCallback(() => {
    const initialDate = localDate || todayIso;
    const [year, month] = initialDate.split('-').map(Number);

    setPendingDate(initialDate);
    setCalendarMonth(new Date(year, month - 1, 1));
    setIsDatePickerVisible(true);
  }, [localDate, todayIso]);

  const selectCalendarDate = useCallback((day: number) => {
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');

    setPendingDate(`${year}-${month}-${String(day).padStart(2, '0')}`);
  }, [calendarMonth]);

  const confirmDate = useCallback(() => {
    if (!pendingDate || pendingDate < todayIso) {
      return;
    }

    invalidateSubmissionIdempotencyKey();
    setLocalDate(pendingDate);
    setIsDatePickerVisible(false);
  }, [
    invalidateSubmissionIdempotencyKey,
    pendingDate,
    todayIso,
  ]);

  const selectTime = useCallback((value: string) => {
    invalidateSubmissionIdempotencyKey();
    setLocalTime(value);
    setIsTimePickerVisible(false);
  }, [invalidateSubmissionIdempotencyKey]);

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
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.centered}
>
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
          <TouchableOpacity
            accessibilityHint="Abre el calendario para elegir la fecha de la reserva"
            accessibilityLabel="Seleccionar fecha solicitada"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={openDatePicker}
            style={styles.pickerField}
          >
            <CalendarClock color="#7427D5" size={20} />
            <Text
              style={[
                styles.pickerFieldText,
                !localDate ? styles.pickerPlaceholderText : null,
              ]}
            >
              {dateFieldLabel}
            </Text>
            <ChevronRight color="#79688C" size={20} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Hora</Text>
          <TouchableOpacity
            accessibilityHint="Abre las horas disponibles para tu solicitud"
            accessibilityLabel="Seleccionar hora solicitada"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => setIsTimePickerVisible(true)}
            style={styles.pickerField}
          >
            <Clock3 color="#7427D5" size={20} />
            <Text
              style={[
                styles.pickerFieldText,
                !localTime ? styles.pickerPlaceholderText : null,
              ]}
            >
              {localTime || 'Selecciona una hora'}
            </Text>
            <ChevronRight color="#79688C" size={20} />
          </TouchableOpacity>

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
accessibilityState={{
selected: requestedModality === modality,
}}
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
accessibilityState={{
busy: submitting,
disabled: !canSubmit,
}}
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

      <Modal
        animationType="slide"
        onRequestClose={() => setIsDatePickerVisible(false)}
        transparent
        visible={isDatePickerVisible}
      >
        <Pressable
          onPress={() => setIsDatePickerVisible(false)}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.modalSheet}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  Elige una fecha
                </Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona el día propuesto para tu reserva.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Cerrar calendario"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setIsDatePickerVisible(false)}
                style={styles.modalCloseButton}
              >
                <X color="#523C70" size={21} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarNavigation}>
              <TouchableOpacity
                accessibilityLabel="Mes anterior"
                accessibilityRole="button"
                onPress={() => setCalendarMonth((current) => (
                  new Date(
                    current.getFullYear(),
                    current.getMonth() - 1,
                    1,
                  )
                ))}
                style={styles.calendarNavigationButton}
              >
                <ChevronLeft color="#523C70" size={22} />
              </TouchableOpacity>

              <Text style={styles.calendarMonthLabel}>
                {calendarMonthLabel}
              </Text>

              <TouchableOpacity
                accessibilityLabel="Mes siguiente"
                accessibilityRole="button"
                onPress={() => setCalendarMonth((current) => (
                  new Date(
                    current.getFullYear(),
                    current.getMonth() + 1,
                    1,
                  )
                ))}
                style={styles.calendarNavigationButton}
              >
                <ChevronRight color="#523C70" size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                <Text key={day} style={styles.weekdayLabel}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={styles.calendarDayCell}
                    />
                  );
                }

                const year = calendarMonth.getFullYear();
                const month = String(
                  calendarMonth.getMonth() + 1,
                ).padStart(2, '0');
                const isoDate = (
                  `${year}-${month}-${String(day).padStart(2, '0')}`
                );
                const isDisabled = isoDate < todayIso;
                const isSelected = isoDate === pendingDate;

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Seleccionar día ${day}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: isDisabled,
                      selected: isSelected,
                    }}
                    disabled={isDisabled}
                    key={isoDate}
                    onPress={() => selectCalendarDate(day)}
                    style={[
                      styles.calendarDayCell,
                      isSelected ? styles.calendarDaySelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isDisabled
                          ? styles.calendarDayDisabledText
                          : null,
                        isSelected
                          ? styles.calendarDaySelectedText
                          : null,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              accessibilityLabel="Confirmar fecha de reserva"
              accessibilityRole="button"
              disabled={!pendingDate || pendingDate < todayIso}
              onPress={confirmDate}
              style={[
                styles.modalPrimaryButton,
                !pendingDate || pendingDate < todayIso
                  ? styles.disabledButton
                  : null,
              ]}
            >
              <Text style={styles.modalPrimaryButtonText}>
                Confirmar fecha
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsTimePickerVisible(false)}
        transparent
        visible={isTimePickerVisible}
      >
        <Pressable
          onPress={() => setIsTimePickerVisible(false)}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.modalSheet}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  Elige una hora
                </Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona una hora propuesta para la reserva.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Cerrar selector de hora"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setIsTimePickerVisible(false)}
                style={styles.modalCloseButton}
              >
                <X color="#523C70" size={21} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.timeOptionsGrid}
              showsVerticalScrollIndicator={false}
            >
              {timeOptions.map((option) => {
                const isSelected = option === localTime;

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Elegir hora ${option}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option}
                    onPress={() => selectTime(option)}
                    style={[
                      styles.timeOption,
                      isSelected ? styles.timeOptionSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        isSelected
                          ? styles.timeOptionSelectedText
                          : null,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  pickerField: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCCBEE',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  pickerFieldText: {
    color: '#372849',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  pickerPlaceholderText: {
    color: '#8D8497',
    fontWeight: '500',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(24, 11, 49, 0.44)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: 28,
  },
  modalHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#F0EAF3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    color: '#261743',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  modalCloseButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  calendarNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  calendarNavigationButton: {
    alignItems: 'center',
    borderColor: '#E8DDF0',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  calendarMonthLabel: {
    color: '#372849',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  weekdayLabel: {
    color: '#8A7B98',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  calendarDayCell: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    marginVertical: 2,
    width: '14.2857%',
  },
  calendarDaySelected: {
    backgroundColor: '#7427D5',
    borderRadius: 21,
  },
  calendarDayText: {
    color: '#3D2E4D',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarDayDisabledText: {
    color: '#C7BDCE',
  },
  calendarDaySelectedText: {
    color: '#FFFFFF',
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 14,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    minHeight: 52,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 20,
  },
  timeOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCCBEE',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    width: '30.8%',
  },
  timeOptionSelected: {
    backgroundColor: '#7427D5',
    borderColor: '#7427D5',
  },
  timeOptionText: {
    color: '#4A3E58',
    fontSize: 14,
    fontWeight: '800',
  },
  timeOptionSelectedText: {
    color: '#FFFFFF',
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
