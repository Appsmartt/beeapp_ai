import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  FileCheck2,
  Layers3,
  MapPin,
  Package,
  Settings2,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialOwnedProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesManageCatalogsRoute,
  buddyServicesManageOffersRoute,
  buddyServicesManageOperationRoute,
  buddyServicesManagePaymentMethodsRoute,
  buddyServicesManageProfileRoute,
} from '../../../../src/features/buddyservices/commercialRoutes';
import {
  loadOwnedCommercialProfile,
} from '../../../../src/services/commercialService';

interface DashboardActionProps {
  title: string;
  description: string;
  Icon: typeof Building2;
}

function DashboardAction({
  title,
  description,
  Icon,
}: DashboardActionProps) {
  return (
    <View
      accessibilityLabel={title}
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
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#F6EAFE',
            borderRadius: 12,
            height: 42,
            justifyContent: 'center',
            width: 42,
          }}
        >
          <Icon
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
            {title}
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 12,
              lineHeight: 18,
              marginTop: 3,
            }}
          >
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
}

function publicationLabel(
  profile: CommercialOwnedProfile,
): string {
  if (profile.publication_status === 'published') {
    return 'Publicado';
  }

  if (profile.publication_status === 'paused') {
    return 'Pausado';
  }

  if (profile.publication_status === 'archived') {
    return 'Archivado';
  }

  return 'Suspendido';
}

export default function BuddyServicesManageBusinessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const businessId = Array.isArray(params.businessId)
    ? params.businessId[0]
    : params.businessId;

  const [profile, setProfile] = useState<
    CommercialOwnedProfile | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadProfile = useCallback(async () => {
    const normalizedBusinessId = String(businessId || '').trim();

    if (!normalizedBusinessId) {
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
        normalizedBusinessId,
      );

      setProfile(response.profile);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
          accessibilityLabel="Volver a mis negocios"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
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
            fontSize: 19,
            fontWeight: '800',
          }}
        >
          Gestión del negocio
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
              marginTop: 15,
            }}
          >
            Verificando acceso al negocio…
          </Text>
        </View>
      ) : errorMessage || !profile ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <Building2
            color="#7427D5"
            size={34}
          />

          <Text
            style={{
              color: '#261743',
              fontSize: 19,
              fontWeight: '800',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            No fue posible abrir este negocio
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
            {errorMessage || 'El negocio no está disponible.'}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Reintentar cargar negocio"
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
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 34,
            paddingHorizontal: 18,
            paddingTop: 21,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#261743',
              borderRadius: 20,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: '#DCC8FF',
                fontSize: 12,
                fontWeight: '800',
                textTransform: 'uppercase',
              }}
            >
              Gestionando
            </Text>

            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 22,
                fontWeight: '900',
                marginTop: 5,
              }}
            >
              {profile.display_name}
            </Text>

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                marginTop: 10,
              }}
            >
              <MapPin
                color="#DCC8FF"
                size={15}
              />

              <Text
                style={{
                  color: '#EDE4FF',
                  fontSize: 13,
                  marginLeft: 5,
                }}
              >
                {`${profile.city}, ${profile.country_code}`}
              </Text>
            </View>

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                marginTop: 12,
              }}
            >
              <BadgeCheck
                color="#C7F2D6"
                size={16}
              />

              <Text
                style={{
                  color: '#C7F2D6',
                  fontSize: 13,
                  fontWeight: '800',
                  marginLeft: 6,
                }}
              >
                {publicationLabel(profile)}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: '#261743',
              fontSize: 17,
              fontWeight: '900',
              marginBottom: 11,
              marginTop: 24,
            }}
          >
            Administración
          </Text>

          <TouchableOpacity
            accessibilityHint="Edita datos públicos y contacto del negocio"
            accessibilityLabel="Perfil del negocio"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              router.push(
                buddyServicesManageProfileRoute(profile.id),
              );
            }}
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
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 12,
                  height: 42,
                  justifyContent: 'center',
                  width: 42,
                }}
              >
                <Settings2
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
                  Perfil del negocio
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Datos públicos, contacto, horarios y modalidades.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="Administra los catálogos de este negocio"
            accessibilityLabel="Catálogos"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              router.push(
                buddyServicesManageCatalogsRoute(profile.id),
              );
            }}
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
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 12,
                  height: 42,
                  justifyContent: 'center',
                  width: 42,
                }}
              >
                <Layers3
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
                  Catálogos
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Organiza las ofertas publicadas por catálogo.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="Administra productos y servicios del negocio"
            accessibilityLabel="Productos y servicios"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              router.push(
                buddyServicesManageOffersRoute(profile.id),
              );
            }}
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
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 12,
                  height: 42,
                  justifyContent: 'center',
                  width: 42,
                }}
              >
                <Package
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
                  Productos y servicios
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Crea y administra productos y servicios.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="Administra métodos de pago privados de este negocio"
            accessibilityLabel="Métodos de pago"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              router.push(
                buddyServicesManagePaymentMethodsRoute(
                  profile.id,
                ),
              );
            }}
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
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 12,
                  height: 42,
                  justifyContent: 'center',
                  width: 42,
                }}
              >
                <CreditCard
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
                  Métodos de pago
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Configura instrucciones externas privadas por negocio.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <DashboardAction
            description="Adjunta documentos y consulta el estado de revisión."
            Icon={FileCheck2}
            title="Verificación"
          />

          <TouchableOpacity
            accessibilityHint="Configura disponibilidad, holds y costo de domicilio"
            accessibilityLabel="Operación y disponibilidad"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              router.push(
                buddyServicesManageOperationRoute(profile.id),
              );
            }}
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
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 12,
                  height: 42,
                  justifyContent: 'center',
                  width: 42,
                }}
              >
                <CalendarDays
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
                  Operación y disponibilidad
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Configura disponibilidad, precios y reglas de reserva.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}
