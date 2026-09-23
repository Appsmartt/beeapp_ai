import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Check,
  Package,
  Wrench,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';
import type {
  CommercialCatalog,
  CommercialOfferImage,
  CommercialOwnedOffer,
} from '@beeapp/shared-types';

import {
  loadOwnedCommercialCatalogs,
  loadOwnedCommercialOffers,
} from '../../services/commercialService';

export interface SelectedCommercialOfferImage {
  commercialOfferId: string;
  commercialOfferImageId: string;
  offerTitle: string;
  offerKind: 'product' | 'service';
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
}

interface ProductLinkSelectorProps {
  visible: boolean;
  businessId: string;
  selectedOfferImageId?: string | null;
  onSelect: (selection: SelectedCommercialOfferImage) => void;
  onClose: () => void;
}

type AvailableOffer = CommercialOwnedOffer & {
  activeImages: Array<CommercialOfferImage & { url: string }>;
};

function formatCop(
  amount: number | null,
): string {
  if (amount === null) {
    return 'Precio por confirmar';
  }

  return new Intl.NumberFormat(
    'es-CO',
    {
      currency: 'COP',
      maximumFractionDigits: 0,
      style: 'currency',
    },
  ).format(amount);
}

function getOfferPriceLabel(
  offer: CommercialOwnedOffer,
): string {
  if (offer.pricing_strategy === 'free') {
    return 'Gratis';
  }

  if (offer.pricing_strategy === 'to_be_confirmed') {
    return 'Precio por confirmar';
  }

  const amount = formatCop(offer.base_price_amount);

  return offer.pricing_strategy === 'starting_at'
    ? `Desde ${amount}`
    : amount;
}

