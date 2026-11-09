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
  ArchiveRestore,
  ArrowLeft,
  Box,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImagePlus,
  PackagePlus,
  Percent,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as ImagePicker from 'expo-image-picker';
import { withExternalActivity } from '../../../../../src/services/locationPermissionAppLockGuard';

import {
  useModuleNav,
  useScreenParams,
} from '../../../../../src/components/embedded/EmbeddedNavContext';

import {
  LIST_CACHE_TTL,
  ownedCommercialCatalogsCacheKey,
  ownedCommercialOffersCacheKey,
  ownedCommercialProfileCacheKey,
} from '@beeapp/api-client';
import type {
  CommercialCatalog,
  CommercialModality,
  CommercialOfferKind,
  CommercialOfferType,
  CommercialOwnedOffer,
  CommercialPaymentPolicy,
  CommercialPricingStrategy,
  GetOwnedCommercialCatalogsResponse,
  GetOwnedCommercialOffersResponse,
  GetOwnedCommercialProfileResponse,
} from '@beeapp/shared-types';

import { paintCachedValue } from '../../../../../src/hooks/useCachedResource';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesManageArchivedOffersRoute,
  buddyServicesPublicOfferRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';
import {
  useDeleteOwnedOffer,
} from '../../../../../src/features/buddyservices/useDeleteOwnedOffer';
import {
  archiveOwnedOffer,
  createOwnedCatalog,
  createOwnedOffer,
  createOwnedOfferImage,
  loadOwnedCommercialCatalogs,
  loadOwnedCommercialOffers,
  loadOwnedCommercialProfile,
} from '../../../../../src/services/commercialService';
import {
  ensureCommercialOfferImageCount,
  getCommercialOfferImageSlotsRemaining,
  LocalCommercialOfferImage,
  localCommercialOfferImageFromPicker,
  moveCommercialOfferImage,
  uploadCommercialOfferImageFile,
  validateLocalCommercialOfferImage,
} from '../../../../../src/services/commercialOfferImageService';
import {
  getValidSessionCredentials,
} from '../../../../../src/services/authSession';

type OfferEditorState = {
  catalogId: string;
  offerKind: CommercialOfferKind;
  title: string;
  description: string;
  pricingStrategy: CommercialPricingStrategy;
  basePriceAmount: string;
  hasDiscount: boolean;
  discountPercent: string;
  discountedPriceAmount: string;
  trackInventory: boolean;
  stockQuantity: string;
  requiresBooking: boolean;
  durationMinutes: string;
  paymentPolicy: CommercialPaymentPolicy;
  modalities: CommercialModality[];
  showAdvancedOptions: boolean;
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
  kinds: CommercialOfferKind[];
}> = [
  {
    value: 'at_establishment',
    label: 'En establecimiento',
    kinds: ['product', 'service'],
  },
  {
    value: 'delivery',
    label: 'Entrega a domicilio',
    kinds: ['product'],
  },
  {
    value: 'pickup',
    label: 'Recoger en tienda',
    kinds: ['product'],
  },
  {
    value: 'in_person',
    label: 'Presencial',
    kinds: ['product', 'service'],
  },
  {
    value: 'home_visit',
    label: 'Visita a domicilio',
    kinds: ['service'],
  },
  {
    value: 'virtual',
    label: 'Virtual / Online',
    kinds: ['service'],
  },
  {
    value: 'phone_call',
    label: 'Llamada telefónica',
    kinds: ['service'],
  },
  {
    value: 'buddy_chat',
    label: 'Chat Buddy AI',
    kinds: ['product', 'service'],
  },
];

const QUICK_DISCOUNT_PRESETS = [10, 15, 20, 30, 50];

