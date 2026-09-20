import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArchiveRestore,
  ArrowLeft,
  Box,
  BriefcaseBusiness,
  RotateCcw,
  X,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useModuleNav,
  useScreenParams,
} from '../../../../../../src/components/embedded/EmbeddedNavContext';

import type {
  CommercialOwnedOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../../src/features/buddyservices/commercialErrors';
import {
  loadOwnedCommercialOffers,
  restoreOwnedOffer,
} from '../../../../../../src/services/commercialService';

type RestoreConfirmation = CommercialOwnedOffer | null;

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function formatArchivedAt(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      dateStyle: 'medium',
    },
  ).format(parsedDate);
}

function formatPrice(
  offer: CommercialOwnedOffer,
): string {
  if (offer.pricing_strategy === 'free') {
    return 'Gratis';
  }

  if (offer.pricing_strategy === 'to_be_confirmed') {
    return 'Requiere cotización';
  }

  if (offer.base_price_amount === null) {
    return 'Sin valor definido';
  }

  const amount = new Intl.NumberFormat(
    'es-CO',
    {
      currency: 'COP',
      maximumFractionDigits: 0,
      style: 'currency',
    },
  ).format(offer.base_price_amount);

  return offer.pricing_strategy === 'starting_at'
    ? `Desde ${amount}`
    : amount;
}

