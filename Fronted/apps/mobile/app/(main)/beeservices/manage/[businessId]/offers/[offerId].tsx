import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Archive,
  ArrowLeft,
  Box,
  BriefcaseBusiness,
  CirclePause,
  Eye,
  EyeOff,
  ImagePlus,
  PackageSearch,
  PlayCircle,
  RotateCcw,
  Star,
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
import * as ImagePicker from 'expo-image-picker';

import type {
  CommercialOfferImage,
  CommercialOwnedOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../../src/features/buddyservices/commercialErrors';
import {
  archiveOwnedOffer,
  archiveOwnedOfferImage,
  createOwnedOfferImage,
  disableOwnedOffer,
  enableOwnedOffer,
  loadOwnedCommercialOffer,
  pauseOwnedOffer,
  publishOwnedOffer,
  restoreOwnedOffer,
  setOwnedOfferPrimaryImage,
} from '../../../../../../src/services/commercialService';
import {
  LocalCommercialOfferImage,
  sortCommercialOfferImages,
  uploadCommercialOfferImageFile,
} from '../../../../../../src/services/commercialOfferImageService';
import {
  getValidSessionCredentials,
} from '../../../../../../src/services/authSession';

type OfferAction =
  | 'publish'
  | 'pause'
  | 'archive'
  | 'restore'
  | 'enable'
  | 'disable';

type OfferActionConfirmation = {
  action: OfferAction;
  offer: CommercialOwnedOffer;
} | null;

type ImageAction =
  | 'archive'
  | 'primary';

type ImageActionConfirmation = {
  action: ImageAction;
  image: CommercialOfferImage;
} | null;

function getParam(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function priceCopy(
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

  const amount = new Intl.NumberFormat('es-CO', {
    currency: 'COP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(offer.base_price_amount);

  return offer.pricing_strategy === 'starting_at'
    ? `Desde ${amount}`
    : amount;
}

function actionCopy(
  action: OfferAction,
): {
  title: string;
  description: string;
  confirmLabel: string;
  color: string;
} {
  if (action === 'publish') {
    return {
      title: 'Publicar oferta',
      description: (
        'La oferta quedará visible solo si cumple '
        + 'las reglas de publicación del backend.'
      ),
      confirmLabel: 'Publicar',
      color: '#177245',
    };
  }

  if (action === 'pause') {
    return {
      title: 'Pausar oferta',
      description: (
        'La oferta dejará de estar disponible para '
        + 'clientes hasta que la publiques nuevamente.'
      ),
      confirmLabel: 'Pausar',
      color: '#9A5B00',
    };
  }

  if (action === 'archive') {
    return {
      title: 'Archivar oferta',
      description: (
        'La oferta dejará de mostrarse públicamente. '
        + 'Su historial se conservará y podrás restaurarla.'
      ),
      confirmLabel: 'Archivar',
      color: '#B42318',
    };
  }

  if (action === 'restore') {
    return {
      title: 'Restaurar oferta',
      description: (
        'La oferta volverá a estar disponible para '
        + 'configuración. Debes publicarla para mostrarla.'
      ),
      confirmLabel: 'Restaurar',
      color: '#177245',
    };
  }

  if (action === 'enable') {
    return {
      title: 'Habilitar disponibilidad',
      description: (
        'La oferta podrá aceptar nuevas solicitudes '
        + 'si su estado y reglas del backend lo permiten.'
      ),
      confirmLabel: 'Habilitar',
      color: '#177245',
    };
  }

  return {
    title: 'Deshabilitar disponibilidad',
    description: (
      'La oferta no debería aceptar nuevas solicitudes '
      + 'mientras permanezca deshabilitada.'
    ),
    confirmLabel: 'Deshabilitar',
    color: '#9A5B00',
  };
}

function imageActionCopy(
  action: ImageAction,
): {
  title: string;
  description: string;
  confirmLabel: string;
  color: string;
} {
  if (action === 'primary') {
    return {
      title: 'Usar como imagen principal',
      description: (
        'Esta imagen será la principal de la oferta. '
        + 'El backend garantiza una única imagen principal activa.'
      ),
      confirmLabel: 'Marcar principal',
      color: '#7427D5',
    };
  }

  return {
    title: 'Archivar imagen',
    description: (
      'La imagen dejará de aparecer en la oferta. '
      + 'Podrás restaurarla desde imágenes archivadas.'
    ),
    confirmLabel: 'Archivar imagen',
    color: '#B42318',
  };
}

function localImageFromPicker(
  asset: ImagePicker.ImagePickerAsset,
): LocalCommercialOfferImage {
  const extension = asset.mimeType === 'image/png'
    ? 'png'
    : asset.mimeType === 'image/webp'
      ? 'webp'
      : 'jpg';

  return {
    uri: asset.uri,
    name: asset.fileName || `oferta-${Date.now()}.${extension}`,
    mimeType: asset.mimeType || 'image/jpeg',
    sizeBytes: asset.fileSize,
  };
}

export default function BuddyServicesManageOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
    offerId?: string | string[];
  }>();

  const businessId = getParam(params.businessId);
  const offerId = getParam(params.offerId);

  const [offer, setOffer] = useState<
    CommercialOwnedOffer | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [
    actionConfirmation,
    setActionConfirmation,
  ] = useState<OfferActionConfirmation>(null);
  const [
    imageActionConfirmation,
    setImageActionConfirmation,
  ] = useState<ImageActionConfirmation>(null);

  const loadOffer = useCallback(async () => {
    if (!businessId || !offerId) {
      setErrorMessage(
        'No fue posible identificar la oferta solicitada.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loadOwnedCommercialOffer(
        businessId,
        offerId,
      );

      setOffer(response.offer);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setOffer(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    businessId,
    offerId,
  ]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  const selectAndUploadImage = useCallback(async () => {
    if (!offer || !businessId || offer.status === 'archived') {
      return;
    }

    setErrorMessage(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage(
        'Necesitamos permiso para seleccionar una imagen.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      setErrorMessage(
        'No fue posible leer la imagen seleccionada.',
      );
      return;
    }

    setIsUploadingImage(true);

    try {
      const credentials = await getValidSessionCredentials();

      if (!credentials) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const uploadedFile = await uploadCommercialOfferImageFile(
        credentials,
        localImageFromPicker(asset),
      );

      const activeImages = offer.images.filter(
        (image) => image.status !== 'archived',
      );

      await createOwnedOfferImage(
        businessId,
        offer.id,
        {
          file_id: uploadedFile.id,
          is_primary: activeImages.length === 0,
          sort_order: activeImages.length,
        },
      );

      await loadOffer();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [
    businessId,
    loadOffer,
    offer,
  ]);

  const runAction = useCallback(async () => {
    if (!actionConfirmation || !businessId) {
      return;
    }

    const {
      action,
      offer: confirmedOffer,
    } = actionConfirmation;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (action === 'publish') {
        await publishOwnedOffer(
          businessId,
          confirmedOffer.id,
        );
      } else if (action === 'pause') {
        await pauseOwnedOffer(
          businessId,
          confirmedOffer.id,
        );
      } else if (action === 'archive') {
        await archiveOwnedOffer(
          businessId,
          confirmedOffer.id,
        );
      } else if (action === 'restore') {
        await restoreOwnedOffer(
          businessId,
          confirmedOffer.id,
        );
      } else if (action === 'enable') {
        await enableOwnedOffer(
          businessId,
          confirmedOffer.id,
        );
      } else {
        await disableOwnedOffer(
          businessId,
          confirmedOffer.id,
        );
      }

      setActionConfirmation(null);
      await loadOffer();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setActionConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    actionConfirmation,
    businessId,
    loadOffer,
  ]);

  const runImageAction = useCallback(async () => {
    if (!imageActionConfirmation || !businessId || !offer) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (imageActionConfirmation.action === 'primary') {
        await setOwnedOfferPrimaryImage(
          businessId,
          offer.id,
          imageActionConfirmation.image.id,
        );
      } else {
        await archiveOwnedOfferImage(
          businessId,
          offer.id,
          imageActionConfirmation.image.id,
        );
      }

      setImageActionConfirmation(null);
      await loadOffer();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setImageActionConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    imageActionConfirmation,
    loadOffer,
    offer,
  ]);

  const activeImages = offer
    ? sortCommercialOfferImages(
      offer.images.filter(
        (image) => image.status !== 'archived',
      ),
    )
    : [];

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
          disabled={isSaving || isUploadingImage}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isSaving || isUploadingImage ? 0.55 : 1,
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
          Oferta
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
            Verificando acceso a la oferta…
          </Text>
        </View>
      ) : errorMessage || !offer ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <PackageSearch
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
            No fue posible abrir esta oferta
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
            {errorMessage || 'La oferta no está disponible.'}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Reintentar cargar oferta"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadOffer();
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
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E7DDF2',
              borderRadius: 18,
              borderWidth: 1,
              padding: 17,
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
                  borderRadius: 13,
                  height: 46,
                  justifyContent: 'center',
                  width: 46,
                }}
              >
                {offer.offer_kind === 'product' ? (
                  <Box
                    color="#7427D5"
                    size={22}
                  />
                ) : (
                  <BriefcaseBusiness
                    color="#7427D5"
                    size={22}
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
                  style={{
                    color: '#261743',
                    fontSize: 18,
                    fontWeight: '900',
                  }}
                >
                  {offer.title}
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {offer.offer_kind === 'product'
                    ? 'Producto'
                    : 'Servicio'}
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: '#4E3B68',
                fontSize: 17,
                fontWeight: '900',
                marginTop: 17,
              }}
            >
              {priceCopy(offer)}
            </Text>
          </View>

          {errorMessage ? (
            <View
              style={{
                backgroundColor: '#FFF0F0',
                borderColor: '#F7B2B2',
                borderRadius: 14,
                borderWidth: 1,
                marginTop: 16,
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
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 24,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 17,
                fontWeight: '900',
              }}
            >
              Imágenes
            </Text>

            <TouchableOpacity
              accessibilityLabel="Agregar imagen a la oferta"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={
                isSaving
                || isUploadingImage
                || offer.status === 'archived'
              }
              onPress={() => {
                void selectAndUploadImage();
              }}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 12,
                flexDirection: 'row',
                minHeight: 38,
                opacity: (
                  isSaving
                  || isUploadingImage
                  || offer.status === 'archived'
                )
                  ? 0.55
                  : 1,
                paddingHorizontal: 11,
              }}
            >
              {isUploadingImage ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <ImagePlus
                  color="#FFFFFF"
                  size={17}
                />
              )}

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '800',
                  marginLeft: 6,
                }}
              >
                {isUploadingImage ? 'Subiendo…' : 'Agregar'}
              </Text>
            </TouchableOpacity>
          </View>

          {activeImages.length === 0 ? (
            <Text
              style={{
                color: '#786593',
                fontSize: 13,
                lineHeight: 19,
                marginTop: 10,
              }}
            >
              Aún no hay imágenes activas para esta oferta.
            </Text>
          ) : (
            <ScrollView
              contentContainerStyle={{
                gap: 11,
                paddingTop: 12,
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {activeImages.map((image) => (
                <View
                  key={image.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: image.is_primary
                      ? '#7427D5'
                      : '#E7DDF2',
                    borderRadius: 14,
                    borderWidth: image.is_primary ? 2 : 1,
                    overflow: 'hidden',
                    width: 144,
                  }}
                >
                  {image.url ? (
                    <Image
                      source={{
                        uri: image.url,
                      }}
                      style={{
                        backgroundColor: '#F6EAFE',
                        height: 112,
                        width: 142,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: '#F6EAFE',
                        height: 112,
                        justifyContent: 'center',
                        width: 142,
                      }}
                    >
                      <ImagePlus
                        color="#7427D5"
                        size={24}
                      />
                    </View>
                  )}

                  <View
                    style={{
                      padding: 9,
                    }}
                  >
                    {image.is_primary ? (
                      <Text
                        style={{
                          color: '#54209E',
                          fontSize: 11,
                          fontWeight: '900',
                        }}
                      >
                        Principal
                      </Text>
                    ) : (
                      <TouchableOpacity
                        accessibilityLabel="Marcar como imagen principal"
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving || isUploadingImage}
                        onPress={() => {
                          setImageActionConfirmation({
                            action: 'primary',
                            image,
                          });
                        }}
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                        }}
                      >
                        <Star
                          color="#7427D5"
                          size={14}
                        />

                        <Text
                          style={{
                            color: '#54209E',
                            fontSize: 11,
                            fontWeight: '800',
                            marginLeft: 5,
                          }}
                        >
                          Hacer principal
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      accessibilityLabel="Archivar imagen"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={isSaving || isUploadingImage}
                      onPress={() => {
                        setImageActionConfirmation({
                          action: 'archive',
                          image,
                        });
                      }}
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        marginTop: 8,
                      }}
                    >
                      <Archive
                        color="#B42318"
                        size={14}
                      />

                      <Text
                        style={{
                          color: '#B42318',
                          fontSize: 11,
                          fontWeight: '800',
                          marginLeft: 5,
                        }}
                      >
                        Archivar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <Text
            style={{
              color: '#261743',
              fontSize: 17,
              fontWeight: '900',
              marginBottom: 11,
              marginTop: 28,
            }}
          >
            Estado y disponibilidad
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 9,
            }}
          >
            {offer.status === 'paused' ? (
              <TouchableOpacity
                accessibilityLabel="Publicar oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving || isUploadingImage}
                onPress={() => {
                  setActionConfirmation({
                    action: 'publish',
                    offer,
                  });
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#E8F7EE',
                  borderRadius: 12,
                  flexDirection: 'row',
                  opacity: isSaving || isUploadingImage ? 0.55 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <PlayCircle
                  color="#177245"
                  size={17}
                />

                <Text
                  style={{
                    color: '#177245',
                    fontSize: 13,
                    fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  Publicar
                </Text>
              </TouchableOpacity>
            ) : null}

            {offer.status === 'published' ? (
              <TouchableOpacity
                accessibilityLabel="Pausar oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving || isUploadingImage}
                onPress={() => {
                  setActionConfirmation({
                    action: 'pause',
                    offer,
                  });
                }}
                style={{
                  alignItems: 'center',
                 backgroundColor: '#FFF4DE',
                  borderRadius: 12,
                  flexDirection: 'row',
                  opacity: isSaving || isUploadingImage ? 0.55 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <CirclePause
                  color="#9A5B00"
                  size={17}
                />

                <Text
                  style={{
                    color: '#9A5B00',
                    fontSize: 13,
                    fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  Pausar
                </Text>
              </TouchableOpacity>
            ) : null}

            {offer.status === 'archived' ? (
              <TouchableOpacity
                accessibilityLabel="Restaurar oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving || isUploadingImage}
                onPress={() => {
                  setActionConfirmation({
                    action: 'restore',
                    offer,
                  });
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#E8F7EE',
                  borderRadius: 12,
                  flexDirection: 'row',
                  opacity: isSaving || isUploadingImage ? 0.55 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <RotateCcw
                  color="#177245"
                  size={17}
                />

                <Text
                  style={{
                    color: '#177245',
                    fontSize: 13,
                   fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  Restaurar
                </Text>
              </TouchableOpacity>
            ) : null}

            {offer.status !== 'archived' ? (
              <TouchableOpacity
                accessibilityLabel={
                  offer.is_available
                    ? 'Deshabilitar disponibilidad'
                    : 'Habilitar disponibilidad'
                }
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving || isUploadingImage}
                onPress={() => {
                  setActionConfirmation({
                    action: offer.is_available
                      ? 'disable'
                      : 'enable',
                    offer,
                  });
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: offer.is_available
                    ? '#FFF4DE'
                    : '#E8F7EE',
                  borderRadius: 12,
                  flexDirection: 'row',
                  opacity: isSaving || isUploadingImage ? 0.55 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                {offer.is_available ? (
                  <EyeOff
                    color="#9A5B00"
                    size={17}
                  />
                ) : (
                  <Eye
                    color="#177245"
                    size={17}
                  />
                )}

                <Text
                  style={{
                    color: offer.is_available
                      ? '#9A5B00'
                      : '#177245',
                    fontSize: 13,
                    fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  {offer.is_available
                    ? 'Deshabilitar'
                    : 'Habilitar'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {offer.status !== 'archived' ? (
              <TouchableOpacity
                accessibilityLabel="Archivar oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving || isUploadingImage}
                onPress={() => {
                  setActionConfirmation({
                    action: 'archive',
                    offer,
                  });
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#FFF0F0',
                  borderRadius: 12,
                  flexDirection: 'row',
                  opacity: isSaving || isUploadingImage ? 0.55 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Archive
                  color="#B42318"
                  size={17}
                />

                <Text
                  style={{
                    color: '#B42318',
                    fontSize: 13,
                    fontWeight: '800',
                    marginLeft: 7,
                  }}
                >
                  Archivar
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            setActionConfirmation(null);
          }
        }}
        transparent
        visible={Boolean(actionConfirmation)}
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
            <Text
              style={{
                color: '#261743',
                fontSize: 19,
                fontWeight: '900',
              }}
            >
              {actionConfirmation
                ? actionCopy(
                  actionConfirmation.action,
                ).title
                : ''}
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 9,
              }}
            >
              {actionConfirmation
                ? actionCopy(
                  actionConfirmation.action,
                ).description
                : ''}
            </Text>

            <Text
              style={{
                color: '#4E3B68',
                fontSize: 13,
                fontWeight: '700',
                marginTop: 13,
              }}
            >
              {actionConfirmation?.offer.title || ''}
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
                accessibilityLabel="Cancelar acción de oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  setActionConfirmation(null);
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#3D245E',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Confirmar acción de oferta"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void runAction();
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: actionConfirmation
                    ? actionCopy(
                      actionConfirmation.action,
                    ).color
                    : '#7427D5',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {isSaving
                    ? 'Procesando…'
                    : actionConfirmation
                      ? actionCopy(
                        actionConfirmation.action,
                      ).confirmLabel
                      : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            setImageActionConfirmation(null);
          }
        }}
        transparent
        visible={Boolean(imageActionConfirmation)}
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
            <Text
              style={{
                color: '#261743',
                fontSize: 19,
                fontWeight: '900',
              }}
            >
              {imageActionConfirmation
                ? imageActionCopy(
                  imageActionConfirmation.action,
                ).title
                : ''}
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 9,
              }}
            >
              {imageActionConfirmation
                ? imageActionCopy(
                  imageActionConfirmation.action,
                ).description
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
                accessibilityLabel="Cancelar acción de imagen"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  setImageActionConfirmation(null);
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#3D245E',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Confirmar acción de imagen"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void runImageAction();
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: imageActionConfirmation
                    ? imageActionCopy(
                      imageActionConfirmation.action,
                    ).color
                    : '#7427D5',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {isSaving
                    ? 'Procesando…'
                    : imageActionConfirmation
                      ? imageActionCopy(
                        imageActionConfirmation.action,
                      ).confirmLabel
                      : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
