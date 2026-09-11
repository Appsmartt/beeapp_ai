import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Clock3,
  RefreshCw,
  Save,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialOwnedProfile,
  CommercialProfileHour,
} from '@beeapp/shared-types';

import CircularTimePicker from '../../../../../src/components/buddyservices/CircularTimePicker';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  loadOwnedCommercialProfile,
  updateOwnedCommercialProfile,
} from '../../../../../src/services/commercialService';

type WeeklyHour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type TimePickerTarget = {
  day_of_week: number;
  field: 'opens_at' | 'closes_at';
  label: string;
} | null;

const WEEK_DAYS: Array<{
  day_of_week: number;
  label: string;
}> = [
  {
    day_of_week: 0,
    label: 'Domingo',
  },
  {
    day_of_week: 1,
    label: 'Lunes',
  },
  {
    day_of_week: 2,
    label: 'Martes',
  },
  {
    day_of_week: 3,
    label: 'Miércoles',
  },
  {
    day_of_week: 4,
    label: 'Jueves',
  },
  {
    day_of_week: 5,
    label: 'Viernes',
  },
  {
    day_of_week: 6,
    label: 'Sábado',
  },
];

const DEFAULT_OPENING_TIME = '09:00';
const DEFAULT_CLOSING_TIME = '18:00';

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function normalizeTime(
  value: string | null | undefined,
): string | null {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, 5);
}

function createClosedWeek(): WeeklyHour[] {
  return WEEK_DAYS.map((day) => ({
    day_of_week: day.day_of_week,
    opens_at: null,
    closes_at: null,
    is_closed: true,
  }));
}

function createWeeklyHours(
  sourceHours: CommercialProfileHour[] | null | undefined,
): WeeklyHour[] {
  const hoursByDay = new Map<number, CommercialProfileHour>();

  (sourceHours || []).forEach((hour) => {
    if (
      Number.isInteger(hour.day_of_week)
      && hour.day_of_week >= 0
      && hour.day_of_week <= 6
    ) {
      hoursByDay.set(hour.day_of_week, hour);
    }
  });

  return WEEK_DAYS.map((day) => {
    const sourceHour = hoursByDay.get(day.day_of_week);

    if (!sourceHour) {
      return {
        day_of_week: day.day_of_week,
        opens_at: null,
        closes_at: null,
        is_closed: true,
      };
    }

    return {
      day_of_week: day.day_of_week,
      opens_at: normalizeTime(sourceHour.opens_at),
      closes_at: normalizeTime(sourceHour.closes_at),
      is_closed: Boolean(sourceHour.is_closed),
    };
  });
}

function isValidTime(value: string | null): value is string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(':').map(Number);

  return (
    Number.isInteger(hours)
    && Number.isInteger(minutes)
    && hours >= 0
    && hours <= 23
    && minutes >= 0
    && minutes <= 59
  );
}

function dayLabel(dayOfWeek: number): string {
  return WEEK_DAYS.find(
    (day) => day.day_of_week === dayOfWeek,
  )?.label || 'Este día';
}

function buildHoursPayload(
  currentHours: WeeklyHour[],
): CommercialProfileHour[] {
  return currentHours.map((hour) => {
    if (hour.is_closed) {
      return {
        day_of_week: hour.day_of_week,
        opens_at: null,
        closes_at: null,
        is_closed: true,
      };
    }

    const opensAt = normalizeTime(hour.opens_at);
    const closesAt = normalizeTime(hour.closes_at);
    const label = dayLabel(hour.day_of_week);

    if (!isValidTime(opensAt) || !isValidTime(closesAt)) {
      throw new Error(
        `${label}: usa horas válidas con formato HH:MM.`,
      );
    }

    if (closesAt <= opensAt) {
      throw new Error(
        `${label}: la hora de cierre debe ser posterior a la apertura.`,
      );
    }

    return {
      day_of_week: hour.day_of_week,
      opens_at: opensAt,
      closes_at: closesAt,
      is_closed: false,
    };
  });
}