function normalizeRouteParam(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function defaultOfferKindForBusiness(
  offerType: CommercialOfferType,
): CommercialOfferKind {
  if (offerType === 'services') {
    return 'service';
  }

  return 'product';
}

function getModalitiesForOfferKind(
  offerKind: CommercialOfferKind,
): Array<{
  value: CommercialModality;
  label: string;
}> {
  return MODALITIES.filter((item) => item.kinds.includes(offerKind));
}

function createOfferEditor(
  catalogId: string,
  offerType: CommercialOfferType,
  businessModalities: CommercialModality[],
): OfferEditorState {
  const offerKind = defaultOfferKindForBusiness(offerType);
  const allowedForKind = getModalitiesForOfferKind(offerKind).map(
    (item) => item.value,
  );
  const preselectedModalities = businessModalities.filter(
    (modality) => allowedForKind.includes(modality),
  );

  return {
    catalogId,
    offerKind,
    title: '',
    description: '',
    pricingStrategy: 'fixed',
    basePriceAmount: '',
    hasDiscount: false,
    discountPercent: '10',
    discountedPriceAmount: '',
    trackInventory: false,
    stockQuantity: '',
    requiresBooking: false,
    durationMinutes: '',
    paymentPolicy: 'to_be_agreed',
    modalities: preselectedModalities,
    showAdvancedOptions: false,
  };
}

function normalizeDigits(
  value: string,
): string {
  return value.replace(/\D/g, '');
}

function normalizePriceInput(
  value: string,
): string {
  return normalizeDigits(value);
}

function formatPriceInput(
  value: string,
): string {
  const normalizedValue = normalizePriceInput(value);

  if (!normalizedValue) {
    return '';
  }

  return Number(normalizedValue).toLocaleString('es-CO');
}

function toSafeInteger(
  value: string,
  fallback: number,
): number {
  const parsedValue = Number(normalizeDigits(value));

  return Number.isInteger(parsedValue)
    ? parsedValue
    : fallback;
}

function formatMoney(
  amount: number | null | undefined,
): string {
  if (amount === null || amount === undefined) {
    return 'Sin valor definido';
  }

  return new Intl.NumberFormat('es-CO', {
    currency: 'COP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function calculateDiscountedPrice(
  normalPriceStr: string,
  discountPercentStr: string,
): string {
  const normalPrice = Number(normalizeDigits(normalPriceStr));
  const percent = Number(normalizeDigits(discountPercentStr));

  if (
    !normalPrice
    || normalPrice < 1
    || !percent
    || percent < 1
    || percent > 99
  ) {
    return '';
  }

  const discounted = Math.max(
    1,
    Math.round(normalPrice * (1 - percent / 100)),
  );

  return String(discounted);
}

function calculateDiscountPercent(
  normalPriceStr: string,
  discountedPriceStr: string,
): string {
  const normalPrice = Number(normalizeDigits(normalPriceStr));
  const discountedPrice = Number(normalizeDigits(discountedPriceStr));

  if (
    !normalPrice
    || normalPrice < 1
    || !discountedPrice
    || discountedPrice >= normalPrice
  ) {
    return '';
  }

  const percent = Math.min(
    99,
    Math.max(1, Math.round((1 - discountedPrice / normalPrice) * 100)),
  );

  return String(percent);
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
      ? 'Publicado'
      : 'No disponible',
    color: offer.is_available
      ? '#177245'
      : '#9A5B00',
  };
}

function getOfferPrimaryImageUrl(
  offer: CommercialOwnedOffer,
): string | null {
  return (
    offer.images.find(
      (image) => image.is_primary && Boolean(image.url),
    )?.url
    || offer.images.find((image) => Boolean(image.url))?.url
    || null
  );
}

function getModalityLabel(
  modality: CommercialModality,
): string {
  return (
    MODALITIES.find((item) => item.value === modality)?.label
    || modality
  );
}

export default function BuddyServicesManageOffersScreen() {
  const router = useModuleNav();
  const params = useScreenParams() as {
    businessId?: string | string[];
    catalogId?: string | string[];
  };

  const businessId = normalizeRouteParam(params.businessId);
  const catalogIdParam = normalizeRouteParam(params.catalogId);

  const [catalogs, setCatalogs] = useState<
    CommercialCatalog[]
  >([]);
  const [offers, setOffers] = useState<
    CommercialOwnedOffer[]
  >([]);
  const [businessOfferType, setBusinessOfferType] = useState<
    CommercialOfferType
  >('mixed');
  const [enabledModalities, setEnabledModalities] = useState<
    CommercialModality[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState<
    CommercialOwnedOffer | null
  >(null);
  const [editor, setEditor] = useState<OfferEditorState>(null);
  const [editorError, setEditorError] = useState<string | null>(
    null,
  );
  const [selectedImages, setSelectedImages] = useState<
    LocalCommercialOfferImage[]
  >([]);
  const [creationProgress, setCreationProgress] = useState<
    string | null
  >(null);

  const loadData = useCallback(async () => {
    if (!businessId) {
      setErrorMessage(
        'No fue posible identificar el negocio solicitado.',
      );
      setIsLoading(false);
      return;
    }

    setErrorMessage(null);

    const [
      paintedCatalogs,
      paintedOffers,
      paintedProfile,
    ] = await Promise.all([
      paintCachedValue<GetOwnedCommercialCatalogsResponse>(
        ownedCommercialCatalogsCacheKey(businessId, {
          include_archived: false,
        }),
        LIST_CACHE_TTL.stable,
        (cached) => {
          const activeCatalogs = cached.catalogs.filter(
            (catalog) => catalog.status !== 'archived',
          );
          setCatalogs(
            catalogIdParam
              ? activeCatalogs.filter((c) => c.id === catalogIdParam)
              : activeCatalogs,
          );
        },
      ),
      paintCachedValue<GetOwnedCommercialOffersResponse>(
        ownedCommercialOffersCacheKey(businessId, {
          include_archived: false,
        }),
        LIST_CACHE_TTL.stable,
        (cached) => {
          setOffers(
            cached.offers.filter((offer) => (
              offer.status !== 'archived'
              && (!catalogIdParam || offer.catalog_id === catalogIdParam)
            )),
          );
        },
      ),
      paintCachedValue<GetOwnedCommercialProfileResponse>(
        ownedCommercialProfileCacheKey(businessId),
        LIST_CACHE_TTL.stable,
        (cached) => {
          setBusinessOfferType(cached.profile.offer_type || 'mixed');
          setEnabledModalities(
            cached.profile.modalities
              .filter((record) => record.status !== 'archived')
              .map((record) => record.modality),
          );
        },
      ),
    ]);

    if (paintedCatalogs && paintedOffers && paintedProfile) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const [
        catalogsResponse,
        offersResponse,
        profileResponse,
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
        loadOwnedCommercialProfile(businessId),
      ]);

      const activeProfileModalities = profileResponse.profile.modalities
        .filter((record) => record.status !== 'archived')
        .map((record) => record.modality);

      const activeCatalogs = catalogsResponse.catalogs.filter(
        (catalog) => catalog.status !== 'archived',
      );

      setBusinessOfferType(profileResponse.profile.offer_type || 'mixed');
      setCatalogs(
        catalogIdParam
          ? activeCatalogs.filter((catalog) => catalog.id === catalogIdParam)
          : activeCatalogs,
      );
      setEnabledModalities(activeProfileModalities);
      setOffers(
        offersResponse.offers.filter(
          (offer) => (
            offer.status !== 'archived'
            && (!catalogIdParam || offer.catalog_id === catalogIdParam)
          ),
        ),
      );
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setCatalogs([]);
      setEnabledModalities([]);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    businessId,
    catalogIdParam,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const deleteOfferFlow = useDeleteOwnedOffer({
    onDeleted: (deletedOfferId) => {
      setOffers((currentOffers) => (
        currentOffers.filter((item) => item.id !== deletedOfferId)
      ));
      void loadData();
    },
  });

  const archiveOffer = useCallback(async () => {
    if (!archiveConfirmation || !businessId) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await archiveOwnedOffer(businessId, archiveConfirmation.id);
      setOffers((currentOffers) => (
        currentOffers.filter((item) => item.id !== archiveConfirmation.id)
      ));
      setArchiveConfirmation(null);
      await loadData();
    } catch (error) {
      const uiError = toCommercialUiError(error);
      setErrorMessage(uiError.message);
      setArchiveConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    archiveConfirmation,
    businessId,
    loadData,
  ]);

  const defaultCatalogId = (
    catalogIdParam
    || catalogs[0]?.id
    || ''
  );

  const selectedCatalog = useMemo(() => (
    catalogIdParam
      ? catalogs.find((catalog) => catalog.id === catalogIdParam) || null
      : null
  ), [catalogIdParam, catalogs]);

  const activeOfferKind = editor?.offerKind
    || defaultOfferKindForBusiness(businessOfferType);

  const availableModalities = useMemo(() => (
    getModalitiesForOfferKind(activeOfferKind)
  ), [activeOfferKind]);

  const screenTitle = useMemo(() => {
    if (businessOfferType === 'products') {
      return 'Productos';
    }
    if (businessOfferType === 'services') {
      return 'Servicios';
    }
    return 'Productos y servicios';
  }, [businessOfferType]);

  const createActionLabel = useMemo(() => {
    if (businessOfferType === 'products') {
      return 'Crear producto';
    }
    if (businessOfferType === 'services') {
      return 'Crear servicio';
    }
    return 'Crear producto o servicio';
  }, [businessOfferType]);

  const openNewOfferModal = useCallback(() => {
    setEditorError(null);
    setSelectedImages([]);
    setEditor(
      createOfferEditor(
        defaultCatalogId,
        businessOfferType,
        enabledModalities,
      ),
    );
  }, [
    businessOfferType,
    defaultCatalogId,
    enabledModalities,
  ]);

  const closeEditor = useCallback(() => {
    if (isSaving) {
      return;
    }

    setEditor(null);
    setEditorError(null);
    setSelectedImages([]);
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

  const selectOfferImages = useCallback(async () => {
    if (isSaving) {
      return;
    }

    const availableSlots = getCommercialOfferImageSlotsRemaining(
      selectedImages.length,
    );

    if (availableSlots === 0) {
      setEditorError(
        'Cada producto o servicio permite máximo 5 imágenes.',
      );
      return;
    }

    setEditorError(null);

    const permission = await withExternalActivity(() => (
      ImagePicker.requestMediaLibraryPermissionsAsync()
    ));

    if (!permission.granted) {
      setEditorError(
        'Necesitamos permiso para seleccionar imágenes.',
      );
      return;
    }

    const result = await withExternalActivity(() => (
      ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        selectionLimit: availableSlots,
      })
    ));

    if (result.canceled) {
      return;
    }

    try {
      const nextImages = result.assets
        .slice(0, availableSlots)
        .map(localCommercialOfferImageFromPicker);

      nextImages.forEach(validateLocalCommercialOfferImage);

      const mergedImages = [
        ...selectedImages,
        ...nextImages,
      ];

      ensureCommercialOfferImageCount(mergedImages.length);
      setSelectedImages(mergedImages);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible preparar las imágenes seleccionadas.';

      setEditorError(message);
    }
  }, [
    isSaving,
    selectedImages,
  ]);

  const removeSelectedOfferImage = useCallback((
    imageIndex: number,
  ) => {
    if (isSaving) {
      return;
    }

    setSelectedImages((currentImages) => (
      currentImages.filter((_, index) => index !== imageIndex)
    ));
  }, [isSaving]);

  const moveSelectedOfferImage = useCallback((
    fromIndex: number,
    toIndex: number,
  ) => {
    if (isSaving) {
      return;
    }

    setSelectedImages((currentImages) => (
      moveCommercialOfferImage(
        currentImages,
        fromIndex,
        toIndex,
      )
    ));
  }, [isSaving]);

  const saveOffer = useCallback(async () => {
    if (!editor || !businessId) {
      return;
    }

    const itemNoun = editor.offerKind === 'product'
      ? 'el producto'
      : 'el servicio';

    const normalizedTitle = editor.title.trim();
    const normalizedDescription = (
      editor.description.trim() || null
    );
    const requiresAmount = (
      editor.pricingStrategy === 'fixed'
      || editor.pricingStrategy === 'starting_at'
    );
    const parsedNormalAmount = editor.basePriceAmount.trim()
      ? Number(normalizeDigits(editor.basePriceAmount))
      : null;
    const parsedDiscountPercent = (
      requiresAmount
      && editor.hasDiscount
      && editor.discountPercent.trim()
    )
      ? Number(normalizeDigits(editor.discountPercent))
      : null;
    const parsedDiscountedAmount = (
      requiresAmount
      && editor.hasDiscount
      && editor.discountedPriceAmount.trim()
    )
      ? Number(normalizeDigits(editor.discountedPriceAmount))
      : null;
    const parsedStockQuantity = editor.stockQuantity.trim()
      ? Number(normalizeDigits(editor.stockQuantity))
      : null;
    const parsedDurationMinutes = editor.durationMinutes.trim()
      ? Number(normalizeDigits(editor.durationMinutes))
      : null;

    if (!normalizedTitle) {
      setEditorError(`Escribe el nombre d${itemNoun}.`);
      return;
    }

    if (
      requiresAmount
      && (
        parsedNormalAmount === null
        || !Number.isInteger(parsedNormalAmount)
        || parsedNormalAmount < 1
      )
    ) {
      setEditorError(
        'Ingresa un precio válido mínimo de $1.',
      );
      return;
    }

    if (requiresAmount && editor.hasDiscount) {
      if (
        parsedDiscountPercent === null
        || parsedDiscountPercent < 1
        || parsedDiscountPercent > 99
      ) {
        setEditorError(
          'El porcentaje de descuento debe estar entre 1% y 99%.',
        );
        return;
      }

      if (
        parsedDiscountedAmount === null
        || parsedDiscountedAmount < 1
        || (parsedNormalAmount !== null && parsedDiscountedAmount >= parsedNormalAmount)
      ) {
        setEditorError(
          'El precio con descuento debe ser menor al precio normal y mínimo de $1.',
        );
        return;
      }
    }

    if (editor.modalities.length === 0) {
      setEditorError(
        `Selecciona al menos una modalidad disponible para ${itemNoun}.`,
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
        || parsedDurationMinutes < 15
        || parsedDurationMinutes > 1440
      )
    ) {
      setEditorError(
        'El servicio reservable requiere duración entre 15 y 1440 minutos.',
      );
      return;
    }

    setIsSaving(true);
    setEditorError(null);

    try {
      let targetCatalogId = (
        editor.catalogId
        || catalogIdParam
        || catalogs[0]?.id
        || ''
      );

      if (!targetCatalogId) {
        setCreationProgress('Preparando catálogo del negocio…');
        const defaultCatalogName = businessOfferType === 'products'
          ? 'Productos'
          : businessOfferType === 'services'
            ? 'Servicios'
            : 'Catálogo principal';

        const createdCatalogResponse = await createOwnedCatalog(
          businessId,
          {
            name: defaultCatalogName,
            description: null,
            status: 'published',
          },
        );
        targetCatalogId = createdCatalogResponse.catalog.id;
      }

      setCreationProgress(
        editor.offerKind === 'product'
          ? 'Creando producto…'
          : 'Creando servicio…',
      );

      const finalBasePriceAmount = requiresAmount
        ? (
          editor.hasDiscount
            ? parsedDiscountedAmount
            : parsedNormalAmount
        )
        : null;

      const finalOriginalPriceAmount = (
        requiresAmount && editor.hasDiscount
      )
        ? parsedNormalAmount
        : null;

      const finalDiscountPercent = (
        requiresAmount && editor.hasDiscount
      )
        ? parsedDiscountPercent
        : null;

      const createResponse = await createOwnedOffer(
        businessId,
        {
          catalog_id: targetCatalogId,
          offer_kind: editor.offerKind,
          title: normalizedTitle,
          description: normalizedDescription,
          pricing_strategy: editor.pricingStrategy,
          base_price_amount: finalBasePriceAmount,
          original_price_amount: finalOriginalPriceAmount,
          discount_percent: finalDiscountPercent,
          currency_code: 'COP',
          is_available: true,
          sort_order: 0,
          status: 'published',
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

      const createdOffer = createResponse.offer;

      if (selectedImages.length > 0) {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
          await loadData();
          closeEditor();
          const recoveryNotice = (
            'Se guardó correctamente, pero tu sesión expiró antes '
            + 'de subir las fotos. Complétalas desde esta pantalla.'
          );

          router.push({
            pathname: (
              '/(main)/beeservices/manage/[businessId]/offers/[offerId]'
            ),
            params: {
              businessId,
              notice: recoveryNotice,
              offerId: createdOffer.id,
            },
          });

          return;
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

          try {
            setCreationProgress(
              `Subiendo foto ${imageIndex + 1} de ${selectedImages.length}…`,
            );

            const uploadedFile = await uploadCommercialOfferImageFile(
              credentials,
              selectedImage,
            );

            setCreationProgress(
              `Guardando foto ${imageIndex + 1} de ${selectedImages.length}…`,
            );

            await createOwnedOfferImage(
              businessId,
              createdOffer.id,
              {
                file_id: uploadedFile.id,
                is_primary: imageIndex === 0,
                sort_order: imageIndex,
              },
            );
          } catch (imageError) {
            const imageUiError = toCommercialUiError(imageError);

            await loadData();
            closeEditor();
            const recoveryNotice = (
              `Se creó correctamente, pero no se pudo guardar `
              + `la foto ${imageIndex + 1}. `
              + `${imageUiError.message} `
              + 'Puedes completar las fotos desde esta pantalla.'
            );

            router.push({
              pathname: (
                '/(main)/beeservices/manage/[businessId]/offers/[offerId]'
              ),
              params: {
                businessId,
                notice: recoveryNotice,
                offerId: createdOffer.id,
              },
            });

            return;
          }
        }
      }

      setCreationProgress(
        'Actualizando listado…',
      );

      closeEditor();
      await loadData();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setEditorError(uiError.message);
    } finally {
      setCreationProgress(null);
      setIsSaving(false);
    }
  }, [
    businessId,
    businessOfferType,
    catalogIdParam,
    catalogs,
    closeEditor,
    editor,
    loadData,
    router,
    selectedImages,
  ]);

  const activeEditor = editor;
  const activeKindLabel = activeEditor?.offerKind === 'service'
    ? 'servicio'
    : 'producto';
  const activeModalTitle = activeEditor?.offerKind === 'service'
    ? 'Crear servicio'
    : 'Crear producto';

  const previewNormalPrice = activeEditor?.basePriceAmount
    ? Number(normalizeDigits(activeEditor.basePriceAmount))
    : 0;
  const previewDiscountedPrice = activeEditor?.discountedPriceAmount
    ? Number(normalizeDigits(activeEditor.discountedPriceAmount))
    : 0;
  const previewDiscountPercent = activeEditor?.discountPercent
    ? Number(normalizeDigits(activeEditor.discountPercent))
    : 0;
  const previewSavings = (
    previewNormalPrice > 0
    && previewDiscountedPrice > 0
    && previewNormalPrice > previewDiscountedPrice
  )
    ? previewNormalPrice - previewDiscountedPrice
    : 0;

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
        {router.canGoBack ? (
          <TouchableOpacity
            accessibilityLabel="Volver"
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
        ) : (
          <View style={{ width: 42 }} />
        )}

        <View
          style={{
            alignItems: 'center',
            flex: 1,
            paddingHorizontal: 12,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: '#261743',
              fontSize: 18,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            {screenTitle}
          </Text>

          {selectedCatalog ? (
            <Text
              numberOfLines={1}
              style={{
                color: '#786593',
                fontSize: 12,
                marginTop: 2,
                textAlign: 'center',
              }}
            >
              {selectedCatalog.name}
            </Text>
          ) : null}
        </View>

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
            Cargando {screenTitle.toLowerCase()}…
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
            No fue posible cargar la información
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
            accessibilityLabel="Reintentar"
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
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 120,
            paddingHorizontal: 18,
            paddingTop: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#2A1B47',
              borderRadius: 22,
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 18,
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
                  color: '#FFFFFF',
                  fontSize: 17,
                  fontWeight: '900',
                }}
              >
                {businessOfferType === 'products'
                  ? 'Catálogo de productos'
                  : businessOfferType === 'services'
                    ? 'Portafolio de servicios'
                    : 'Productos y servicios'}
              </Text>

              <Text
                style={{
                  color: '#DCC8FF',
                  fontSize: 13,
                  lineHeight: 19,
                  marginTop: 5,
                }}
              >
                Agrega fotos, precios, descuentos, descripción y modalidades disponibles para tus clientes.
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel={createActionLabel}
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={openNewOfferModal}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 14,
                flexDirection: 'row',
                minHeight: 42,
                paddingHorizontal: 13,
                paddingVertical: 10,
              }}
            >
              <Plus color="#FFFFFF" size={17} />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: '800',
                  marginLeft: 5,
                }}
              >
                {businessOfferType === 'products'
                  ? 'Nuevo producto'
                  : businessOfferType === 'services'
                    ? 'Nuevo servicio'
                    : 'Crear'}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 14,
            }}
          >
            <Text
              style={{
                color: '#6A5883',
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {offers.length === 1
                ? '1 registrado'
                : `${offers.length} registrados`}
            </Text>

            <TouchableOpacity
              accessibilityLabel="Ver productos y servicios archivados"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={isSaving}
              onPress={() => {
                router.push(
                  buddyServicesManageArchivedOffersRoute(
                    businessId,
                  ),
                );
              }}
              style={{
                alignItems: 'center',
                backgroundColor: '#F4EDF9',
                borderRadius: 12,
                flexDirection: 'row',
                minHeight: 36,
                opacity: isSaving ? 0.55 : 1,
                paddingHorizontal: 12,
              }}
            >
              <ArchiveRestore
                color="#7427D5"
                size={15}
              />

              <Text
                style={{
                  color: '#7427D5',
                  fontSize: 12,
                  fontWeight: '800',
                  marginLeft: 6,
                }}
              >
                Archivados
              </Text>
            </TouchableOpacity>
          </View>

          {offers.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderColor: '#E7DDF2',
                borderRadius: 22,
                borderWidth: 1,
                marginTop: 18,
                paddingHorizontal: 26,
                paddingVertical: 42,
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
                <PackagePlus
                  color="#7427D5"
                  size={28}
                />
              </View>

              <Text
                style={{
                  color: '#261743',
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 15,
                  textAlign: 'center',
                }}
              >
                {businessOfferType === 'products'
                  ? 'Aún no tienes productos'
                  : businessOfferType === 'services'
                    ? 'Aún no tienes servicios'
                    : 'Aún no tienes productos ni servicios'}
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 13,
                  lineHeight: 20,
                  marginTop: 7,
                  textAlign: 'center',
                }}
              >
                Crea el primero con sus imágenes, precio, descuento opcional, descripción y modalidad disponible.
              </Text>

              <TouchableOpacity
                accessibilityLabel={createActionLabel}
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={openNewOfferModal}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#7427D5',
                  borderRadius: 14,
                  flexDirection: 'row',
                  marginTop: 20,
                  minHeight: 46,
                  paddingHorizontal: 18,
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
                  {createActionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                marginTop: 16,
              }}
            >
              {offers.map((offer) => {
                const statusCopy = offerStatusCopy(offer);
                const coverUrl = getOfferPrimaryImageUrl(offer);
                const hasOfferDiscount = (
                  offer.original_price_amount !== null
                  && offer.original_price_amount !== undefined
                  && offer.base_price_amount !== null
                  && offer.original_price_amount > offer.base_price_amount
                );
                const discountPct = hasOfferDiscount
                  ? (
                    offer.discount_percent
                    || Math.round(
                      (1 - (offer.base_price_amount! / offer.original_price_amount!)) * 100,
                    )
                  )
                  : null;
                const activeModalities = offer.modalities
                  .filter((item) => item.status !== 'archived')
                  .map((item) => item.modality);

                return (
                  <TouchableOpacity
                    accessibilityHint="Abre la vista previa de este producto o servicio como lo verían los clientes"
                    accessibilityLabel={`Ver ${offer.title}`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={offer.id}
                    onPress={() => {
                      router.push(
                        buddyServicesPublicOfferRoute(offer.id, {
                          businessId,
                          fromManage: true,
                        }),
                      );
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E7DDF2',
                      borderRadius: 18,
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
                      {coverUrl ? (
                        <Image
                          source={{ uri: coverUrl }}
                          style={{
                            backgroundColor: '#F6EAFE',
                            borderRadius: 13,
                            height: 58,
                            width: 58,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            alignItems: 'center',
                            backgroundColor: '#F6EAFE',
                            borderRadius: 13,
                            height: 58,
                            justifyContent: 'center',
                            width: 58,
                          }}
                        >
                          {offer.offer_kind === 'product' ? (
                            <Box
                              color="#7427D5"
                              size={24}
                            />
                          ) : (
                            <BriefcaseBusiness
                              color="#7427D5"
                              size={24}
                            />
                          )}
                        </View>
                      )}

                      <View
                        style={{
                          flex: 1,
                          marginLeft: 13,
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
                              color: '#7427D5',
                              fontSize: 11,
                              fontWeight: '800',
                              textTransform: 'uppercase',
                            }}
                          >
                            {offer.offer_kind === 'product'
                              ? 'Producto'
                              : 'Servicio'}
                          </Text>

                          <View
                            style={{
                              alignItems: 'center',
                              flexDirection: 'row',
                              gap: 10,
                            }}
                          >
                            <Text
                              style={{
                                color: statusCopy.color,
                                fontSize: 11,
                                fontWeight: '800',
                              }}
                            >
                              {statusCopy.label}
                            </Text>

                            <TouchableOpacity
                              accessibilityLabel={`Eliminar ${offer.title}`}
                              accessibilityRole="button"
                              activeOpacity={0.82}
                              disabled={deleteOfferFlow.deleting}
                              hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                              onPress={() => {
                                deleteOfferFlow.reset();
                                void deleteOfferFlow.requestDelete(offer);
                              }}
                              style={{
                                alignItems: 'center',
                                backgroundColor: '#FEF2F2',
                                borderColor: '#FECACA',
                                borderRadius: 9,
                                borderWidth: 1,
                                height: 28,
                                justifyContent: 'center',
                                width: 28,
                              }}
                            >
                              <Trash2
                                color="#DC2626"
                                size={14}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text
                          numberOfLines={2}
                          style={{
                            color: '#261743',
                            fontSize: 16,
                            fontWeight: '800',
                            marginTop: 3,
                          }}
                        >
                          {offer.title}
                        </Text>

                        {offer.description ? (
                          <Text
                            numberOfLines={2}
                            style={{
                              color: '#786593',
                              fontSize: 12,
                              lineHeight: 17,
                              marginTop: 4,
                            }}
                          >
                            {offer.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      {hasOfferDiscount ? (
                        <>
                          <Text
                            style={{
                              color: '#9C8AB4',
                              fontSize: 13,
                              fontWeight: '700',
                              textDecorationLine: 'line-through',
                            }}
                          >
                            {formatMoney(offer.original_price_amount)}
                          </Text>

                          <Text
                            style={{
                              color: '#177245',
                              fontSize: 16,
                              fontWeight: '900',
                            }}
                          >
                            {offer.pricing_strategy === 'starting_at'
                              ? `Desde ${formatMoney(offer.base_price_amount)}`
                              : formatMoney(offer.base_price_amount)}
                          </Text>

                          {discountPct ? (
                            <View
                              style={{
                                backgroundColor: '#E8F7EE',
                                borderColor: '#B8E5C8',
                                borderRadius: 99,
                                borderWidth: 1,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                              }}
                            >
                              <Text
                                style={{
                                  color: '#177245',
                                  fontSize: 11,
                                  fontWeight: '900',
                                }}
                              >
                                -{discountPct}% OFF
                              </Text>
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <Text
                          style={{
                            color: '#3D245E',
                            fontSize: 15,
                            fontWeight: '900',
                          }}
                        >
                          {offer.pricing_strategy === 'free'
                            ? 'Gratis'
                            : offer.pricing_strategy === 'to_be_confirmed'
                              ? 'Requiere cotización'
                              : offer.pricing_strategy === 'starting_at'
                                ? `Desde ${formatMoney(offer.base_price_amount)}`
                                : formatMoney(offer.base_price_amount)}
                        </Text>
                      )}
                    </View>

                    {activeModalities.length > 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginTop: 10,
                        }}
                      >
                        {activeModalities.map((modality) => (
                          <View
                            key={modality}
                            style={{
                              backgroundColor: '#F4EDFC',
                              borderRadius: 99,
                              paddingHorizontal: 9,
                              paddingVertical: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: '#54209E',
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              {getModalityLabel(modality)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <TouchableOpacity
                      accessibilityLabel={`Archivar ${offer.title}`}
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={isSaving}
                      onPress={() => {
                        setArchiveConfirmation(offer);
                      }}
                      style={{
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        marginTop: 12,
                        opacity: isSaving ? 0.55 : 1,
                      }}
                    >
                      <Archive color="#B42318" size={15} />
                      <Text
                        style={{
                          color: '#B42318',
                          fontSize: 12,
                          fontWeight: '800',
                          marginLeft: 6,
                        }}
                      >
                        Archivar
                      </Text>
                    </TouchableOpacity>
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
            backgroundColor: 'rgba(38, 23, 67, 0.45)',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFCF9',
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              maxHeight: '92%',
            }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingBottom: 34,
                paddingHorizontal: 18,
                paddingTop: 18,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 20,
                      fontWeight: '900',
                    }}
                  >
                    {activeModalTitle}
                  </Text>
                  <Text
                    style={{
                      color: '#786593',
                      fontSize: 12,
                      marginTop: 3,
                    }}
                  >
                    Completa las fotos, el precio, la descripción y las modalidades disponibles.
                  </Text>
                </View>

                <TouchableOpacity
                  accessibilityLabel="Cerrar formulario"
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
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                  style={{
                    backgroundColor: '#FFF0F0',
                    borderColor: '#F7B2B2',
                    borderRadius: 13,
                    borderWidth: 1,
                    marginTop: 14,
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

              {businessOfferType === 'mixed' ? (
                <>
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 14,
                      fontWeight: '800',
                      marginTop: 18,
                    }}
                  >
                    ¿Qué deseas crear?
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
                            const allowedForKind = getModalitiesForOfferKind(
                              option.value,
                            ).map((item) => item.value);

                            setEditor((currentEditor) => (
                              currentEditor
                                ? {
                                  ...currentEditor,
                                  offerKind: option.value,
                                  durationMinutes: '',
                                  requiresBooking: false,
                                  stockQuantity: '',
                                  trackInventory: false,
                                  modalities: currentEditor.modalities.filter(
                                    (mod) => allowedForKind.includes(mod),
                                  ),
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
                            paddingHorizontal: 15,
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
                </>
              ) : null}

              {/* SECCIÓN 1: IMÁGENES */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E7DDF2',
                  borderRadius: 18,
                  borderWidth: 1,
                  marginTop: 18,
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
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text
                      style={{
                        color: '#261743',
                        fontSize: 14,
                        fontWeight: '800',
                      }}
                    >
                      Imágenes d{activeKindLabel === 'servicio' ? 'el servicio' : 'el producto'}
                    </Text>

                    <Text
                      style={{
                        color: '#786593',
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      {selectedImages.length}/5 fotos seleccionadas. La primera será la portada.
                    </Text>
                  </View>

                  <TouchableOpacity
                    accessibilityLabel="Agregar fotos"
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving || selectedImages.length >= 5}
                    onPress={() => {
                      void selectOfferImages();
                    }}
                    style={{
                      alignItems: 'center',
                      backgroundColor: '#F4EDFC',
                      borderColor: '#C9A8E8',
                      borderRadius: 12,
                      borderWidth: 1,
                      flexDirection: 'row',
                      minHeight: 38,
                      opacity: (
                        isSaving || selectedImages.length >= 5
                      )
                        ? 0.55
                        : 1,
                      paddingHorizontal: 12,
                    }}
                  >
                    <ImagePlus
                      color="#54209E"
                      size={17}
                    />

                    <Text
                      style={{
                        color: '#54209E',
                        fontSize: 12,
                        fontWeight: '800',
                        marginLeft: 6,
                      }}
                    >
                      Subir fotos
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedImages.length > 0 ? (
                  <ScrollView
                    contentContainerStyle={{
                      gap: 10,
                      paddingTop: 12,
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {selectedImages.map((image, index) => (
                      <View
                        key={`${image.uri}-${index}`}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderColor: index === 0
                            ? '#7427D5'
                            : '#E7DDF2',
                          borderRadius: 14,
                          borderWidth: index === 0 ? 2 : 1,
                          overflow: 'hidden',
                          width: 132,
                        }}
                      >
                        <Image
                          source={{ uri: image.uri }}
                          style={{
                            backgroundColor: '#F6EAFE',
                            height: 94,
                            width: 128,
                          }}
                        />

                        <View
                          style={{
                            padding: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: index === 0
                                ? '#54209E'
                                : '#786593',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {index === 0
                              ? 'Portada'
                              : `Foto ${index + 1}`}
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
                              accessibilityLabel={`Mover foto ${index + 1} a la izquierda`}
                              accessibilityRole="button"
                              activeOpacity={0.82}
                              disabled={isSaving || index === 0}
                              onPress={() => {
                                moveSelectedOfferImage(
                                  index,
                                  index - 1,
                                );
                              }}
                              style={{
                                opacity: (
                                  isSaving || index === 0
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
                              accessibilityLabel={`Eliminar foto ${index + 1}`}
                              accessibilityRole="button"
                              activeOpacity={0.82}
                              disabled={isSaving}
                              onPress={() => {
                                removeSelectedOfferImage(index);
                              }}
                              style={{
                                padding: 3,
                              }}
                            >
                              <Trash2
                                color="#B42318"
                                size={17}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              accessibilityLabel={`Mover foto ${index + 1} a la derecha`}
                              accessibilityRole="button"
                              activeOpacity={0.82}
                              disabled={
                                isSaving
                                || index === selectedImages.length - 1
                              }
                              onPress={() => {
                                moveSelectedOfferImage(
                                  index,
                                  index + 1,
                                );
                              }}
                              style={{
                                opacity: (
                                  isSaving
                                  || index === selectedImages.length - 1
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
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              {/* SECCIÓN 2: NOMBRE Y DESCRIPCIÓN */}
              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '800',
                  marginTop: 18,
                }}
              >
                Nombre d{activeKindLabel === 'servicio' ? 'el servicio' : 'el producto'}
              </Text>

              <TextInput
                accessibilityLabel={`Nombre del ${activeKindLabel}`}
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
                placeholder={
                  activeKindLabel === 'servicio'
                    ? 'Ej. Corte de cabello + barba'
                    : 'Ej. Camiseta deportiva talla M'
                }
                placeholderTextColor="#A692B7"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCCBEE',
                  borderRadius: 13,
                  borderWidth: 1,
                  color: '#261743',
                  fontSize: 14,
                  marginTop: 8,
                  minHeight: 48,
                  paddingHorizontal: 13,
                }}
                value={editor?.title || ''}
              />

              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '800',
                  marginTop: 16,
                }}
              >
                Descripción d{activeKindLabel === 'servicio' ? 'el servicio' : 'el producto'}
              </Text>

              <TextInput
                accessibilityLabel={`Descripción del ${activeKindLabel}`}
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
                placeholder={
                  activeKindLabel === 'servicio'
                    ? 'Explica qué incluye el servicio, recomendaciones o detalles para el cliente…'
                    : 'Describe las características, materiales, presentación o detalles del producto…'
                }
                placeholderTextColor="#A692B7"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCCBEE',
                  borderRadius: 13,
                  borderWidth: 1,
                  color: '#261743',
                  fontSize: 14,
                  lineHeight: 20,
                  marginTop: 8,
                  minHeight: 88,
                  paddingHorizontal: 13,
                  paddingTop: 12,
                  textAlignVertical: 'top',
                }}
                value={editor?.description || ''}
              />

              {/* SECCIÓN 3: PRECIO Y DESCUENTO */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E7DDF2',
                  borderRadius: 18,
                  borderWidth: 1,
                  marginTop: 18,
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
                  Precio
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 10,
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
                                hasDiscount: (
                                  option.value === 'free'
                                  || option.value === 'to_be_confirmed'
                                    ? false
                                    : currentEditor.hasDiscount
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
                  <>
                    <Text
                      style={{
                        color: '#4E3B68',
                        fontSize: 12,
                        fontWeight: '700',
                        marginTop: 14,
                      }}
                    >
                      {editor.hasDiscount
                        ? 'Precio normal (antes del descuento)'
                        : 'Valor en pesos colombianos ($ COP)'}
                    </Text>

                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        marginTop: 7,
                      }}
                    >
                      <TouchableOpacity
                        accessibilityLabel="Restar mil pesos"
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setEditor((currentEditor) => {
                            if (!currentEditor) {
                              return currentEditor;
                            }

                            const nextValue = Math.max(
                              1000,
                              toSafeInteger(
                                currentEditor.basePriceAmount,
                                0,
                              ) - 1000,
                            );
                            const nextNormalStr = String(nextValue);

                            return {
                              ...currentEditor,
                              basePriceAmount: nextNormalStr,
                              discountedPriceAmount: currentEditor.hasDiscount
                                ? calculateDiscountedPrice(
                                  nextNormalStr,
                                  currentEditor.discountPercent,
                                )
                                : currentEditor.discountedPriceAmount,
                            };
                          });
                        }}
                        style={{
                          alignItems: 'center',
                          backgroundColor: '#F4EDFC',
                          borderColor: '#DCCBEE',
                          borderRadius: 14,
                          borderWidth: 1,
                          height: 46,
                          justifyContent: 'center',
                          opacity: isSaving ? 0.55 : 1,
                          width: 46,
                        }}
                      >
                        <Text
                          style={{
                            color: '#54209E',
                            fontSize: 22,
                            fontWeight: '800',
                          }}
                        >
                          −
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        accessibilityLabel="Precio normal en pesos colombianos"
                        editable={!isSaving}
                        keyboardType="number-pad"
                        onChangeText={(value) => {
                          const normalized = normalizePriceInput(value);
                          setEditor((currentEditor) => {
                            if (!currentEditor) {
                              return currentEditor;
                            }

                            return {
                              ...currentEditor,
                              basePriceAmount: normalized,
                              discountedPriceAmount: currentEditor.hasDiscount
                                ? calculateDiscountedPrice(
                                  normalized,
                                  currentEditor.discountPercent,
                                )
                                : currentEditor.discountedPriceAmount,
                            };
                          });
                        }}
                        placeholder="Ej. 50.000"
                        placeholderTextColor="#A692B7"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#DCCBEE',
                          borderRadius: 12,
                          borderWidth: 1,
                          color: '#261743',
                          flex: 1,
                          fontSize: 15,
                          fontWeight: '800',
                          height: 46,
                          paddingHorizontal: 13,
                          textAlign: 'center',
                        }}
                        value={formatPriceInput(editor?.basePriceAmount || '')}
                      />

                      <TouchableOpacity
                        accessibilityLabel="Sumar mil pesos"
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setEditor((currentEditor) => {
                            if (!currentEditor) {
                              return currentEditor;
                            }

                            const nextNormalStr = String(
                              toSafeInteger(
                                currentEditor.basePriceAmount,
                                0,
                              ) + 1000,
                            );

                            return {
                              ...currentEditor,
                              basePriceAmount: nextNormalStr,
                              discountedPriceAmount: currentEditor.hasDiscount
                                ? calculateDiscountedPrice(
                                  nextNormalStr,
                                  currentEditor.discountPercent,
                                )
                                : currentEditor.discountedPriceAmount,
                            };
                          });
                        }}
                        style={{
                          alignItems: 'center',
                          backgroundColor: '#F4EDFC',
                          borderColor: '#DCCBEE',
                          borderRadius: 14,
                          borderWidth: 1,
                          height: 46,
                          justifyContent: 'center',
                          opacity: isSaving ? 0.55 : 1,
                          width: 46,
                        }}
                      >
                        <Text
                          style={{
                            color: '#54209E',
                            fontSize: 22,
                            fontWeight: '800',
                          }}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* INTERRUPTOR DE DESCUENTO */}
                    <View
                      style={{
                        alignItems: 'center',
                        borderTopColor: '#F0E8F8',
                        borderTopWidth: 1,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 15,
                        paddingTop: 13,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{
                            color: '#261743',
                            fontSize: 14,
                            fontWeight: '800',
                          }}
                        >
                          ¿Tiene descuento?
                        </Text>
                        <Text
                          style={{
                            color: '#786593',
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          Muestra el precio anterior tachado y el porcentaje de ahorro.
                        </Text>
                      </View>

                      <Switch
                        accessibilityLabel="Aplicar descuento al precio"
                        disabled={isSaving}
                        onValueChange={(enabled) => {
                          setEditor((currentEditor) => {
                            if (!currentEditor) {
                              return currentEditor;
                            }

                            const defaultPct = currentEditor.discountPercent || '10';
                            const nextDiscounted = enabled
                              ? calculateDiscountedPrice(
                                currentEditor.basePriceAmount,
                                defaultPct,
                              )
                              : '';

                            return {
                              ...currentEditor,
                              hasDiscount: enabled,
                              discountPercent: defaultPct,
                              discountedPriceAmount: nextDiscounted,
                            };
                          });
                        }}
                        value={editor.hasDiscount}
                      />
                    </View>

                    {editor.hasDiscount ? (
                      <View
                        style={{
                          backgroundColor: '#FAF6FF',
                          borderColor: '#E2D2F7',
                          borderRadius: 14,
                          borderWidth: 1,
                          marginTop: 12,
                          padding: 13,
                        }}
                      >
                        <Text
                          style={{
                            color: '#4E3B68',
                            fontSize: 12,
                            fontWeight: '800',
                          }}
                        >
                          Porcentaje rápido
                        </Text>

                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 7,
                            marginTop: 8,
                          }}
                        >
                          {QUICK_DISCOUNT_PRESETS.map((preset) => {
                            const isSelected = (
                              Number(editor.discountPercent) === preset
                            );

                            return (
                              <TouchableOpacity
                                key={preset}
                                activeOpacity={0.8}
                                disabled={isSaving}
                                onPress={() => {
                                  const pctStr = String(preset);
                                  setEditor((currentEditor) => {
                                    if (!currentEditor) {
                                      return currentEditor;
                                    }

                                    return {
                                      ...currentEditor,
                                      discountPercent: pctStr,
                                      discountedPriceAmount: calculateDiscountedPrice(
                                        currentEditor.basePriceAmount,
                                        pctStr,
                                      ),
                                    };
                                  });
                                }}
                                style={{
                                  backgroundColor: isSelected
                                    ? '#7427D5'
                                    : '#FFFFFF',
                                  borderColor: isSelected
                                    ? '#7427D5'
                                    : '#D6C4EC',
                                  borderRadius: 99,
                                  borderWidth: 1,
                                  paddingHorizontal: 11,
                                  paddingVertical: 6,
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
                                  {preset}% OFF
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 10,
                            marginTop: 12,
                          }}
                        >
                          <View style={{ width: 110 }}>
                            <Text
                              style={{
                                color: '#4E3B68',
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              Descuento (%)
                            </Text>
                            <View
                              style={{
                                alignItems: 'center',
                                backgroundColor: '#FFFFFF',
                                borderColor: '#DCCBEE',
                                borderRadius: 12,
                                borderWidth: 1,
                                flexDirection: 'row',
                                height: 46,
                                marginTop: 6,
                                paddingHorizontal: 10,
                              }}
                            >
                              <TextInput
                                accessibilityLabel="Porcentaje de descuento"
                                editable={!isSaving}
                                keyboardType="number-pad"
                                maxLength={2}
                                onChangeText={(value) => {
                                  const pctStr = normalizeDigits(value);
                                  setEditor((currentEditor) => {
                                    if (!currentEditor) {
                                      return currentEditor;
                                    }

                                    return {
                                      ...currentEditor,
                                      discountPercent: pctStr,
                                      discountedPriceAmount: calculateDiscountedPrice(
                                        currentEditor.basePriceAmount,
                                        pctStr,
                                      ),
                                    };
                                  });
                                }}
                                placeholder="10"
                                placeholderTextColor="#A692B7"
                                style={{
                                  color: '#261743',
                                  flex: 1,
                                  fontSize: 15,
                                  fontWeight: '800',
                                  textAlign: 'center',
                                }}
                                value={editor.discountPercent}
                              />
                              <Percent color="#7427D5" size={15} />
                            </View>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: '#4E3B68',
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              Precio final con descuento
                            </Text>
                            <TextInput
                              accessibilityLabel="Precio final con descuento"
                              editable={!isSaving}
                              keyboardType="number-pad"
                              onChangeText={(value) => {
                                const discountedStr = normalizePriceInput(value);
                                setEditor((currentEditor) => {
                                  if (!currentEditor) {
                                    return currentEditor;
                                  }

                                  const nextPct = calculateDiscountPercent(
                                    currentEditor.basePriceAmount,
                                    discountedStr,
                                  );

                                  return {
                                    ...currentEditor,
                                    discountedPriceAmount: discountedStr,
                                    discountPercent: nextPct || currentEditor.discountPercent,
                                  };
                                });
                              }}
                              placeholder="Ej. 40.000"
                              placeholderTextColor="#A692B7"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#DCCBEE',
                                borderRadius: 12,
                                borderWidth: 1,
                                color: '#177245',
                                fontSize: 15,
                                fontWeight: '800',
                                height: 46,
                                marginTop: 6,
                                paddingHorizontal: 12,
                                textAlign: 'center',
                              }}
                              value={formatPriceInput(
                                editor.discountedPriceAmount,
                              )}
                            />
                          </View>
                        </View>

                        {previewNormalPrice > 0 && previewDiscountedPrice > 0 ? (
                          <View
                            style={{
                              alignItems: 'center',
                              backgroundColor: '#E8F7EE',
                              borderColor: '#BCE5CA',
                              borderRadius: 11,
                              borderWidth: 1,
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              marginTop: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                            }}
                          >
                            <View
                              style={{
                                alignItems: 'center',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 7,
                              }}
                            >
                              <Text
                                style={{
                                  color: '#6E7F75',
                                  fontSize: 12,
                                  fontWeight: '700',
                                  textDecorationLine: 'line-through',
                                }}
                              >
                                {formatMoney(previewNormalPrice)}
                              </Text>
                              <Text
                                style={{
                                  color: '#177245',
                                  fontSize: 15,
                                  fontWeight: '900',
                                }}
                              >
                                {formatMoney(previewDiscountedPrice)}
                              </Text>
                              {previewDiscountPercent > 0 ? (
                                <Text
                                  style={{
                                    color: '#177245',
                                    fontSize: 11,
                                    fontWeight: '900',
                                  }}
                                >
                                  ({previewDiscountPercent}% OFF)
                                </Text>
                              ) : null}
                            </View>

                            {previewSavings > 0 ? (
                              <Text
                                style={{
                                  color: '#177245',
                                  fontSize: 11,
                                  fontWeight: '800',
                                }}
                              >
                                Ahorro: {formatMoney(previewSavings)}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>

              {/* SECCIÓN 4: MODALIDAD DISPONIBLE */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E7DDF2',
                  borderRadius: 18,
                  borderWidth: 1,
                  marginTop: 18,
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
                  Modalidad disponible
                </Text>

                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  Selecciona cómo entregas o prestas este {activeKindLabel}.
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 11,
                  }}
                >
                  {availableModalities.map((option) => {
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
              </View>

              {/* SECCIÓN 5: OPCIONES AVANZADAS COLAPSABLES */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E7DDF2',
                  borderRadius: 18,
                  borderWidth: 1,
                  marginTop: 16,
                  padding: 15,
                }}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={() => {
                    setEditor((currentEditor) => (
                      currentEditor
                        ? {
                          ...currentEditor,
                          showAdvancedOptions: !currentEditor.showAdvancedOptions,
                        }
                        : currentEditor
                    ));
                  }}
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text
                      style={{
                        color: '#261743',
                        fontSize: 14,
                        fontWeight: '800',
                      }}
                    >
                      {editor?.offerKind === 'product'
                        ? 'Inventario y stock (opcional)'
                        : 'Reservas y condiciones de pago (opcional)'}
                    </Text>
                    <Text
                      style={{
                        color: '#786593',
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {editor?.offerKind === 'product'
                        ? 'Actívalo si deseas limitar las unidades disponibles.'
                        : 'Configura si requiere agendar cita o anticipo.'}
                    </Text>
                  </View>

                  {editor?.showAdvancedOptions ? (
                    <ChevronUp color="#54209E" size={20} />
                  ) : (
                    <ChevronDown color="#54209E" size={20} />
                  )}
                </TouchableOpacity>

                {editor?.showAdvancedOptions ? (
                  <View style={{ marginTop: 14 }}>
                    {editor.offerKind === 'product' ? (
                      <>
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
                              fontSize: 13,
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
                                      ? String(
                                        Math.max(
                                          0,
                                          toSafeInteger(
                                            currentEditor.stockQuantity,
                                            0,
                                          ),
                                        ),
                                      )
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
                          <View
                            style={{
                              alignItems: 'center',
                              flexDirection: 'row',
                              gap: 8,
                              marginTop: 10,
                            }}
                          >
                            <TextInput
                              accessibilityLabel="Cantidad de inventario"
                              editable={!isSaving}
                              keyboardType="number-pad"
                              onChangeText={(value) => {
                                setEditor((currentEditor) => (
                                  currentEditor
                                    ? {
                                      ...currentEditor,
                                      stockQuantity: normalizeDigits(value),
                                    }
                                    : currentEditor
                                ));
                              }}
                              placeholder="Cantidad disponible (ej. 10)"
                              placeholderTextColor="#A692B7"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#DCCBEE',
                                borderRadius: 12,
                                borderWidth: 1,
                                color: '#261743',
                                flex: 1,
                                fontSize: 15,
                                fontWeight: '800',
                                height: 46,
                                paddingHorizontal: 13,
                              }}
                              value={activeEditor?.stockQuantity || ''}
                            />
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <>
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
                              fontSize: 13,
                              fontWeight: '800',
                            }}
                          >
                            Requiere agendar reserva
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
                                      ? String(
                                        Math.max(
                                          15,
                                          toSafeInteger(
                                            currentEditor.durationMinutes,
                                            30,
                                          ),
                                        ),
                                      )
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
                          <View style={{ marginTop: 10 }}>
                            <Text
                              style={{
                                color: '#4E3B68',
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              Duración aproximada (minutos)
                            </Text>
                            <TextInput
                              accessibilityLabel="Duración en minutos"
                              editable={!isSaving}
                              keyboardType="number-pad"
                              onChangeText={(value) => {
                                setEditor((currentEditor) => (
                                  currentEditor
                                    ? {
                                      ...currentEditor,
                                      durationMinutes: normalizeDigits(value),
                                    }
                                    : currentEditor
                                ));
                              }}
                              placeholder="Ej. 30"
                              placeholderTextColor="#A692B7"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#DCCBEE',
                                borderRadius: 12,
                                borderWidth: 1,
                                color: '#261743',
                                fontSize: 15,
                                fontWeight: '800',
                                height: 46,
                                marginTop: 6,
                                paddingHorizontal: 13,
                              }}
                              value={activeEditor?.durationMinutes || ''}
                            />
                          </View>
                        ) : null}

                        <Text
                          style={{
                            color: '#261743',
                            fontSize: 13,
                            fontWeight: '800',
                            marginTop: 14,
                          }}
                        >
                          Condición de pago
                        </Text>

                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginTop: 8,
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
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                accessibilityLabel={activeModalTitle}
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSaving,
                  disabled: isSaving,
                }}
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
                  marginTop: 22,
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
                    : activeModalTitle}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(creationProgress)}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(38, 23, 67, 0.54)',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={{
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 330,
              paddingHorizontal: 24,
              paddingVertical: 26,
              width: '100%',
            }}
          >
            <ActivityIndicator
              color="#7427D5"
              size="large"
            />

            <Text
              style={{
                color: '#261743',
                fontSize: 17,
                fontWeight: '900',
                marginTop: 17,
                textAlign: 'center',
              }}
            >
              Guardando
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
              {creationProgress}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            setArchiveConfirmation(null);
          }
        }}
        transparent
        visible={Boolean(archiveConfirmation)}
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
              {archiveConfirmation?.offer_kind === 'service'
                ? 'Archivar servicio'
                : 'Archivar producto'}
            </Text>
            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 9,
              }}
            >
              Dejará de estar disponible para tus clientes. Podrás verlo después en Archivados.
            </Text>
            <Text
              style={{
                color: '#4E3B68',
                fontSize: 13,
                fontWeight: '700',
                marginTop: 13,
              }}
            >
              {archiveConfirmation?.title || ''}
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
                accessibilityLabel="Cancelar archivo"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  setArchiveConfirmation(null);
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
                accessibilityLabel="Confirmar archivo"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void archiveOffer();
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#B42318',
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
                  {isSaving ? 'Archivando…' : 'Archivar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
