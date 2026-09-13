import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Archive,
  ArrowLeft,
  Box,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  Eye,
  EyeOff,
  ImagePlus,
  Minus,
  PackageSearch,
  Pencil,
  PlayCircle,
  Plus,
  RotateCcw,
  Save,
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
  CommercialModality,
  CommercialOfferImage,
  CommercialOwnedOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../../src/features/buddyservices/commercialErrors';
import {
  archiveOwnedOffer,
  createOwnedOfferImage,
  deleteOwnedOfferImage,
  disableOwnedOffer,
  enableOwnedOffer,
  loadOwnedCommercialOffer,
  loadOwnedCommercialProfile,
  pauseOwnedOffer,
  publishOwnedOffer,
  restoreOwnedOffer,
  setOwnedOfferPrimaryImage,
  updateOwnedOffer,
  updateOwnedOfferImage,
  updateOwnedOfferModalities,
  adjustOwnedOfferInventory,
} from '../../../../../../src/services/commercialService';
import {
  ensureCommercialOfferImageCount,
  getCommercialOfferImageSlotsRemaining,
  localCommercialOfferImageFromPicker,
  moveCommercialOfferImage,
  sortCommercialOfferImages,
  uploadCommercialOfferImageFile,
  validateLocalCommercialOfferImage,
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
  | 'delete'
  | 'primary';

type ImageActionConfirmation = {
  action: ImageAction;
  image: CommercialOfferImage;
} | null;

type OfferEditor = {
  basePriceAmount: string;
  description: string;
  durationMinutes: string;
  paymentPolicy:
    | 'not_required'
    | 'required_before_confirmation'
    | 'required_after_service'
    | 'to_be_agreed';
  pricingStrategy:
    | 'fixed'
    | 'starting_at'
    | 'free'
    | 'to_be_confirmed';
  requiresBooking: boolean;
  selectedModalities: CommercialModality[];
  stockQuantity: string;
  title: string;
  trackInventory: boolean;
};

function createOfferEditor(
  offer: CommercialOwnedOffer,
): OfferEditor {
  return {
    basePriceAmount: offer.base_price_amount === null
      ? ''
      : String(offer.base_price_amount),
    description: offer.description || '',
    durationMinutes: offer.duration_minutes === null
      ? ''
      : String(offer.duration_minutes),
    paymentPolicy: offer.payment_policy || 'to_be_agreed',
    pricingStrategy: offer.pricing_strategy,
    requiresBooking: offer.requires_booking,
    selectedModalities: offer.modalities
      .filter((item) => item.status !== 'archived')
      .map((item) => item.modality),
    stockQuantity: offer.stock_quantity === null
      ? ''
      : String(offer.stock_quantity),
    title: offer.title,
    trackInventory: offer.track_inventory,
  };
}

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
    title: 'Eliminar imagen',
    description: (
      'Esta imagen se eliminará definitivamente de la oferta. '
      + 'Esta acción no se puede deshacer.'
    ),
    confirmLabel: 'Eliminar imagen',
    color: '#B42318',
  };
}


