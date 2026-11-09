import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Save,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useModuleNav,
  useScreenParams,
} from '../../../../../src/components/embedded/EmbeddedNavContext';

import type {
  CommercialOwnedProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  loadOwnedCommercialProfile,
  updateOwnedCommercialProfile,
} from '../../../../../src/services/commercialService';

type DeliveryFeeMode =
  | 'not_offered'
  | 'free'
  | 'fixed'
  | 'to_be_confirmed';

const DELIVERY_FEE_OPTIONS: Array<{
  value: DeliveryFeeMode;
  label: string;
  description: string;
}> = [
    {
      value: 'not_offered',
      label: 'No ofrezco domicilio',
      description: 'El negocio no entrega a domicilio.',
    },
    {
      value: 'free',
      label: 'Domicilio gratis',
      description: 'No se agrega costo de entrega.',
    },
    {
      value: 'fixed',
      label: 'Costo fijo',
      description: 'Define un monto fijo para el domicilio.',
    },
    {
      value: 'to_be_confirmed',
      label: 'Por confirmar',
      description: 'El costo se confirma durante la solicitud.',
    },
  ];

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  const normalized = Array.isArray(value)
    ? value[0]
    : value;

  return String(normalized || '').trim();
}

function toSafeHoldMinutes(
  value: number | null,
): string {
  return String(value ?? 30);
}

function toSafeDeliveryMode(
  value: CommercialOwnedProfile['delivery_fee_mode'],
): DeliveryFeeMode {
  if (
    value === 'free'
    || value === 'fixed'
    || value === 'to_be_confirmed'
  ) {
    return value;
  }

  return 'not_offered';
}

function operationPageIntro(
  offerType: CommercialOwnedProfile['offer_type'],
): string {
  if (offerType === 'services') {
    return 'Configura la disponibilidad de tu negocio, el tiempo de apartado para reservas y las opciones de domicilio.';
  }

  if (offerType === 'products') {
    return 'Configura la disponibilidad de tu negocio, el tiempo de apartado de inventario y las opciones de domicilio.';
  }

  return 'Configura la disponibilidad de tu negocio, los tiempos de apartado para reservas e inventario, y las opciones de domicilio.';
}

function operationHoldIntro(
  offerType: CommercialOwnedProfile['offer_type'],
): string {
  if (offerType === 'services') {
    return 'Controla cuánto tiempo se aparta un cupo o cita antes de confirmarse o liberarse.';
  }

  if (offerType === 'products') {
    return 'Controla cuánto tiempo se aparta un producto antes de confirmarse o liberarse.';
  }

  return 'Controla cuánto tiempo se aparta un cupo o producto antes de confirmarse o liberarse.';
}