export default function ProductLinkSelector({
  visible,
  businessId,
  selectedOfferImageId = null,
  onSelect,
  onClose,
}: ProductLinkSelectorProps) {
  const [catalogs, setCatalogs] = useState<CommercialCatalog[]>([]);
  const [offers, setOffers] = useState<CommercialOwnedOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    selectedOfferImageId,
  );

  useEffect(() => {
    if (!visible || !businessId) {
      return;
    }

    let cancelled = false;

    const loadOptions = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          catalogsResponse,
          offersResponse,
        ] = await Promise.all([
          loadOwnedCommercialCatalogs(businessId),
          loadOwnedCommercialOffers(businessId),
        ]);

        if (cancelled) {
          return;
        }

        setCatalogs(catalogsResponse.catalogs);
        setOffers(offersResponse.offers);
        setSelectedOfferId(null);
        setSelectedImageId(selectedOfferImageId);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible cargar los productos y servicios.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [
    businessId,
    selectedOfferImageId,
    visible,
  ]);

  const publishedCatalogIds = useMemo(
    () => new Set(
      catalogs
        .filter((catalog) => catalog.status === 'published')
        .map((catalog) => catalog.id),
    ),
    [catalogs],
  );

  const availableOffers = useMemo<AvailableOffer[]>(
    () => offers.flatMap((offer) => {
      if (
        offer.status !== 'published'
        || !offer.is_available
        || !publishedCatalogIds.has(offer.catalog_id)
      ) {
        return [];
      }

      const activeImages = offer.images
        .flatMap((image) => (
          image.status !== 'archived'
          && typeof image.url === 'string'
          && Boolean(image.url.trim())
            ? [{
                ...image,
                url: image.url.trim(),
              }]
            : []
        ))
        .sort((firstImage, secondImage) => {
          if (firstImage.is_primary !== secondImage.is_primary) {
            return firstImage.is_primary ? -1 : 1;
          }

          return (
            (firstImage.sort_order ?? Number.MAX_SAFE_INTEGER)
            - (secondImage.sort_order ?? Number.MAX_SAFE_INTEGER)
          );
        });

      return [{
        ...offer,
        activeImages,
      }];
    }),
    [
      offers,
      publishedCatalogIds,
    ],
  );

  const selectedOffer = availableOffers.find(
    (offer) => offer.id === selectedOfferId,
  ) || null;

  const selectedImage = selectedOffer?.activeImages.find(
    (image) => image.id === selectedImageId,
  ) || null;

  const handleOfferPress = (offer: AvailableOffer) => {
    if (offer.activeImages.length === 0) {
      Alert.alert(
        'Foto requerida',
        'Este producto o servicio necesita al menos una foto activa para publicarse en un estado.',
      );
      return;
    }

    setSelectedOfferId(offer.id);
    setSelectedImageId(
      offer.activeImages.some(
        (image) => image.id === selectedOfferImageId,
      )
        ? selectedOfferImageId
        : offer.activeImages[0].id,
    );
  };

  const handleConfirm = () => {
    if (!selectedOffer || !selectedImage) {
      return;
    }

    onSelect({
      commercialOfferId: selectedOffer.id,
      commercialOfferImageId: selectedImage.id,
      offerTitle: selectedOffer.title,
      offerKind: selectedOffer.offer_kind,
      uri: selectedImage.url,
      name: selectedImage.display_name
        || `${selectedOffer.title}.jpg`,
      mimeType: selectedImage.mime_type || 'image/jpeg',
      sizeBytes: null,
    });
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.sheet}>
          <Text style={styles.title}>
            Producto o servicio
          </Text>
          <Text style={styles.subtitle}>
            Elige una oferta activa y después la foto que aparecerá en tu estado.
          </Text>

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
              />
              <Text style={styles.stateText}>
                Cargando catálogo...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : !selectedOffer ? (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {availableOffers.length === 0 ? (
                <Text style={styles.emptyText}>
                  No tienes productos o servicios activos en catálogos publicados.
                </Text>
              ) : availableOffers.map((offer) => {
                const Icon = offer.offer_kind === 'product'
                  ? Package
                  : Wrench;

                return (
                  <TouchableOpacity
                    key={offer.id}
                    style={styles.offerRow}
                    onPress={() => handleOfferPress(offer)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconCircle}>
                      <Icon
                        size={18}
                        color={colors.brand.primary}
                      />
                    </View>

                    <View style={styles.offerCopy}>
                      <Text
                        style={styles.offerTitle}
                        numberOfLines={1}
                      >
                        {offer.title}
                      </Text>
                      <Text style={styles.offerDetail}>
                        {offer.offer_kind === 'product'
                          ? 'Producto'
                          : 'Servicio'} · {getOfferPriceLabel(offer)}
                      </Text>
                      <Text style={styles.offerImages}>
                        {offer.activeImages.length > 0
                          ? `${offer.activeImages.length} foto${offer.activeImages.length === 1 ? '' : 's'} disponibles`
                          : 'Sin fotos activas'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <>
              <View style={styles.selectedOfferHeader}>
                <Text
                  style={styles.selectedOfferTitle}
                  numberOfLines={1}
                >
                  {selectedOffer.title}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedOfferId(null);
                    setSelectedImageId(selectedOfferImageId);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeOfferText}>
                    Cambiar
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.imageGrid}
                showsVerticalScrollIndicator={false}
              >
                {selectedOffer.activeImages.map((image) => {
                  const isSelected = image.id === selectedImageId;

                  return (
                    <TouchableOpacity
                      key={image.id}
                      style={[
                        styles.imageOption,
                        isSelected && styles.imageOptionSelected,
                      ]}
                      onPress={() => setSelectedImageId(image.id)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: image.url }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      {isSelected ? (
                        <View style={styles.selectedMark}>
                          <Check
                            size={16}
                            color={colors.neutral.white}
                          />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedOffer || !selectedImage || loading)
                && styles.confirmButtonDisabled,
            ]}
            disabled={!selectedOffer || !selectedImage || loading}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              Usar en el estado
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '84%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    paddingHorizontal: spacing.md,
  },
  stateText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    marginTop: 10,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  offerRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.primary}18`,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  offerCopy: {
    flex: 1,
    gap: 2,
  },
  offerTitle: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '700',
  },
  offerDetail: {
    color: colors.neutral.gray600,
    fontSize: 12,
  },
  offerImages: {
    color: colors.neutral.gray500,
    fontSize: 11,
  },
  selectedOfferHeader: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  selectedOfferTitle: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    paddingRight: spacing.sm,
  },
  changeOfferText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: spacing.md,
  },
  imageOption: {
    borderColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 2,
    height: 104,
    overflow: 'hidden',
    position: 'relative',
    width: 104,
  },
  imageOptionSelected: {
    borderColor: colors.brand.primary,
  },
  imagePreview: {
    height: '100%',
    width: '100%',
  },
  selectedMark: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    marginTop: spacing.md,
    paddingVertical: 14,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  confirmButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
