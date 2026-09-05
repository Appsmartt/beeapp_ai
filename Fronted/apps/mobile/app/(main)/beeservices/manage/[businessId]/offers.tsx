import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Box,
  BriefcaseBusiness,
  Check,
  PackagePlus,
  Plus,
  Save,
  X,
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
  CommercialCatalog,
  CommercialModality,
  CommercialOfferKind,
  CommercialOwnedOffer,
  CommercialPaymentPolicy,
  CommercialPricingStrategy,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesManageOfferRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';
import {
  createOwnedOffer,
  loadOwnedCommercialCatalogs,
  loadOwnedCommercialOffers,
} from '../../../../../src/services/commercialService';

type OfferEditorState = {
  catalogId: string;
  offerKind: CommercialOfferKind;
  title: string;
  description: string;
  pricingStrategy: CommercialPricingStrategy;
  basePriceAmount: string;
  trackInventory: boolean;
  stockQuantity: string;
  requiresBooking: boolean;
  durationMinutes: string;
  paymentPolicy: CommercialPaymentPolicy;
  modalities: CommercialModality[];
} | null;

const OFFER_KIND_OPTIONS: Array<{
  value: CommercialOfferKind;
  label: string;
}> = [
  {
    value: 'product',
    label: 'Producto',
  },
  {
    value: 'service',
    label: 'Servicio',
  },
];

const PRICING_OPTIONS: Array<{
  value: CommercialPricingStrategy;
  label: string;
}> = [
  {
    value: 'fixed',
    label: 'Precio fijo',
  },
  {
    value: 'starting_at',
    label: 'Desde',
  },
  {
    value: 'free',
    label: 'Gratis',
  },
  {
    value: 'to_be_confirmed',
    label: 'Cotización',
  },
];

const PAYMENT_POLICY_OPTIONS: Array<{
  value: CommercialPaymentPolicy;
  label: string;
}> = [
  {
    value: 'not_required',
    label: 'No requiere pago',
  },
  {
    value: 'required_before_confirmation',
    label: 'Antes de confirmar',
  },
  {
    value: 'required_after_service',
    label: 'Después del servicio',
  },
  {
    value: 'to_be_agreed',
    label: 'Por acordar',
  },
];

const MODALITIES: Array<{
  value: CommercialModality;
  label: string;
}> = [
  {
    value: 'at_establishment',
    label: 'En establecimiento',
  },
  {
    value: 'in_person',
    label: 'Presencial',
  },
  {
    value: 'virtual',
    label: 'Virtual',
  },
  {
    value: 'home_visit',
    label: 'Visita a domicilio',
  },
  {
    value: 'delivery',
    label: 'Entrega a domicilio',
  },
  {
    value: 'pickup',
    label: 'Recoger',
  },
  {
    value: 'phone_call',
    label: 'Llamada',
  },
  {
    value: 'buddy_chat',
    label: 'Chat BeeApp',
  },
];

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function createOfferEditor(
  catalogs: CommercialCatalog[],
): OfferEditorState {
  const firstCatalog = catalogs[0];

  if (!firstCatalog) {
    return null;
  }

  return {
    catalogId: firstCatalog.id,
    offerKind: 'product',
    title: '',
    description: '',
    pricingStrategy: 'fixed',
    basePriceAmount: '',
    trackInventory: false,
    stockQuantity: '',
    requiresBooking: false,
    durationMinutes: '',
    paymentPolicy: 'not_required',
    modalities: [],
  };
}