export default function BuddyServicesManageOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
    offerId?: string | string[];
    notice?: string | string[];
  }>();

  const businessId = getParam(params.businessId);
  const offerId = getParam(params.offerId);
  const recoveryNotice = getParam(params.notice);

  const [offer, setOffer] = useState<
    CommercialOwnedOffer | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editor, setEditor] = useState<OfferEditor | null>(null);
  const [inventoryDelta, setInventoryDelta] = useState('1');
  const [enabledModalities, setEnabledModalities] = useState<
    CommercialModality[]
  >([]);
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
      const [
        offerResponse,
        profileResponse,
      ] = await Promise.all([
        loadOwnedCommercialOffer(
          businessId,
          offerId,
        ),
        loadOwnedCommercialProfile(businessId),
      ]);

      const activeModalities = profileResponse.profile.modalities
        .filter((record) => record.status !== 'archived')
        .map((record) => record.modality);

      const nextEditor = createOfferEditor(offerResponse.offer);

      setOffer(offerResponse.offer);
      setEnabledModalities(activeModalities);
      setEditor({
        ...nextEditor,
        selectedModalities: nextEditor.selectedModalities.filter(
          (modality) => activeModalities.includes(modality),
        ),
      });
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setEnabledModalities([]);
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

  useEffect(() => {
    if (recoveryNotice) {
      setErrorMessage(recoveryNotice);
    }
  }, [recoveryNotice]);

  const startEditing = useCallback(() => {
    if (!offer || offer.status === 'archived') {
      return;
    }

    setEditor(createOfferEditor(offer));
    setInventoryDelta('1');
    setErrorMessage(null);
    setIsEditing(true);
  }, [offer]);

  const cancelEditing = useCallback(() => {
    if (offer) {
      setEditor(createOfferEditor(offer));
    }

    setInventoryDelta('1');
    setErrorMessage(null);
    setIsEditing(false);
  }, [offer]);

  const saveOfferChanges = useCallback(async () => {
    if (
      !offer
      || !editor
      || !businessId
      || offer.status === 'archived'
    ) {
      return;
    }

    const title = editor.title.trim();
    const description = editor.description.trim();
    const requiresPrice = (
      editor.pricingStrategy === 'fixed'
      || editor.pricingStrategy === 'starting_at'
    );
    const parsedPrice = Number(editor.basePriceAmount);
    const parsedStock = Number(editor.stockQuantity);
    const parsedDuration = Number(editor.durationMinutes);

    if (!title) {
      setErrorMessage('Escribe el nombre de la oferta.');
      return;
    }

    if (
      requiresPrice
      && (
        !Number.isInteger(parsedPrice)
        || parsedPrice < 0
      )
    ) {
      setErrorMessage(
        'Escribe un valor entero igual o mayor que cero.',
      );
      return;
    }

    if (
      offer.offer_kind === 'product'
      && editor.trackInventory
      && (
        !Number.isInteger(parsedStock)
        || parsedStock < 0
      )
    ) {
      setErrorMessage(
        'El inventario inicial debe ser un número entero igual o mayor que cero.',
      );
      return;
    }

    if (
      offer.offer_kind === 'service'
      && editor.requiresBooking
      && (
        !Number.isInteger(parsedDuration)
        || parsedDuration <= 0
      )
    ) {
      setErrorMessage(
        'La duración debe ser un número entero mayor que cero.',
      );
      return;
    }

    const validModalities = editor.selectedModalities.filter(
      (modality) => enabledModalities.includes(modality),
    );

    if (validModalities.length === 0) {
      setErrorMessage(
        'Selecciona al menos una modalidad activa del negocio.',
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateOwnedOffer(
        businessId,
        offer.id,
        {
          title,
          description: description || null,
          pricing_strategy: editor.pricingStrategy,
          base_price_amount: requiresPrice
            ? parsedPrice
            : null,
          track_inventory: offer.offer_kind === 'product'
            ? editor.trackInventory
            : false,
          stock_quantity: offer.offer_kind === 'product'
            ? (
              editor.trackInventory
              ? (
                offer.track_inventory
                ? offer.stock_quantity
                : parsedStock
              )
              : null
            )
            : null,
          requires_booking: offer.offer_kind === 'service'
            ? editor.requiresBooking
            : false,
          duration_minutes: (
            offer.offer_kind === 'service'
            && editor.requiresBooking
          )
            ? parsedDuration
            : null,
          payment_policy: offer.offer_kind === 'service'
            ? editor.paymentPolicy
            : null,
        },
      );

      await updateOwnedOfferModalities(
        businessId,
        offer.id,
        {
          modalities: validModalities,
        },
      );

      setIsEditing(false);
      await loadOffer();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    editor,
    enabledModalities,
    loadOffer,
    offer,
  ]);

  const adjustOfferInventory = useCallback(async (
    direction: 'increase' | 'decrease',
  ) => {
    if (
      !offer
      || !businessId
      || offer.offer_kind !== 'product'
      || !offer.track_inventory
      || offer.status === 'archived'
    ) {
      return;
    }

    const parsedDelta = Number(inventoryDelta);
    const quantityDelta = direction === 'increase'
      ? parsedDelta
      : -parsedDelta;

    if (
      !Number.isInteger(parsedDelta)
      || parsedDelta <= 0
    ) {
      setErrorMessage(
        'Escribe una cantidad entera mayor que cero.',
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await adjustOwnedOfferInventory(
        businessId,
        offer.id,
        {
          quantity_delta: quantityDelta,
          reason_code: direction === 'increase'
            ? 'manual_increment'
            : 'manual_decrement',
          reason_text: 'Ajuste manual desde la administración de la oferta.',
        },
      );

      await loadOffer();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    inventoryDelta,
    loadOffer,
    offer,
  ]);

  const selectAndUploadImage = useCallback(async () => {
    if (!offer || !businessId || offer.status === 'archived') {
      return;
    }

    const activeImages = sortCommercialOfferImages(
      offer.images.filter(
        (image) => image.status !== 'archived',
      ),
    );
    const availableSlots = getCommercialOfferImageSlotsRemaining(
      activeImages.length,
    );

    if (availableSlots === 0) {
      setErrorMessage(
        'Cada producto o servicio permite máximo 5 imágenes.',
      );
      return;
    }

    setErrorMessage(null);

    const permission = (
      await ImagePicker.requestMediaLibraryPermissionsAsync()
    );

    if (!permission.granted) {
      setErrorMessage(
        'Necesitamos permiso para seleccionar imágenes.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      selectionLimit: availableSlots,
    });

    if (result.canceled) {
      return;
    }

    const selectedImages = result.assets
      .slice(0, availableSlots)
      .map(localCommercialOfferImageFromPicker);

    try {
      ensureCommercialOfferImageCount(
        activeImages.length + selectedImages.length,
      );
      selectedImages.forEach(validateLocalCommercialOfferImage);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible preparar las imágenes seleccionadas.';

      setErrorMessage(message);
      return;
    }

    if (selectedImages.length === 0) {
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

      for (
        let imageIndex = 0;
        imageIndex < selectedImages.length;
        imageIndex += 1
      ) {
        const selectedImage = selectedImages[imageIndex];

        if (!selectedImage) {
          continue;
        }

        const uploadedFile = await uploadCommercialOfferImageFile(
          credentials,
          selectedImage,
        );

        await createOwnedOfferImage(
          businessId,
          offer.id,
          {
            file_id: uploadedFile.id,
            is_primary: (
              activeImages.length === 0
              && imageIndex === 0
            ),
            sort_order: activeImages.length + imageIndex,
          },
        );
      }

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

  const moveOfferImage = useCallback(async (
    fromIndex: number,
    toIndex: number,
  ) => {
    if (
      !offer
      || !businessId
      || isSaving
      || isUploadingImage
      || offer.status === 'archived'
    ) {
      return;
    }

    const currentImages = sortCommercialOfferImages(
      offer.images.filter(
        (image) => image.status !== 'archived',
      ),
    );
    const reorderedImages = moveCommercialOfferImage(
      currentImages,
      fromIndex,
      toIndex,
    );

    if (
      reorderedImages.length !== currentImages.length
      || reorderedImages.every(
        (image, index) => image.id === currentImages[index]?.id,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      for (
        let imageIndex = 0;
        imageIndex < reorderedImages.length;
        imageIndex += 1
      ) {
        const image = reorderedImages[imageIndex];

        if (
          image
          && image.sort_order !== imageIndex
        ) {
          await updateOwnedOfferImage(
            businessId,
            offer.id,
            image.id,
            {
              sort_order: imageIndex,
            },
          );
        }
      }

      const firstImage = reorderedImages[0];

      if (firstImage && !firstImage.is_primary) {
        await setOwnedOfferPrimaryImage(
          businessId,
          offer.id,
          firstImage.id,
        );
      }

      await loadOffer();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    isSaving,
    isUploadingImage,
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
        await deleteOwnedOfferImage(
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
                  {offer.offer_kind === 'product'
                    ? 'Producto'
                    : 'Servicio'}
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {isEditing
                    ? 'Editando información'
                    : offer.status === 'archived'
                      ? 'Archivado'
                      : 'Información de la oferta'}
                </Text>
              </View>

              {!isEditing && offer.status !== 'archived' ? (
                <TouchableOpacity
                  accessibilityLabel="Editar oferta"
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  disabled={isSaving || isUploadingImage}
                  onPress={startEditing}
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#F4EDF9',
                    borderRadius: 11,
                    flexDirection: 'row',
                    opacity: isSaving || isUploadingImage ? 0.55 : 1,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  <Pencil
                    color="#54209E"
                    size={15}
                  />

                  <Text
                    style={{
                      color: '#54209E',
                      fontSize: 12,
                      fontWeight: '800',
                      marginLeft: 5,
                    }}
                  >
                    Editar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {isEditing && editor ? (
              <View
                style={{
                  marginTop: 18,
                }}
              >
                <Text
                  style={{
                    color: '#4E3B68',
                    fontSize: 13,
                    fontWeight: '800',
                    marginBottom: 7,
                  }}
                >
                  Nombre
                </Text>

                <TextInput
                  accessibilityLabel="Nombre de la oferta"
                  autoCapitalize="sentences"
                  editable={!isSaving}
                  maxLength={200}
                  onChangeText={(value) => {
                    setEditor((current) => current
                      ? {
                        ...current,
                        title: value,
                      }
                      : current);
                  }}
                  placeholder="Nombre de la oferta"
                  placeholderTextColor="#A89AB9"
                  style={{
                    backgroundColor: '#FFFCF9',
                    borderColor: '#DCCDED',
                    borderRadius: 12,
                    borderWidth: 1,
                    color: '#261743',
                    fontSize: 15,
                    minHeight: 46,
                    paddingHorizontal: 13,
                  }}
                  value={editor.title}
                />

                <Text
                  style={{
                    color: '#4E3B68',
                    fontSize: 13,
                    fontWeight: '800',
                    marginBottom: 7,
                    marginTop: 15,
                  }}
                >
                  Descripción
                </Text>

                <TextInput
                  accessibilityLabel="Descripción de la oferta"
                  autoCapitalize="sentences"
                  editable={!isSaving}
                  maxLength={6000}
                  multiline
                  onChangeText={(value) => {
                    setEditor((current) => current
                      ? {
                        ...current,
                        description: value,
                      }
                      : current);
                  }}
                  placeholder="Describe tu oferta"
                  placeholderTextColor="#A89AB9"
                  style={{
                    backgroundColor: '#FFFCF9',
                    borderColor: '#DCCDED',
                    borderRadius: 12,
                    borderWidth: 1,
                    color: '#261743',
                    fontSize: 15,
                    minHeight: 94,
                    paddingHorizontal: 13,
                    paddingTop: 12,
                    textAlignVertical: 'top',
                  }}
                  value={editor.description}
                />

                <Text
                  style={{
                    color: '#4E3B68',
                    fontSize: 13,
                    fontWeight: '800',
                    marginBottom: 8,
                    marginTop: 15,
                  }}
                >
                  Precio
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {[
                    {
                      id: 'fixed',
                      label: 'Valor fijo',
                    },
                    {
                      id: 'starting_at',
                      label: 'Desde',
                    },
                    {
                      id: 'free',
                      label: 'Gratis',
                    },
                    {
                      id: 'to_be_confirmed',
                      label: 'Cotizar',
                    },
                  ].map((strategy) => {
                    const isSelected = (
                      editor.pricingStrategy === strategy.id
                    );

                    return (
                      <TouchableOpacity
                        key={strategy.id}
                        accessibilityLabel={strategy.label}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setEditor((current) => current
                            ? {
                              ...current,
                              pricingStrategy: strategy.id as OfferEditor['pricingStrategy'],
                            }
                            : current);
                        }}
                        style={{
                          backgroundColor: isSelected
                            ? '#7427D5'
                            : '#F4EDF9',
                          borderRadius: 11,
                          opacity: isSaving ? 0.55 : 1,
                          paddingHorizontal: 11,
                          paddingVertical: 9,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected
                              ? '#FFFFFF'
                              : '#54209E',
                            fontSize: 12,
                            fontWeight: '800',
                          }}
                        >
                          {strategy.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {(
                  editor.pricingStrategy === 'fixed'
                  || editor.pricingStrategy === 'starting_at'
                ) ? (
                  <View
                    style={{
                      marginTop: 11,
                    }}
                  >
                    <Text
                      style={{
                        color: '#786593',
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      Valor en pesos colombianos
                    </Text>

                    <TextInput
                      accessibilityLabel="Valor de la oferta en pesos colombianos"
                      editable={!isSaving}
                      keyboardType="number-pad"
                      maxLength={14}
                      onChangeText={(value) => {
                        setEditor((current) => current
                          ? {
                            ...current,
                            basePriceAmount: value.replace(/[^0-9]/g, ''),
                          }
                          : current);
                      }}
                      placeholder="0"
                      placeholderTextColor="#A89AB9"
                      style={{
                        backgroundColor: '#FFFCF9',
                        borderColor: '#DCCDED',
                        borderRadius: 12,
                        borderWidth: 1,
                        color: '#261743',
                        fontSize: 16,
                        fontWeight: '800',
                        minHeight: 46,
                        paddingHorizontal: 13,
                      }}
                      value={editor.basePriceAmount}
                    />
                  </View>
                ) : null}

                {offer.offer_kind === 'product' ? (
                  <View
                    style={{
                      backgroundColor: '#F9F6FC',
                      borderColor: '#E7DDF2',
                      borderRadius: 14,
                      borderWidth: 1,
                      marginTop: 20,
                      padding: 13,
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'center',
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
                          style={{
                            color: '#4E3B68',
                            fontSize: 14,
                            fontWeight: '900',
                          }}
                        >
                          Controlar inventario
                        </Text>

                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            lineHeight: 18,
                            marginTop: 4,
                          }}
                        >
                          Activa el control para administrar existencias de este producto.
                        </Text>
                      </View>

                      <Switch
                        accessibilityLabel="Controlar inventario"
                        disabled={isSaving}
                        onValueChange={(value) => {
                          setEditor((current) => current
                            ? {
                              ...current,
                              stockQuantity: value && !current.stockQuantity
                                ? '0'
                                : current.stockQuantity,
                              trackInventory: value,
                            }
                            : current);
                        }}
                        thumbColor={editor.trackInventory
                          ? '#7427D5'
                          : '#FFFFFF'}
                        trackColor={{
                          false: '#DCCDED',
                          true: '#D6B8F5',
                        }}
                        value={editor.trackInventory}
                      />
                    </View>

                    {editor.trackInventory && !offer.track_inventory ? (
                      <View
                        style={{
                          marginTop: 14,
                        }}
                      >
                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Inventario inicial
                        </Text>

                        <TextInput
                          accessibilityLabel="Inventario inicial"
                          editable={!isSaving}
                          keyboardType="number-pad"
                          maxLength={10}
                          onChangeText={(value) => {
                            setEditor((current) => current
                              ? {
                                ...current,
                                stockQuantity: value.replace(/[^0-9]/g, ''),
                              }
                              : current);
                          }}
                          placeholder="0"
                          placeholderTextColor="#A89AB9"
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#DCCDED',
                            borderRadius: 12,
                            borderWidth: 1,
                            color: '#261743',
                            fontSize: 16,
                            fontWeight: '800',
                            minHeight: 46,
                            paddingHorizontal: 13,
                          }}
                          value={editor.stockQuantity}
                        />
                      </View>
                    ) : null}

                    {offer.track_inventory && editor.trackInventory ? (
                      <View
                        style={{
                          marginTop: 15,
                        }}
                      >
                        <Text
                          style={{
                            color: '#4E3B68',
                            fontSize: 13,
                            fontWeight: '900',
                          }}
                        >
                          Existencias actuales: {offer.stock_quantity ?? 0}
                        </Text>

                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            marginBottom: 7,
                            marginTop: 10,
                          }}
                        >
                          Cantidad para ajustar
                        </Text>

                        <TextInput
                          accessibilityLabel="Cantidad para ajustar inventario"
                          editable={!isSaving}
                          keyboardType="number-pad"
                          maxLength={10}
                          onChangeText={(value) => {
                            setInventoryDelta(
                              value.replace(/[^0-9]/g, ''),
                            );
                          }}
                          placeholder="1"
                          placeholderTextColor="#A89AB9"
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#DCCDED',
                            borderRadius: 12,
                            borderWidth: 1,
                            color: '#261743',
                            fontSize: 16,
                            fontWeight: '800',
                            minHeight: 46,
                            paddingHorizontal: 13,
                          }}
                          value={inventoryDelta}
                        />

                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 10,
                            marginTop: 10,
                          }}
                        >
                          <TouchableOpacity
                            accessibilityLabel="Restar inventario"
                            accessibilityRole="button"
                            activeOpacity={0.82}
                            disabled={isSaving || isUploadingImage}
                            onPress={() => {
                              void adjustOfferInventory('decrease');
                            }}
                            style={{
                              alignItems: 'center',
                              backgroundColor: '#FFF0F0',
                              borderRadius: 12,
                              flex: 1,
                              flexDirection: 'row',
                              justifyContent: 'center',
                              minHeight: 44,
                              opacity: isSaving || isUploadingImage
                                ? 0.55
                                : 1,
                            }}
                          >
                            <Minus
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
                              Restar
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            accessibilityLabel="Agregar inventario"
                            accessibilityRole="button"
                            activeOpacity={0.82}
                            disabled={isSaving || isUploadingImage}
                            onPress={() => {
                              void adjustOfferInventory('increase');
                            }}
                            style={{
                              alignItems: 'center',
                              backgroundColor: '#E8F7EE',
                              borderRadius: 12,
                              flex: 1,
                              flexDirection: 'row',
                              justifyContent: 'center',
                              minHeight: 44,
                              opacity: isSaving || isUploadingImage
                                ? 0.55
                                : 1,
                            }}
                          >
                            <Plus
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
                              Agregar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {offer.offer_kind === 'service' ? (
                  <View
                    style={{
                      backgroundColor: '#F9F6FC',
                      borderColor: '#E7DDF2',
                      borderRadius: 14,
                      borderWidth: 1,
                      marginTop: 20,
                      padding: 13,
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'center',
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
                          style={{
                            color: '#4E3B68',
                            fontSize: 14,
                            fontWeight: '900',
                          }}
                        >
                          Requiere reserva
                        </Text>

                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            lineHeight: 18,
                            marginTop: 4,
                          }}
                        >
                          Activa la reserva si el cliente debe elegir un horario.
                        </Text>
                      </View>

                      <Switch
                        accessibilityLabel="Requiere reserva"
                        disabled={isSaving}
                        onValueChange={(value) => {
                          setEditor((current) => current
                            ? {
                              ...current,
                              durationMinutes: value && !current.durationMinutes
                                ? '30'
                                : current.durationMinutes,
                              requiresBooking: value,
                            }
                            : current);
                        }}
                        thumbColor={editor.requiresBooking
                          ? '#7427D5'
                          : '#FFFFFF'}
                        trackColor={{
                          false: '#DCCDED',
                          true: '#D6B8F5',
                        }}
                        value={editor.requiresBooking}
                      />
                    </View>

                    {editor.requiresBooking ? (
                      <View
                        style={{
                          marginTop: 14,
                        }}
                      >
                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Duración en minutos
                        </Text>

                        <TextInput
                          accessibilityLabel="Duración del servicio en minutos"
                          editable={!isSaving}
                          keyboardType="number-pad"
                          maxLength={6}
                          onChangeText={(value) => {
                            setEditor((current) => current
                              ? {
                                ...current,
                                durationMinutes: value.replace(/[^0-9]/g, ''),
                              }
                              : current);
                          }}
                          placeholder="30"
                          placeholderTextColor="#A89AB9"
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#DCCDED',
                            borderRadius: 12,
                            borderWidth: 1,
                            color: '#261743',
                            fontSize: 16,
                            fontWeight: '800',
                            minHeight: 46,
                            paddingHorizontal: 13,
                          }}
                          value={editor.durationMinutes}
                        />
                      </View>
                    ) : null}

                    <Text
                      style={{
                        color: '#4E3B68',
                        fontSize: 13,
                        fontWeight: '900',
                        marginBottom: 8,
                        marginTop: 18,
                      }}
                    >
                      Política de pago
                    </Text>

                    <View
                      style={{
                        gap: 8,
                      }}
                    >
                      {[
                        {
                          id: 'not_required',
                          label: 'No requiere pago',
                        },
                        {
                          id: 'required_before_confirmation',
                          label: 'Antes de confirmar',
                        },
                        {
                          id: 'required_after_service',
                          label: 'Después del servicio',
                        },
                        {
                          id: 'to_be_agreed',
                          label: 'A convenir',
                        },
                      ].map((policy) => {
                        const isSelected = (
                          editor.paymentPolicy === policy.id
                        );

                        return (
                          <TouchableOpacity
                            key={policy.id}
                            accessibilityLabel={policy.label}
                            accessibilityRole="button"
                            activeOpacity={0.82}
                            disabled={isSaving}
                            onPress={() => {
                              setEditor((current) => current
                                ? {
                                  ...current,
                                  paymentPolicy: policy.id as OfferEditor['paymentPolicy'],
                                }
                                : current);
                            }}
                            style={{
                              alignItems: 'center',
                              backgroundColor: isSelected
                                ? '#7427D5'
                                : '#FFFFFF',
                              borderColor: isSelected
                                ? '#7427D5'
                                : '#DCCDED',
                              borderRadius: 11,
                              borderWidth: 1,
                              flexDirection: 'row',
                              minHeight: 42,
                              opacity: isSaving ? 0.55 : 1,
                              paddingHorizontal: 12,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: isSelected
                                  ? '#FFFFFF'
                                  : '#E7DDF2',
                                borderRadius: 7,
                                height: 14,
                                marginRight: 9,
                                width: 14,
                              }}
                            />

                            <Text
                              style={{
                                color: isSelected
                                  ? '#FFFFFF'
                                  : '#54209E',
                                fontSize: 13,
                                fontWeight: '800',
                              }}
                            >
                              {policy.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View
                  style={{
                    backgroundColor: '#F9F6FC',
                    borderColor: '#E7DDF2',
                    borderRadius: 14,
                    borderWidth: 1,
                    marginTop: 20,
                    padding: 13,
                  }}
                >
                  <Text
                    style={{
                      color: '#4E3B68',
                      fontSize: 14,
                      fontWeight: '900',
                    }}
                  >
                    Modalidades
                  </Text>

                  <Text
                    style={{
                      color: '#786593',
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                  >
                    Selecciona cómo pueden solicitar esta oferta.
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 13,
                    }}
                  >
                    {[
                      {
                        id: 'at_establishment',
                        label: 'En establecimiento',
                      },
                      {
                        id: 'in_person',
                        label: 'Presencial',
                      },
                      {
                        id: 'virtual',
                        label: 'Virtual',
                      },
                      {
                        id: 'home_visit',
                        label: 'A domicilio',
                      },
                      {
                        id: 'delivery',
                        label: 'Entrega',
                      },
                      {
                        id: 'pickup',
                        label: 'Recogida',
                      },
                      {
                        id: 'phone_call',
                        label: 'Llamada',
                      },
                      {
                        id: 'buddy_chat',
                        label: 'Chat BeeApp',
                      },
                    ].filter((modality) => (
                      enabledModalities.includes(
                        modality.id as CommercialModality,
                      )
                    )).map((modality) => {
                      const selectedModality = (
                        modality.id as CommercialModality
                      );
                      const isSelected = editor.selectedModalities.includes(
                        selectedModality,
                      );

                      return (
                        <TouchableOpacity
                          key={modality.id}
                          accessibilityLabel={modality.label}
                          accessibilityRole="button"
                          activeOpacity={0.82}
                          disabled={isSaving}
                          onPress={() => {
                            setEditor((current) => {
                              if (!current) {
                                return current;
                              }

                              const selectedModalities = (
                                current.selectedModalities.includes(
                                  selectedModality,
                                )
                                  ? current.selectedModalities.filter(
                                    (item) => item !== selectedModality,
                                  )
                                  : [
                                    ...current.selectedModalities,
                                    selectedModality,
                                  ]
                              );

                              return {
                                ...current,
                                selectedModalities,
                              };
                            });
                          }}
                          style={{
                            backgroundColor: isSelected
                              ? '#7427D5'
                              : '#FFFFFF',
                            borderColor: isSelected
                              ? '#7427D5'
                              : '#DCCDED',
                            borderRadius: 11,
                            borderWidth: 1,
                            opacity: isSaving ? 0.55 : 1,
                            paddingHorizontal: 11,
                            paddingVertical: 9,
                          }}
                        >
                          <Text
                            style={{
                              color: isSelected
                                ? '#FFFFFF'
                                : '#54209E',
                              fontSize: 12,
                              fontWeight: '800',
                            }}
                          >
                            {modality.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {enabledModalities.length === 0 ? (
                    <Text
                      style={{
                        color: '#9A5B00',
                        fontSize: 12,
                        lineHeight: 18,
                        marginTop: 12,
                      }}
                    >
                      Configura modalidades activas en el perfil del negocio antes de asignarlas a esta oferta.
                    </Text>
                  ) : null}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    marginTop: 20,
                  }}
                >
                  <TouchableOpacity
                    accessibilityLabel="Cancelar edición de oferta"
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving || isUploadingImage}
                    onPress={cancelEditing}
                    style={{
                      alignItems: 'center',
                      backgroundColor: '#F4EDF9',
                      borderRadius: 12,
                      flex: 1,
                      justifyContent: 'center',
                      minHeight: 46,
                      opacity: isSaving || isUploadingImage ? 0.55 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: '#54209E',
                        fontSize: 13,
                        fontWeight: '800',
                      }}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityLabel="Guardar cambios de oferta"
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving || isUploadingImage}
                    onPress={() => {
                      void saveOfferChanges();
                    }}
                    style={{
                      alignItems: 'center',
                      backgroundColor: '#7427D5',
                      borderRadius: 12,
                      flex: 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      minHeight: 46,
                      opacity: isSaving || isUploadingImage ? 0.55 : 1,
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
                        size={16}
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
                      Guardar
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            ) : (
              <View
                style={{
                  marginTop: 17,
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

                {offer.description ? (
                  <Text
                    style={{
                      color: '#786593',
                      fontSize: 13,
                      lineHeight: 19,
                      marginTop: 8,
                    }}
                  >
                    {offer.description}
                  </Text>
                ) : null}

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
            )}
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
            <View>
              <Text
                style={{
                  color: '#261743',
                  fontSize: 17,
                  fontWeight: '900',
                }}
              >
                Imágenes
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {activeImages.length}/5. La primera es la portada.
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="Agregar imagen a la oferta"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={
                isSaving
                || isUploadingImage
                || offer.status === 'archived'
                || activeImages.length >= 5
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
                  || activeImages.length >= 5
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
                {isUploadingImage
                  ? 'Subiendo…'
                  : activeImages.length >= 5
                    ? 'Máximo'
                    : 'Agregar'}
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
              {activeImages.map((image, imageIndex) => (
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
                    <Text
                      style={{
                        color: image.is_primary
                          ? '#54209E'
                          : '#786593',
                        fontSize: 11,
                        fontWeight: '900',
                      }}
                    >
                      {image.is_primary
                        ? 'Portada'
                        : `Foto ${imageIndex + 1}`}
                    </Text>

                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 8,
                      }}
                    >
                      <TouchableOpacity
                        accessibilityLabel={`Mover foto ${imageIndex + 1} a la izquierda`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={
                          isSaving
                          || isUploadingImage
                          || imageIndex === 0
                        }
                        onPress={() => {
                          void moveOfferImage(
                            imageIndex,
                            imageIndex - 1,
                          );
                        }}
                        style={{
                          opacity: (
                            isSaving
                            || isUploadingImage
                            || imageIndex === 0
                          )
                            ? 0.35
                            : 1,
                          padding: 3,
                        }}
                      >
                        <ChevronLeft
                          color="#54209E"
                          size={18}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityLabel={`Mover foto ${imageIndex + 1} a la derecha`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={
                          isSaving
                          || isUploadingImage
                          || imageIndex === activeImages.length - 1
                        }
                        onPress={() => {
                          void moveOfferImage(
                            imageIndex,
                            imageIndex + 1,
                          );
                        }}
                        style={{
                          opacity: (
                            isSaving
                            || isUploadingImage
                            || imageIndex === activeImages.length - 1
                          )
                            ? 0.35
                            : 1,
                          padding: 3,
                        }}
                      >
                        <ChevronRight
                          color="#54209E"
                          size={18}
                        />
                      </TouchableOpacity>
                    </View>

                    {!image.is_primary ? (
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
                          marginTop: 8,
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
                    ) : null}

                    <TouchableOpacity
                      accessibilityLabel="Eliminar imagen"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={isSaving || isUploadingImage}
                      onPress={() => {
                        setImageActionConfirmation({
                          action: 'delete',
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
                        Eliminar
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