export default function BuddyServicesOperationScreen() {
  const router = useModuleNav();
  const params = useScreenParams() as {
    businessId?: string | string[];
  };

  const businessId = normalizeBusinessId(params.businessId);

  const [profile, setProfile] = useState<
    CommercialOwnedProfile | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const [isAvailable, setIsAvailable] = useState(true);
  const [timezone, setTimezone] = useState('America/Bogota');
  const [bookingHoldMinutes, setBookingHoldMinutes] = useState('30');
  const [inventoryHoldMinutes, setInventoryHoldMinutes] = useState('30');
  const [deliveryFeeMode, setDeliveryFeeMode] = useState<
    DeliveryFeeMode
  >('not_offered');
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState('');
  const [deliveryCurrencyCode, setDeliveryCurrencyCode] = useState(
    'COP',
  );

  const applyProfile = useCallback((
    nextProfile: CommercialOwnedProfile,
  ) => {
    setProfile(nextProfile);
    setIsAvailable(nextProfile.is_available);
    setTimezone(nextProfile.timezone || 'America/Bogota');
    setBookingHoldMinutes(
      toSafeHoldMinutes(nextProfile.booking_hold_minutes),
    );
    setInventoryHoldMinutes(
      toSafeHoldMinutes(nextProfile.inventory_hold_minutes),
    );
    setDeliveryFeeMode(
      toSafeDeliveryMode(nextProfile.delivery_fee_mode),
    );
    setDeliveryFeeAmount(
      nextProfile.delivery_fee_amount === null
        ? ''
        : String(nextProfile.delivery_fee_amount),
    );
    setDeliveryCurrencyCode(
      nextProfile.delivery_currency_code || 'COP',
    );
  }, []);

  const loadProfile = useCallback(async () => {
    if (!businessId) {
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

      applyProfile(response.profile);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    applyProfile,
    businessId,
  ]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const save = useCallback(async () => {
    if (!profile) {
      return;
    }

    const normalizedTimezone = timezone.trim();
    const normalizedCurrencyCode = (
      deliveryCurrencyCode.trim().toUpperCase()
    );
    const sellsServices = profile.offer_type !== 'products';
    const sellsProducts = profile.offer_type !== 'services';
    const parsedBookingHoldMinutes = Number(
      bookingHoldMinutes.trim(),
    );
    const parsedInventoryHoldMinutes = Number(
      inventoryHoldMinutes.trim(),
    );
    const parsedDeliveryFeeAmount = deliveryFeeAmount.trim()
      ? Number(deliveryFeeAmount.trim())
      : null;

    if (!normalizedTimezone) {
      setErrorMessage('Escribe una zona horaria.');
      return;
    }

    if (
      sellsServices
      && (
        !Number.isInteger(parsedBookingHoldMinutes)
        || parsedBookingHoldMinutes < 5
        || parsedBookingHoldMinutes > 240
      )
    ) {
      setErrorMessage(
        'El tiempo de apartado de reservas debe estar entre 5 y 240 minutos.',
      );
      return;
    }

    if (
      sellsProducts
      && (
        !Number.isInteger(parsedInventoryHoldMinutes)
        || parsedInventoryHoldMinutes < 5
        || parsedInventoryHoldMinutes > 240
      )
    ) {
      setErrorMessage(
        'El tiempo de apartado de inventario debe estar entre 5 y 240 minutos.',
      );
      return;
    }

    if (
      normalizedCurrencyCode.length !== 3
      || !/^[A-Z]{3}$/.test(normalizedCurrencyCode)
    ) {
      setErrorMessage(
        'La moneda debe tener tres letras, por ejemplo COP.',
      );
      return;
    }

    if (
      deliveryFeeMode === 'fixed'
      && (
        parsedDeliveryFeeAmount === null
        || !Number.isInteger(parsedDeliveryFeeAmount)
        || parsedDeliveryFeeAmount < 0
      )
    ) {
      setErrorMessage(
        'Ingresa un costo fijo de domicilio válido.',
      );
      return;
    }

    if (
      deliveryFeeMode !== 'fixed'
      && parsedDeliveryFeeAmount !== null
    ) {
      setErrorMessage(
        'Solo el domicilio con costo fijo puede incluir un monto.',
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await updateOwnedCommercialProfile(
        profile.id,
        {
          is_available: isAvailable,
          timezone: normalizedTimezone,
          ...(sellsServices
            ? { booking_hold_minutes: parsedBookingHoldMinutes }
            : {}),
          ...(sellsProducts
            ? { inventory_hold_minutes: parsedInventoryHoldMinutes }
            : {}),
          delivery_fee_mode: deliveryFeeMode,
          delivery_fee_amount: (
            deliveryFeeMode === 'fixed'
              ? parsedDeliveryFeeAmount
              : null
          ),
          delivery_currency_code: normalizedCurrencyCode,
        },
      );

      applyProfile(response.profile);
      router.back();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    applyProfile,
    bookingHoldMinutes,
    deliveryCurrencyCode,
    deliveryFeeAmount,
    deliveryFeeMode,
    inventoryHoldMinutes,
    isAvailable,
    profile,
    router,
    timezone,
  ]);

  return (
    <ScreenSafeArea
      style={{
        backgroundColor: '#FFFCF9',
        flex: 1,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 18,
          paddingTop: 10,
        }}
      >
        <TouchableOpacity
          accessibilityLabel="Volver a gestión del negocio"
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isSaving ? 0.55 : 1,
            width: 42,
          }}
        >
          <ArrowLeft
            color="#3D245E"
            size={21}
          />
        </TouchableOpacity>

        <Text
          style={{
            color: '#261743',
            fontSize: 18,
            fontWeight: '800',
          }}
        >
          Operación
        </Text>

        <View
          style={{
            width: 42,
          }}
        />
      </View>

      {isLoading ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
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
              marginTop: 14,
            }}
          >
            Cargando configuración…
          </Text>
        </View>
      ) : errorMessage && !profile ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 19,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            No fue posible abrir la configuración
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 9,
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Reintentar cargar operación"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadProfile();
            }}
            style={{
              backgroundColor: '#7427D5',
              borderRadius: 13,
              marginTop: 22,
              paddingHorizontal: 18,
              paddingVertical: 13,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 38,
            paddingHorizontal: 18,
            paddingTop: 22,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 22,
              fontWeight: '900',
            }}
          >
            {profile.display_name}
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 6,
            }}
          >
            {operationPageIntro(profile.offer_type)}
          </Text>

          {errorMessage ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={{
                backgroundColor: '#FFF0F0',
                borderColor: '#F7B2B2',
                borderRadius: 14,
                borderWidth: 1,
                marginTop: 18,
                padding: 13,
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

          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderColor: '#E7DDF2',
              borderRadius: 16,
              borderWidth: 1,
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 22,
              padding: 15,
            }}
          >
            <View
              style={{
                flex: 1,
                paddingRight: 16,
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 15,
                  fontWeight: '800',
                }}
              >
                Negocio disponible
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 12,
                  lineHeight: 18,
                  marginTop: 3,
                }}
              >
                {isAvailable
                  ? 'Tu negocio está visible y listo para recibir pedidos y solicitudes de clientes.'
                  : 'Tu negocio no aceptará nuevas solicitudes ni compras mientras esté desactivado.'}
              </Text>
            </View>

            <Switch
              accessibilityLabel="Negocio disponible"
              disabled={isSaving}
              onValueChange={setIsAvailable}
              value={isAvailable}
            />
          </View>

          <View style={{ marginTop: 26 }}>
            <Text
              style={{
                color: '#261743',
                fontSize: 16,
                fontWeight: '800',
              }}
            >
              Zona horaria y tiempos de apartado
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 13,
                lineHeight: 19,
                marginTop: 4,
              }}
            >
              {operationHoldIntro(profile.offer_type)}
            </Text>
          </View>

          {/* Campo: Zona horaria */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E7DDF2',
              borderRadius: 16,
              borderWidth: 1,
              marginTop: 14,
              padding: 15,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Zona horaria
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
                marginBottom: 10,
              }}
            >
              Zona horaria local del negocio para sincronizar citas, horarios de atención y entregas.
            </Text>

            <TextInput
              accessibilityLabel="Zona horaria"
              editable={!isSaving}
              onChangeText={setTimezone}
              placeholder="America/Bogota"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FAFAFD',
                borderColor: '#DCCBEE',
                borderRadius: 12,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={timezone}
            />
          </View>

          {profile.offer_type !== 'products' ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E7DDF2',
              borderRadius: 16,
              borderWidth: 1,
              marginTop: 12,
              padding: 15,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Tiempo de apartado para reservas (minutos)
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
                marginBottom: 10,
              }}
            >
              Minutos que se aparta el cupo o cita mientras el cliente completa y confirma su solicitud (entre 5 y 240 minutos). Si expira sin confirmarse, el cupo vuelve a quedar libre.
            </Text>

            <TextInput
              accessibilityLabel="Minutos de apartado de reserva"
              editable={!isSaving}
              keyboardType="number-pad"
              onChangeText={setBookingHoldMinutes}
              placeholder="30"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FAFAFD',
                borderColor: '#DCCBEE',
                borderRadius: 12,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={bookingHoldMinutes}
            />
          </View>
          ) : null}

          {profile.offer_type !== 'services' ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E7DDF2',
              borderRadius: 16,
              borderWidth: 1,
              marginTop: 12,
              padding: 15,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Tiempo de apartado de inventario (minutos)
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
                marginBottom: 10,
              }}
            >
              Minutos que se retiene el stock de tus productos durante el proceso de compra antes de liberarlo si no se finaliza la compra (entre 5 y 240 minutos).
            </Text>

            <TextInput
              accessibilityLabel="Minutos de apartado de inventario"
              editable={!isSaving}
              keyboardType="number-pad"
              onChangeText={setInventoryHoldMinutes}
              placeholder="30"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FAFAFD',
                borderColor: '#DCCBEE',
                borderRadius: 12,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={inventoryHoldMinutes}
            />
          </View>
          ) : null}

          <View style={{ marginTop: 26 }}>
            <Text
              style={{
                color: '#261743',
                fontSize: 16,
                fontWeight: '800',
              }}
            >
              Opciones de domicilio y entrega
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 13,
                lineHeight: 19,
                marginTop: 4,
              }}
            >
              Define cómo entregas tus productos o si prestas servicios a domicilio.
            </Text>
          </View>

          <View
            style={{
              gap: 10,
              marginTop: 10,
            }}
          >
            {DELIVERY_FEE_OPTIONS.map((option) => {
              const isSelected = deliveryFeeMode === option.value;

              return (
                <TouchableOpacity
                  accessibilityLabel={`Domicilio: ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: isSelected,
                  }}
                  activeOpacity={0.82}
                  disabled={isSaving}
                  key={option.value}
                  onPress={() => {
                    setDeliveryFeeMode(option.value);
                    if (option.value !== 'fixed') {
                      setDeliveryFeeAmount('');
                    }
                  }}
                  style={{
                    backgroundColor: isSelected
                      ? '#F6EAFE'
                      : '#FFFFFF',
                    borderColor: isSelected
                      ? '#7427D5'
                      : '#E7DDF2',
                    borderRadius: 14,
                    borderWidth: 1,
                    opacity: isSaving ? 0.55 : 1,
                    padding: 13,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? '#54209E'
                        : '#261743',
                      fontSize: 14,
                      fontWeight: '800',
                    }}
                  >
                    {option.label}
                  </Text>

                  <Text
                    style={{
                      color: '#786593',
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 3,
                    }}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {deliveryFeeMode === 'fixed' ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E7DDF2',
                borderRadius: 16,
                borderWidth: 1,
                marginTop: 12,
                padding: 15,
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '800',
                }}
              >
                Costo fijo de entrega
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 12,
                  lineHeight: 18,
                  marginTop: 4,
                  marginBottom: 10,
                }}
              >
                Monto que se sumará al total de la compra por concepto de envío.
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <TextInput
                  accessibilityLabel="Costo fijo de domicilio"
                  editable={!isSaving}
                  keyboardType="number-pad"
                  onChangeText={setDeliveryFeeAmount}
                  placeholder="Ejemplo: 8000"
                  placeholderTextColor="#A692B7"
                  style={{
                    backgroundColor: '#FAFAFD',
                    borderColor: '#DCCBEE',
                    borderRadius: 12,
                    borderWidth: 1,
                    color: '#261743',
                    flex: 0.7,
                    fontSize: 14,
                    minHeight: 48,
                    paddingHorizontal: 13,
                  }}
                  value={deliveryFeeAmount}
                />

                <TextInput
                  accessibilityLabel="Moneda del domicilio"
                  autoCapitalize="characters"
                  editable={!isSaving}
                  maxLength={3}
                  onChangeText={setDeliveryCurrencyCode}
                  placeholder="COP"
                  placeholderTextColor="#A692B7"
                  style={{
                    backgroundColor: '#FAFAFD',
                    borderColor: '#DCCBEE',
                    borderRadius: 12,
                    borderWidth: 1,
                    color: '#261743',
                    flex: 0.3,
                    fontSize: 14,
                    minHeight: 48,
                    paddingHorizontal: 13,
                  }}
                  value={deliveryCurrencyCode}
                />
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="Guardar configuración operativa"
            accessibilityRole="button"
            accessibilityState={{
              busy: isSaving,
              disabled: isSaving,
            }}
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
              marginTop: 28,
              minHeight: 52,
              opacity: isSaving ? 0.65 : 1,
              paddingHorizontal: 18,
            }}
          >
            <Save
              color="#FFFFFF"
              size={19}
            />

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
                : 'Guardar configuración'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </ScreenSafeArea>
  );
}