export default function BuddyServicesManageHoursScreen() {
  console.log(
    '[BEEAPP_HOURS_DEBUG] Render de hours.tsx iniciado',
  );

  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const businessId = normalizeBusinessId(params.businessId);

  console.log(
    '[BEEAPP_HOURS_DEBUG] Parámetros de horarios resueltos',
    {
      params,
      businessId,
    },
  );

  const [profile, setProfile] = useState<
    CommercialOwnedProfile | null
  >(null);
  const [hours, setHours] = useState<WeeklyHour[]>(
    createClosedWeek,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [timePickerTarget, setTimePickerTarget] = useState<
    TimePickerTarget
  >(null);

  const timezoneLabel = useMemo(
    () => profile?.timezone || 'America/Bogota',
    [profile?.timezone],
  );

  const loadProfile = useCallback(async () => {
    console.log(
      '[BEEAPP_HOURS_DEBUG] Iniciando carga de perfil comercial',
      {
        businessId,
      },
    );

    if (!businessId) {
      console.error(
        '[BEEAPP_HOURS_DEBUG] businessId vacío o inválido',
        {
          params,
          businessId,
        },
      );
      setProfile(null);
      setHours(createClosedWeek());
      setErrorMessage(
        'No fue posible identificar el negocio solicitado.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loadOwnedCommercialProfile(
        businessId,
      );

      console.log(
        '[BEEAPP_HOURS_DEBUG] Perfil comercial cargado',
        {
          profileId: response.profile.id,
          displayName: response.profile.display_name,
          hours: response.profile.hours,
          hoursCount: response.profile.hours?.length || 0,
        },
      );

      setProfile(response.profile);
      setHours(createWeeklyHours(response.profile.hours));
    } catch (error) {
      console.error(
        '[BEEAPP_HOURS_DEBUG] Error cargando perfil comercial',
        error,
      );

      const uiError = toCommercialUiError(error);

      console.error(
        '[BEEAPP_HOURS_DEBUG] Error transformado para UI',
        uiError,
      );

      setProfile(null);
      setHours(createClosedWeek());
      setErrorMessage(uiError.message);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateDay = useCallback((
    dayOfWeek: number,
    changes: Partial<WeeklyHour>,
  ) => {
    setHours((currentHours) => currentHours.map((hour) => (
      hour.day_of_week === dayOfWeek
        ? {
          ...hour,
          ...changes,
        }
        : hour
    )));
  }, []);

  const openTimePicker = useCallback((
    dayOfWeek: number,
    field: 'opens_at' | 'closes_at',
  ) => {
    setTimePickerPreviewValue(null);
    setTimePickerTarget({
      day_of_week: dayOfWeek,
      field,
      label: dayLabel(dayOfWeek),
    });
  }, []);

  const selectedTimePickerHour = useMemo(() => {
    if (!timePickerTarget) {
      return null;
    }

    return hours.find(
      (item) => (
        item.day_of_week === timePickerTarget.day_of_week
      ),
    ) || null;
  }, [hours, timePickerTarget]);

  const selectedTimePickerInitialValue = useMemo(() => {
    if (!timePickerTarget || !selectedTimePickerHour) {
      return DEFAULT_OPENING_TIME;
    }

    return normalizeTime(
      selectedTimePickerHour[timePickerTarget.field],
    ) || (
      timePickerTarget.field === 'opens_at'
        ? DEFAULT_OPENING_TIME
        : DEFAULT_CLOSING_TIME
    );
  }, [
    selectedTimePickerHour,
    timePickerTarget,
  ]);

  const validateSelectedTime = useCallback((
    value: string,
  ): string | null => {
    if (!timePickerTarget || !selectedTimePickerHour) {
      return null;
    }

    const otherValue = normalizeTime(
      timePickerTarget.field === 'opens_at'
        ? selectedTimePickerHour.closes_at
        : selectedTimePickerHour.opens_at,
    );

    if (!otherValue) {
      return null;
    }

    if (
      timePickerTarget.field === 'closes_at'
      && value <= otherValue
    ) {
      return 'El cierre debe ser posterior a la apertura.';
    }

    return null;
  }, [
    selectedTimePickerHour,
    timePickerTarget,
  ]);

  const [timePickerPreviewValue, setTimePickerPreviewValue] = useState<
    string | null
  >(null);

  const timePickerValidationMessage = useMemo(
    () => (
      timePickerPreviewValue
        ? validateSelectedTime(timePickerPreviewValue)
        : null
    ),
    [
      timePickerPreviewValue,
      validateSelectedTime,
    ],
  );

  const applyTimePicker = useCallback((
    value: string,
  ) => {
    if (!timePickerTarget) {
      return;
    }

    const currentDay = hours.find(
      (hour) => (
        hour.day_of_week === timePickerTarget.day_of_week
      ),
    );

    const currentClosingTime = normalizeTime(
      currentDay?.closes_at,
    );

    if (timePickerTarget.field === 'opens_at') {
      const [openingHourText, openingMinuteText] = value.split(':');
      const openingHour = Number.parseInt(openingHourText, 10);
      const openingMinute = Number.parseInt(openingMinuteText, 10);
      const automaticClosingHour = openingHour + 1;

      if (
        !Number.isFinite(openingHour)
        || !Number.isFinite(openingMinute)
        || automaticClosingHour > 23
      ) {
        setErrorMessage(
          'La apertura debe permitir al menos una hora de atención antes del cierre.',
        );
        return;
      }

      if (
        currentClosingTime
        && value >= currentClosingTime
      ) {
        const automaticClosing = `${String(
          automaticClosingHour,
        ).padStart(2, '0')}:${String(
          openingMinute,
        ).padStart(2, '0')}`;

        updateDay(timePickerTarget.day_of_week, {
          closes_at: automaticClosing,
          opens_at: value,
        });
        setErrorMessage(
          `El cierre se ajustó automáticamente a las ${automaticClosing}.`,
        );
        setTimePickerPreviewValue(null);
        setTimePickerTarget(null);
        return;
      }
    }

    const validationMessage = validateSelectedTime(value);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    updateDay(timePickerTarget.day_of_week, {
      [timePickerTarget.field]: value,
    });
    setTimePickerPreviewValue(null);
    setTimePickerTarget(null);
  }, [
    timePickerTarget,
    updateDay,
    validateSelectedTime,
  ]);

  const setDayOpen = useCallback((
    dayOfWeek: number,
    isOpen: boolean,
  ) => {
    setHours((currentHours) => currentHours.map((hour) => {
      if (hour.day_of_week !== dayOfWeek) {
        return hour;
      }

      if (!isOpen) {
        return {
          ...hour,
          is_closed: true,
          opens_at: null,
          closes_at: null,
        };
      }

      return {
        ...hour,
        is_closed: false,
        opens_at: hour.opens_at || DEFAULT_OPENING_TIME,
        closes_at: hour.closes_at || DEFAULT_CLOSING_TIME,
      };
    }));
  }, []);

  const save = useCallback(async () => {
    console.log(
      '[BEEAPP_HOURS_DEBUG] Inicio de guardado de horarios',
      {
        businessId,
        profileId: profile?.id || null,
        hours,
      },
    );

    if (!businessId || !profile) {
      setErrorMessage(
        'No fue posible identificar el negocio solicitado.',
      );
      return;
    }

    let payloadHours: CommercialProfileHour[];

    try {
      payloadHours = buildHoursPayload(hours);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Revisa los horarios antes de guardar.',
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      console.log(
        '[BEEAPP_HOURS_DEBUG] Enviando PATCH de horarios',
        {
          businessId,
          payloadHours,
        },
      );

      const response = await updateOwnedCommercialProfile(
        businessId,
        {
          hours: payloadHours,
        },
      );

      console.log(
        '[BEEAPP_HOURS_DEBUG] Horarios guardados correctamente',
        {
          profileId: response.profile.id,
          hours: response.profile.hours,
        },
      );

      setProfile(response.profile);
      setHours(createWeeklyHours(response.profile.hours));
      router.back();
    } catch (error) {
      console.error(
        '[BEEAPP_HOURS_DEBUG] Error guardando horarios',
        error,
      );

      const uiError = toCommercialUiError(error);

      console.error(
        '[BEEAPP_HOURS_DEBUG] Error de guardado transformado para UI',
        uiError,
      );

      setErrorMessage(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [businessId, hours, profile, router]);

  return (
    <SafeAreaView
      style={{
        backgroundColor: '#FBF9FE',
        flex: 1,
      }}
    >
      <View
        style={{
          backgroundColor: '#FBF9FE',
          flex: 1,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E7DDF2',
            borderBottomWidth: 1,
            flexDirection: 'row',
            minHeight: 66,
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            accessibilityLabel="Volver a gestión del negocio"
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={isSaving}
            onPress={() => router.back()}
            style={{
              alignItems: 'center',
              height: 42,
              justifyContent: 'center',
              marginRight: 8,
              width: 42,
            }}
          >
            <ArrowLeft
              color="#261743"
              size={23}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: '#261743',
                fontSize: 17,
                fontWeight: '900',
              }}
            >
              Horario del negocio
            </Text>

            <Text
              numberOfLines={1}
              style={{
                color: '#786593',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {profile?.display_name || 'Configura tu disponibilidad'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
          >
            <ActivityIndicator
              color="#7427D5"
              size="large"
            />

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                marginTop: 13,
              }}
            >
              Cargando horario del negocio…
            </Text>
          </View>
        ) : !profile ? (
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#F6EAFE',
                borderRadius: 16,
                height: 56,
                justifyContent: 'center',
                width: 56,
              }}
            >
              <Clock3
                color="#7427D5"
                size={26}
              />
            </View>

            <Text
              style={{
                color: '#261743',
                fontSize: 16,
                fontWeight: '900',
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              No pudimos cargar el horario
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 13,
                lineHeight: 20,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              {errorMessage || (
                'Intenta cargar nuevamente los datos del negocio.'
              )}
            </Text>

            <TouchableOpacity
              accessibilityLabel="Reintentar cargar horario"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => {
                void loadProfile();
              }}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 14,
                flexDirection: 'row',
                marginTop: 20,
                minHeight: 46,
                paddingHorizontal: 16,
              }}
            >
              <RefreshCw
                color="#FFFFFF"
                size={17}
              />

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '800',
                  marginLeft: 8,
                }}
              >
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 36,
              paddingHorizontal: 16,
              paddingTop: 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: '#F6EAFE',
                borderColor: '#E7DDF2',
                borderRadius: 16,
                borderWidth: 1,
                padding: 15,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    height: 42,
                    justifyContent: 'center',
                    width: 42,
                  }}
                >
                  <Clock3
                    color="#7427D5"
                    size={20}
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                    marginLeft: 12,
                  }}
                >
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 15,
                      fontWeight: '800',
                    }}
                  >
                    Disponibilidad semanal
                  </Text>

                  <Text
                    style={{
                      color: '#786593',
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 3,
                    }}
                  >
                    {`Configura tus horas de atención. Zona horaria: ${timezoneLabel}.`}
                  </Text>
                </View>
              </View>
            </View>

            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginBottom: 14,
                marginTop: 16,
              }}
            >
              Activa los días en que atiendes clientes. Los días cerrados no
              tendrán disponibilidad pública.
            </Text>

            {errorMessage ? (
              <View
                style={{
                  backgroundColor: '#FEF3F2',
                  borderColor: '#FECDCA',
                  borderRadius: 13,
                  borderWidth: 1,
                  marginBottom: 12,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: '#B42318',
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {hours.map((hour) => {
              const isOpen = !hour.is_closed;
              const label = dayLabel(hour.day_of_week);

              return (
                <View
                  key={hour.day_of_week}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E7DDF2',
                    borderRadius: 16,
                    borderWidth: 1,
                    marginBottom: 11,
                    padding: 15,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: '#261743',
                          fontSize: 15,
                          fontWeight: '800',
                        }}
                      >
                        {label}
                      </Text>

                      <Text
                        style={{
                          color: isOpen
                            ? '#237B4B'
                            : '#786593',
                          fontSize: 12,
                          fontWeight: '700',
                          marginTop: 3,
                        }}
                      >
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </Text>
                    </View>

                    <Switch
                      accessibilityLabel={`${label}: ${
                        isOpen ? 'abierto' : 'cerrado'
                      }`}
                      disabled={isSaving}
                      onValueChange={(value) => {
                        setDayOpen(hour.day_of_week, value);
                      }}
                      value={isOpen}
                    />
                  </View>

                  {isOpen ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 10,
                        marginTop: 15,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            fontWeight: '700',
                            marginBottom: 7,
                          }}
                        >
                          Apertura
                        </Text>

                        <TouchableOpacity
                          accessibilityLabel={
                            `Elegir hora de apertura ${label}`
                          }
                          accessibilityRole="button"
                          activeOpacity={0.82}
                          disabled={isSaving}
                          onPress={() => {
                            openTimePicker(
                              hour.day_of_week,
                              'opens_at',
                            );
                          }}
                          style={{
                            alignItems: 'center',
                            backgroundColor: '#FAF6FF',
                            borderColor: '#DCCBEE',
                            borderRadius: 13,
                            borderWidth: 1,
                            flexDirection: 'row',
                            minHeight: 48,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Clock3
                            color="#7427D5"
                            size={17}
                          />

                          <Text
                            style={{
                              color: '#261743',
                              fontSize: 15,
                              fontWeight: '800',
                              marginLeft: 8,
                            }}
                          >
                            {hour.opens_at || DEFAULT_OPENING_TIME}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            fontWeight: '700',
                            marginBottom: 7,
                          }}
                        >
                          Cierre
                        </Text>

                        <TouchableOpacity
                          accessibilityLabel={
                            `Elegir hora de cierre ${label}`
                          }
                          accessibilityRole="button"
                          activeOpacity={0.82}
                          disabled={isSaving}
                          onPress={() => {
                            openTimePicker(
                              hour.day_of_week,
                              'closes_at',
                            );
                          }}
                          style={{
                            alignItems: 'center',
                            backgroundColor: '#FAF6FF',
                            borderColor: '#DCCBEE',
                            borderRadius: 13,
                            borderWidth: 1,
                            flexDirection: 'row',
                            minHeight: 48,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Clock3
                            color="#7427D5"
                            size={17}
                          />

                          <Text
                            style={{
                              color: '#261743',
                              fontSize: 15,
                              fontWeight: '800',
                              marginLeft: 8,
                            }}
                          >
                            {hour.closes_at || DEFAULT_CLOSING_TIME}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <TouchableOpacity
              accessibilityLabel="Guardar horario del negocio"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={isSaving}
              onPress={() => {
                void save();
              }}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 15,
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 8,
                minHeight: 52,
                opacity: isSaving ? 0.65 : 1,
                paddingHorizontal: 18,
              }}
            >
              {isSaving ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <Save
                  color="#FFFFFF"
                  size={19}
                />
              )}

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '800',
                  marginLeft: 8,
                }}
              >
                {isSaving
                  ? 'Guardando…'
                  : 'Guardar horario'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <CircularTimePicker
        initialValue={selectedTimePickerInitialValue}
        subtitle={
          timePickerTarget?.field === 'opens_at'
            ? 'Selecciona la hora en que inicia la atención.'
            : 'Selecciona la hora en que finaliza la atención.'
        }
        title={
          timePickerTarget?.field === 'opens_at'
            ? `Apertura · ${timePickerTarget?.label || ''}`
            : `Cierre · ${timePickerTarget?.label || ''}`
        }
        validationMessage={timePickerValidationMessage}
        visible={Boolean(timePickerTarget)}
        onClose={() => {
          setTimePickerPreviewValue(null);
          setTimePickerTarget(null);
        }}
        onConfirm={applyTimePicker}
        onValueChange={setTimePickerPreviewValue}
      />
    </SafeAreaView>
  );
}