export default function BuddyServicesArchivedOffersScreen() {
  const router = useModuleNav();
  const params = useScreenParams() as {
    businessId?: string | string[];
  };

  const businessId = normalizeBusinessId(params.businessId);

  const [offers, setOffers] = useState<
    CommercialOwnedOffer[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [
    restoreConfirmation,
    setRestoreConfirmation,
  ] = useState<RestoreConfirmation>(null);

  const loadArchivedOffers = useCallback(async () => {
    if (!businessId) {
      setErrorMessage(
        'No fue posible identificar el negocio solicitado.',
      );
      setOffers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loadOwnedCommercialOffers(
        businessId,
        {
          include_archived: true,
        },
      );

      setOffers(
        response.offers.filter(
          (offer) => offer.status === 'archived',
        ),
      );
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadArchivedOffers();
  }, [loadArchivedOffers]);

  const restoreOffer = useCallback(async () => {
    if (!restoreConfirmation || !businessId) {
      return;
    }

    setIsRestoring(true);
    setErrorMessage(null);

    try {
      await restoreOwnedOffer(
        businessId,
        restoreConfirmation.id,
      );

      setRestoreConfirmation(null);
      await loadArchivedOffers();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setRestoreConfirmation(null);
    } finally {
      setIsRestoring(false);
    }
  }, [
    businessId,
    loadArchivedOffers,
    restoreConfirmation,
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
          accessibilityLabel="Volver a productos y servicios"
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={isRestoring}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isRestoring ? 0.55 : 1,
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
          Ofertas archivadas
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
            Cargando ofertas archivadas…
          </Text>
        </View>
      ) : errorMessage ? (
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
            No fue posible cargar los archivados
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
            accessibilityLabel="Reintentar cargar ofertas archivadas"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadArchivedOffers();
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
            paddingBottom: 38,
            paddingHorizontal: 18,
            paddingTop: 22,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 22,
              fontWeight: '900',
            }}
          >
            Productos y servicios archivados
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 6,
            }}
          >
            Las ofertas archivadas no se muestran a clientes.
            Puedes restaurarlas cuando las necesites.
          </Text>

          {offers.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 28,
                paddingTop: 70,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 30,
                  height: 60,
                  justifyContent: 'center',
                  width: 60,
                }}
              >
                <ArchiveRestore
                  color="#7427D5"
                  size={28}
                />
              </View>

              <Text
                style={{
                  color: '#261743',
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 17,
                  textAlign: 'center',
                }}
              >
                No tienes ofertas archivadas
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 14,
                  lineHeight: 21,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Los productos y servicios que archives aparecerán aquí.
              </Text>
            </View>
          ) : (
            <View
              style={{
                marginTop: 20,
              }}
            >
              {offers.map((offer) => {
                const archivedAt = formatArchivedAt(
                  offer.archived_at,
                );

                return (
                  <View
                    key={offer.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E8DDED',
                      borderRadius: 18,
                      borderWidth: 1,
                      marginBottom: 14,
                      padding: 16,
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'flex-start',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          paddingRight: 12,
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{
                            color: '#261743',
                            fontSize: 17,
                            fontWeight: '900',
                          }}
                        >
                          {offer.title}
                        </Text>

                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 13,
                            marginTop: 5,
                          }}
                        >
                          {offer.offer_kind === 'product'
                            ? 'Producto'
                            : 'Servicio'}
                        </Text>

                        {offer.description ? (
                          <Text
                            numberOfLines={3}
                            style={{
                              color: '#786593',
                              fontSize: 13,
                              lineHeight: 19,
                              marginTop: 7,
                            }}
                          >
                            {offer.description}
                          </Text>
                        ) : null}
                      </View>

                      <View
                        style={{
                          alignItems: 'center',
                          backgroundColor: '#F4EDF9',
                          borderRadius: 14,
                          height: 42,
                          justifyContent: 'center',
                          width: 42,
                        }}
                      >
                        {offer.offer_kind === 'product' ? (
                          <Box
                            color="#7427D5"
                            size={20}
                          />
                        ) : (
                          <BriefcaseBusiness
                            color="#7427D5"
                            size={20}
                          />
                        )}
                      </View>
                    </View>

                    <Text
                      style={{
                        color: '#4E3B68',
                        fontSize: 14,
                        fontWeight: '800',
                        marginTop: 14,
                      }}
                    >
                      {formatPrice(offer)}
                    </Text>

                    <Text
                      style={{
                        color: '#6D6875',
                        fontSize: 12,
                        fontWeight: '800',
                        marginTop: 9,
                      }}
                    >
                      {archivedAt
                        ? `Archivado el ${archivedAt}`
                        : 'Archivado'}
                    </Text>

                    <TouchableOpacity
                      accessibilityLabel={`Desarchivar ${offer.title}`}
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={isRestoring}
                      onPress={() => {
                        setRestoreConfirmation(offer);
                      }}
                      style={{
                        alignItems: 'center',
                        backgroundColor: '#F6EAFE',
                        borderRadius: 12,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginTop: 15,
                        minHeight: 44,
                        opacity: isRestoring ? 0.55 : 1,
                        paddingHorizontal: 14,
                      }}
                    >
                      <RotateCcw
                        color="#7427D5"
                        size={17}
                      />

                      <Text
                        style={{
                          color: '#7427D5',
                          fontSize: 13,
                          fontWeight: '800',
                          marginLeft: 7,
                        }}
                      >
                        Desarchivar
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isRestoring) {
            setRestoreConfirmation(null);
          }
        }}
        transparent
        visible={Boolean(restoreConfirmation)}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(38, 23, 67, 0.42)',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFCF9',
              borderRadius: 20,
              padding: 20,
              width: '100%',
            }}
          >
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 19,
                  fontWeight: '900',
                  paddingRight: 14,
                }}
              >
                Desarchivar oferta
              </Text>

              <TouchableOpacity
                accessibilityLabel="Cerrar confirmación"
                accessibilityRole="button"
                activeOpacity={0.75}
                disabled={isRestoring}
                onPress={() => {
                  setRestoreConfirmation(null);
                }}
              >
                <X
                  color="#786593"
                  size={21}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 10,
              }}
            >
              {restoreConfirmation
                ? `¿Deseas desarchivar “${restoreConfirmation.title}”? `
                  + 'Volverá a productos y servicios.'
                : ''}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 22,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Cancelar desarchivado"
                accessibilityRole="button"
                activeOpacity={0.8}
                disabled={isRestoring}
                onPress={() => {
                  setRestoreConfirmation(null);
                }}
                style={{
                  alignItems: 'center',
                  borderColor: '#DCCBEE',
                  borderRadius: 12,
                  borderWidth: 1,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isRestoring ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#5E4B73',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Confirmar desarchivado de oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isRestoring}
                onPress={() => {
                  void restoreOffer();
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#7427D5',
                  borderRadius: 12,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isRestoring ? 0.65 : 1,
                  paddingHorizontal: 14,
                }}
              >
                {isRestoring ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />
                ) : (
                  <RotateCcw
                    color="#FFFFFF"
                    size={17}
                  />
                )}

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  {isRestoring
                    ? 'Desarchivando…'
                    : 'Desarchivar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