function formatMoney(
  amount: number | null,
): string {
  if (amount === null) {
    return 'Sin valor definido';
  }

  return new Intl.NumberFormat('es-CO', {
    currency: 'COP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function offerStatusCopy(
  offer: CommercialOwnedOffer,
): {
  label: string;
  color: string;
} {
  if (offer.status === 'paused') {
    return {
      label: 'Pausado',
      color: '#9A5B00',
    };
  }

  if (offer.status === 'archived') {
    return {
      label: 'Archivado',
      color: '#6D6875',
    };
  }

  return {
    label: offer.is_available
      ? 'Disponible'
      : 'No disponible',
    color: offer.is_available
      ? '#177245'
      : '#9A5B00',
  };
}

export default function BuddyServicesManageOffersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const businessId = normalizeBusinessId(params.businessId);

  const [catalogs, setCatalogs] = useState<
    CommercialCatalog[]
  >([]);
  const [offers, setOffers] = useState<
    CommercialOwnedOffer[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [editor, setEditor] = useState<OfferEditorState>(null);
  const [editorError, setEditorError] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
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
      const [
        catalogsResponse,
        offersResponse,
      ] = await Promise.all([
        loadOwnedCommercialCatalogs(
          businessId,
          {
            include_archived: false,
          },
        ),
        loadOwnedCommercialOffers(
          businessId,
          {
            include_archived: false,
          },
        ),
      ]);

      setCatalogs(catalogsResponse.catalogs);
      setOffers(offersResponse.offers);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setCatalogs([]);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const catalogNamesById = useMemo(
    () => new Map(
      catalogs.map((catalog) => [
        catalog.id,
        catalog.name,
      ]),
    ),
    [catalogs],
  );

  const closeEditor = useCallback(() => {
    if (isSaving) {
      return;
    }

    setEditor(null);
    setEditorError(null);
  }, [isSaving]);

  const toggleModality = useCallback((
    modality: CommercialModality,
  ) => {
    setEditor((currentEditor) => {
      if (!currentEditor) {
        return currentEditor;
      }

      const hasModality = currentEditor.modalities.includes(
        modality,
      );

      return {
        ...currentEditor,
        modalities: hasModality
          ? currentEditor.modalities.filter(
            (value) => value !== modality,
          )
          : [
            ...currentEditor.modalities,
            modality,
          ],
      };
    });
  }, []);

  const saveOffer = useCallback(async () => {
    if (!editor || !businessId) {
      return;
    }

    const normalizedTitle = editor.title.trim();
    const normalizedDescription = (
      editor.description.trim() || null
    );
    const requiresAmount = (
      editor.pricingStrategy === 'fixed'
      || editor.pricingStrategy === 'starting_at'
    );
    const parsedAmount = editor.basePriceAmount.trim()
      ? Number(editor.basePriceAmount.trim())
      : null;
    const parsedStockQuantity = editor.stockQuantity.trim()
      ? Number(editor.stockQuantity.trim())
      : null;
    const parsedDurationMinutes = editor.durationMinutes.trim()
      ? Number(editor.durationMinutes.trim())
      : null;

    if (!normalizedTitle) {
      setEditorError('Escribe el título de la oferta.');
      return;
    }

    if (
      requiresAmount
      && (
        parsedAmount === null
        || !Number.isInteger(parsedAmount)
        || parsedAmount < 0
      )
    ) {
      setEditorError(
        'El precio fijo o desde requiere un monto entero válido.',
      );
      return;
    }

    if (!requiresAmount && parsedAmount !== null) {
      setEditorError(
        'Gratis y cotización no pueden incluir un precio.',
      );
      return;
    }

    if (
      editor.offerKind === 'product'
      && editor.trackInventory
      && (
        parsedStockQuantity === null
        || !Number.isInteger(parsedStockQuantity)
        || parsedStockQuantity < 0
      )
    ) {
      setEditorError(
        'El producto con inventario requiere una cantidad válida.',
      );
      return;
    }

    if (
      editor.offerKind === 'service'
      && editor.requiresBooking
      && (
        parsedDurationMinutes === null
        || !Number.isInteger(parsedDurationMinutes)
        || parsedDurationMinutes < 5
        || parsedDurationMinutes > 1440
      )
    ) {
      setEditorError(
        'El servicio reservable requiere duración entre 5 y 1440 minutos.',
      );
      return;
    }

    setIsSaving(true);
    setEditorError(null);

    try {
      await createOwnedOffer(
        businessId,
        {
          catalog_id: editor.catalogId,
          offer_kind: editor.offerKind,
          title: normalizedTitle,
          description: normalizedDescription,
          pricing_strategy: editor.pricingStrategy,
          base_price_amount: requiresAmount
            ? parsedAmount
            : null,
          currency_code: 'COP',
          is_available: true,
          sort_order: 0,
          status: 'paused',
          track_inventory: editor.offerKind === 'product'
            ? editor.trackInventory
            : false,
          stock_quantity: (
            editor.offerKind === 'product'
            && editor.trackInventory
              ? parsedStockQuantity
              : null
          ),
          duration_minutes: (
            editor.offerKind === 'service'
            && editor.requiresBooking
              ? parsedDurationMinutes
              : null
          ),
          requires_booking: (
            editor.offerKind === 'service'
              ? editor.requiresBooking
              : false
          ),
          payment_policy: (
            editor.offerKind === 'service'
              ? editor.paymentPolicy
              : null
          ),
          modalities: editor.modalities,
        },
      );

      closeEditor();
      await loadData();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setEditorError(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    closeEditor,
    editor,
    loadData,
  ]);

  const activeEditor = editor;

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
          Productos y servicios
        </Text>

        <TouchableOpacity
          accessibilityLabel="Crear producto o servicio"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={
            isLoading
            || isSaving
            || catalogs.length === 0
          }
          onPress={() => {
            setEditorError(null);
            setEditor(createOfferEditor(catalogs));
          }}
          style={{
            alignItems: 'center',
            backgroundColor: '#7427D5',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: (
              isLoading
              || isSaving
              || catalogs.length === 0
            )
              ? 0.55
              : 1,
            width: 42,
          }}
        >
          <Plus
            color="#FFFFFF"
            size={21}
          />
        </TouchableOpacity>
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
            Cargando ofertas…
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
            No fue posible cargar las ofertas
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
            accessibilityLabel="Reintentar cargar ofertas"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadData();
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
      ) : catalogs.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <PackagePlus
            color="#7427D5"
            size={32}
          />

          <Text
            style={{
              color: '#261743',
              fontSize: 19,
              fontWeight: '800',
              marginTop: 15,
              textAlign: 'center',
            }}
          >
            Crea un catálogo primero
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
            Los productos y servicios siempre pertenecen
            a un catálogo del negocio.
          </Text>
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
            Ofertas del negocio
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 6,
            }}
          >
            Los productos y servicios nuevos se crean
            pausados hasta que decidas publicarlos.
          </Text>

          {offers.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 28,
                paddingTop: 65,
              }}
            >
              <PackagePlus
                color="#7427D5"
                size={32}
              />

              <Text
                style={{
                  color: '#261743',
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 15,
                  textAlign: 'center',
                }}
              >
                Aún no tienes ofertas
              </Text>

              <TouchableOpacity
                accessibilityLabel="Crear primera oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => {
                  setEditorError(null);
                  setEditor(createOfferEditor(catalogs));
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#7427D5',
                  borderRadius: 14,
                  flexDirection: 'row',
                  marginTop: 22,
                  minHeight: 46,
                  paddingHorizontal: 16,
                }}
              >
                <Plus
                  color="#FFFFFF"
                  size={18}
                />

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '800',
                    marginLeft: 8,
                  }}
                >
                  Crear oferta
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                marginTop: 20,
              }}
            >
              {offers.map((offer) => {
                const statusCopy = offerStatusCopy(offer);

                return (
                  <TouchableOpacity
                    accessibilityHint="Abre la configuración de esta oferta"
                    accessibilityLabel={`Gestionar ${offer.title}`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={offer.id}
                    onPress={() => {
                      router.push(
                        buddyServicesManageOfferRoute(
                          businessId,
                          offer.id,
                        ),
                      );
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E7DDF2',
                      borderRadius: 17,
                      borderWidth: 1,
                      marginBottom: 12,
                      padding: 15,
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'flex-start',
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

                      <View
                        style={{
                          flex: 1,
                          marginLeft: 12,
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{
                            color: '#261743',
                            fontSize: 16,
                            fontWeight: '800',
                          }}
                        >
                          {offer.title}
                        </Text>

                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {catalogNamesById.get(
                            offer.catalog_id,
                          ) || 'Catálogo'}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: '#4E3B68',
                        fontSize: 14,
                        fontWeight: '800',
                        marginTop: 13,
                      }}
                    >
                      {offer.pricing_strategy === 'free'
                        ? 'Gratis'
                        : offer.pricing_strategy === 'to_be_confirmed'
                          ? 'Requiere cotización'
                          : offer.pricing_strategy === 'starting_at'
                            ? `Desde ${formatMoney(
                              offer.base_price_amount,
                            )}`
                            : formatMoney(
                              offer.base_price_amount,
                            )}
                    </Text>

                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: statusCopy.color,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {statusCopy.label}
                      </Text>

                      <Text
                        style={{
                          color: '#786593',
                          fontSize: 12,
                        }}
                      >
                        {offer.offer_kind === 'product'
                          ? offer.track_inventory
                            ? `Stock ${offer.stock_quantity ?? 0}`
                            : 'Sin inventario'
                          : offer.requires_booking
                            ? `${offer.duration_minutes} min`
                            : 'Sin reserva'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        onRequestClose={closeEditor}
        transparent
        visible={Boolean(editor)}
      >
        <View
          style={{
            backgroundColor: 'rgba(38, 23, 67, 0.38)',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <ScrollView
            contentContainerStyle={{
              backgroundColor: '#FFFCF9',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 30,
              paddingHorizontal: 18,
              paddingTop: 18,
            }}
            keyboardShouldPersistTaps="handled"
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
                }}
              >
                Crear oferta
              </Text>

              <TouchableOpacity
                accessibilityLabel="Cerrar formulario de oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={closeEditor}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 13,
                  height: 38,
                  justifyContent: 'center',
                  opacity: isSaving ? 0.55 : 1,
                  width: 38,
                }}
              >
                <X
                  color="#3D245E"
                  size={19}
                />
              </TouchableOpacity>
            </View>

            {editorError ? (
              <View
                style={{
                  backgroundColor: '#FFF0F0',
                  borderColor: '#F7B2B2',
                  borderRadius: 13,
                  borderWidth: 1,
                  marginTop: 16,
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
                  {editorError}
                </Text>
              </View>
            ) : null}

            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
                marginTop: 18,
              }}
            >
              Tipo
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginTop: 9,
              }}
            >
              {OFFER_KIND_OPTIONS.map((option) => {
                const isSelected = (
                  editor?.offerKind === option.value
                );

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Tipo ${option.label}`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={option.value}
                    onPress={() => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            offerKind: option.value,
                            durationMinutes: '',
                            requiresBooking: false,
                            stockQuantity: '',
                            trackInventory: false,
                          }
                          : currentEditor
                      ));
                    }}
                    style={{
                      backgroundColor: isSelected
                        ? '#7427D5'
                        : '#FFFFFF',
                      borderColor: isSelected
                        ? '#7427D5'
                        : '#DCCBEE',
                      borderRadius: 99,
                      borderWidth: 1,
                      opacity: isSaving ? 0.55 : 1,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? '#FFFFFF'
                          : '#4E3B68',
                        fontSize: 13,
                        fontWeight: '800',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
                marginTop: 19,
              }}
            >
              Catálogo
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 9,
              }}
            >
              {catalogs.map((catalog) => {
                const isSelected = editor?.catalogId === catalog.id;

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Catálogo ${catalog.name}`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={catalog.id}
                    onPress={() => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            catalogId: catalog.id,
                          }
                          : currentEditor
                      ));
                    }}
                    style={{
                      backgroundColor: isSelected
                        ? '#EBDCFD'
                        : '#FFFFFF',
                      borderColor: isSelected
                        ? '#7427D5'
                        : '#DCCBEE',
                      borderRadius: 99,
                      borderWidth: 1,
                      opacity: isSaving ? 0.55 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? '#54209E'
                          : '#4E3B68',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {catalog.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              accessibilityLabel="Título de la oferta"
              editable={!isSaving}
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      title: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="Nombre del producto o servicio"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                marginTop: 18,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={editor?.title || ''}
            />

            <TextInput
              accessibilityLabel="Descripción de la oferta"
              editable={!isSaving}
              multiline
              numberOfLines={3}
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      description: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="Descripción opcional"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                lineHeight: 20,
                marginTop: 10,
                minHeight: 82,
                paddingHorizontal: 13,
                paddingTop: 12,
                textAlignVertical: 'top',
              }}
              value={editor?.description || ''}
            />

            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
                marginTop: 19,
              }}
            >
              Precio
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 9,
              }}
            >
              {PRICING_OPTIONS.map((option) => {
                const isSelected = (
                  editor?.pricingStrategy === option.value
                );

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Precio ${option.label}`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={option.value}
                    onPress={() => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            pricingStrategy: option.value,
                            basePriceAmount: (
                              option.value === 'free'
                              || option.value === 'to_be_confirmed'
                                ? ''
                                : currentEditor.basePriceAmount
                            ),
                          }
                          : currentEditor
                      ));
                    }}
                    style={{
                      backgroundColor: isSelected
                        ? '#EBDCFD'
                        : '#FFFFFF',
                      borderColor: isSelected
                        ? '#7427D5'
                        : '#DCCBEE',
                      borderRadius: 99,
                      borderWidth: 1,
                      opacity: isSaving ? 0.55 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? '#54209E'
                          : '#4E3B68',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {editor?.pricingStrategy === 'fixed'
            || editor?.pricingStrategy === 'starting_at' ? (
              <TextInput
                accessibilityLabel="Precio en pesos colombianos"
                editable={!isSaving}
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setEditor((currentEditor) => (
                    currentEditor
                      ? {
                        ...currentEditor,
                        basePriceAmount: value,
                      }
                      : currentEditor
                  ));
                }}
                placeholder="Ejemplo: 50000"
                placeholderTextColor="#A692B7"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCCBEE',
                  borderRadius: 13,
                  borderWidth: 1,
                  color: '#261743',
                  fontSize: 14,
                  marginTop: 10,
                  minHeight: 48,
                  paddingHorizontal: 13,
                }}
                value={editor?.basePriceAmount || ''}
              />
            ) : null}

            {editor?.offerKind === 'product' ? (
              <>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 20,
                  }}
                >
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 14,
                      fontWeight: '800',
                    }}
                  >
                    Controlar inventario
                  </Text>

                  <Switch
                    accessibilityLabel="Controlar inventario"
                    disabled={isSaving}
                    onValueChange={(value) => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            stockQuantity: value
                              ? currentEditor.stockQuantity
                              : '',
                            trackInventory: value,
                          }
                          : currentEditor
                      ));
                    }}
                    value={activeEditor?.trackInventory || false}
                  />
                </View>

                {editor.trackInventory ? (
                  <TextInput
                    accessibilityLabel="Cantidad de inventario"
                    editable={!isSaving}
                    keyboardType="number-pad"
                    onChangeText={(value) => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            stockQuantity: value,
                          }
                          : currentEditor
                      ));
                    }}
                    placeholder="Cantidad disponible"
                    placeholderTextColor="#A692B7"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DCCBEE',
                      borderRadius: 13,
                      borderWidth: 1,
                      color: '#261743',
                      fontSize: 14,
                      marginTop: 10,
                      minHeight: 48,
                      paddingHorizontal: 13,
                    }}
                    value={activeEditor?.stockQuantity || ''}
                  />
                ) : null}
              </>
            ) : (
              <>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 20,
                  }}
                >
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 14,
                      fontWeight: '800',
                    }}
                  >
                    Requiere reserva
                  </Text>

                  <Switch
                    accessibilityLabel="Requiere reserva"
                    disabled={isSaving}
                    onValueChange={(value) => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            durationMinutes: value
                              ? currentEditor.durationMinutes
                              : '',
                            requiresBooking: value,
                          }
                          : currentEditor
                      ));
                    }}
                    value={activeEditor?.requiresBooking || false}
                  />
                </View>

                {activeEditor?.requiresBooking ? (
                  <TextInput
                    accessibilityLabel="Duración en minutos"
                    editable={!isSaving}
                    keyboardType="number-pad"
                    onChangeText={(value) => {
                      setEditor((currentEditor) => (
                        currentEditor
                          ? {
                            ...currentEditor,
                            durationMinutes: value,
                          }
                          : currentEditor
                      ));
                    }}
                    placeholder="Duración en minutos"
                    placeholderTextColor="#A692B7"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DCCBEE',
                      borderRadius: 13,
                      borderWidth: 1,
                      color: '#261743',
                      fontSize: 14,
                      marginTop: 10,
                      minHeight: 48,
                      paddingHorizontal: 13,
                    }}
                    value={activeEditor?.durationMinutes || ''}
                  />
                ) : null}

                <Text
                  style={{
                    color: '#261743',
                    fontSize: 14,
                    fontWeight: '800',
                    marginTop: 20,
                  }}
                >
                  Política de pago
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 9,
                  }}
                >
                  {PAYMENT_POLICY_OPTIONS.map((option) => {
                    const isSelected = (
                      editor?.paymentPolicy === option.value
                    );

                    return (
                      <TouchableOpacity
                        accessibilityLabel={`Pago ${option.label}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        key={option.value}
                        onPress={() => {
                          setEditor((currentEditor) => (
                            currentEditor
                              ? {
                                ...currentEditor,
                                paymentPolicy: option.value,
                              }
                              : currentEditor
                          ));
                        }}
                        style={{
                          backgroundColor: isSelected
                            ? '#EBDCFD'
                            : '#FFFFFF',
                          borderColor: isSelected
                            ? '#7427D5'
                            : '#DCCBEE',
                          borderRadius: 99,
                          borderWidth: 1,
                          opacity: isSaving ? 0.55 : 1,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected
                              ? '#54209E'
                              : '#4E3B68',
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
                marginTop: 20,
              }}
            >
              Modalidades
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 9,
              }}
            >
              {MODALITIES.map((option) => {
                const isSelected = (
                  editor?.modalities.includes(option.value)
                  || false
                );

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Modalidad ${option.label}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: isSelected,
                    }}
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={option.value}
                    onPress={() => toggleModality(option.value)}
                    style={{
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? '#EBDCFD'
                        : '#FFFFFF',
                      borderColor: isSelected
                        ? '#7427D5'
                        : '#DCCBEE',
                      borderRadius: 99,
                      borderWidth: 1,
                      flexDirection: 'row',
                      opacity: isSaving ? 0.55 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    {isSelected ? (
                      <Check
                        color="#54209E"
                        size={14}
                      />
                    ) : null}

                    <Text
                      style={{
                        color: isSelected
                          ? '#54209E'
                          : '#4E3B68',
                        fontSize: 12,
                        fontWeight: '700',
                        marginLeft: isSelected ? 5 : 0,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              accessibilityLabel="Crear oferta"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={isSaving}
              onPress={() => {
                void saveOffer();
              }}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 15,
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 24,
                minHeight: 50,
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
                  ? 'Creando…'
                  : 'Crear oferta'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
