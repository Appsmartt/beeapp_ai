import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  ChevronRight,
  Package,
  Wrench,
} from 'lucide-react-native';

import type {
  CommercialPublicOffer,
} from '@beeapp/shared-types';

interface CommercialOfferCardProps {
  offer: CommercialPublicOffer;
  onPress: (
    offer: CommercialPublicOffer,
  ) => void;
  onQuickAddToCart?: (
    offer: CommercialPublicOffer,
  ) => void;
  variant?: 'grid' | 'list';
}

function formatCop(
  amount: number | null,
): string {
  if (amount === null) {
    return '';
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

function getPriceLabel(
  offer: CommercialPublicOffer,
): string {
  if (offer.pricing_strategy === 'free') {
    return 'Gratis';
  }

  if (offer.pricing_strategy === 'to_be_confirmed') {
    return 'Precio por confirmar';
  }

  const amount = formatCop(offer.base_price_amount);

  if (offer.pricing_strategy === 'starting_at') {
    return amount
      ? `Desde ${amount}`
      : 'Precio desde por confirmar';
  }

  return amount || 'Precio por confirmar';
}

function getOfferKindLabel(
  offer: CommercialPublicOffer,
): string {
  if (offer.offer_kind === 'product') {
    return 'Producto';
  }

  return offer.requires_booking
    ? 'Servicio con reserva'
    : 'Servicio';
}

function getPrimaryImage(
  offer: CommercialPublicOffer,
): string | null {
  return (
    offer.images.find(
      (image) => image.is_primary && Boolean(image.url),
    )?.url
    || offer.images.find((image) => Boolean(image.url))?.url
    || null
  );
}

export default function CommercialOfferCard({
  offer,
  onPress,
  onQuickAddToCart,
  variant = 'list',
}: CommercialOfferCardProps) {
  const imageUrl = getPrimaryImage(offer);
  const isGrid = variant === 'grid';
  const isProduct = offer.offer_kind === 'product';
  const hasDiscount = Boolean(
    offer.original_price_amount !== null
    && offer.original_price_amount !== undefined
    && offer.base_price_amount !== null
    && offer.original_price_amount > offer.base_price_amount,
  );
  const discountPercent = hasDiscount && offer.original_price_amount
    ? (
      offer.discount_percent ?? Math.round(
        ((offer.original_price_amount - offer.base_price_amount!)
          / offer.original_price_amount) * 100,
      )
    )
    : null;

  return (
    <View style={[
      styles.card,
      isGrid && styles.cardGrid,
    ]}>
      <TouchableOpacity
        accessibilityLabel={
          `Ver ${getOfferKindLabel(offer)} ${offer.title}`
        }
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={() => onPress(offer)}
        style={[
          styles.cardMainAction,
          isGrid && styles.cardMainActionGrid,
        ]}
      >
        <View style={[
          styles.imageBox,
          isGrid && styles.imageBoxGrid,
        ]}>
          {imageUrl ? (
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={{
                uri: imageUrl,
              }}
              style={styles.image}
            />
          ) : (
            isProduct ? (
              <Package
                color="#7B2DD9"
                size={26}
              />
            ) : (
              <Wrench
                color="#7B2DD9"
                size={26}
              />
            )
          )}
        </View>

        <View style={[
          styles.content,
          isGrid && styles.contentGrid,
        ]}>
          <View style={styles.topRow}>
            <Text
              numberOfLines={1}
              style={styles.kind}
            >
              {getOfferKindLabel(offer)}
            </Text>

            {offer.requires_booking ? (
              <CalendarDays
                color="#7642AE"
                size={15}
              />
            ) : null}
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.title,
              isGrid && styles.titleGrid,
            ]}
          >
            {offer.title}
          </Text>

          {offer.description ? (
            <Text
              numberOfLines={isGrid ? 1 : 2}
              style={[
                styles.description,
                isGrid && styles.descriptionGrid,
              ]}
            >
              {offer.description}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            {hasDiscount && offer.original_price_amount !== undefined ? (
              <Text
                style={[
                  styles.originalPrice,
                  isGrid && styles.originalPriceGrid,
                ]}
              >
                {formatCop(offer.original_price_amount)}
              </Text>
            ) : null}

            <Text style={[
              styles.price,
              isGrid && styles.priceGrid,
            ]}>
              {getPriceLabel(offer)}
            </Text>

            {hasDiscount && discountPercent ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  -{discountPercent}%
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {!isGrid && isProduct && onQuickAddToCart ? (
        <TouchableOpacity
          accessibilityLabel={`Agregar ${offer.title} al carrito`}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => onQuickAddToCart(offer)}
          style={styles.quickAddButton}
        >
          <Text style={styles.quickAddText}>
            +
          </Text>
        </TouchableOpacity>
      ) : !isGrid ? (
        <View style={styles.chevronBox}>
          <ChevronRight
            color="#8A72B2"
            size={21}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 11,
    minHeight: 112,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardGrid: {
    alignItems: 'stretch',
    marginBottom: 12,
    minHeight: 0,
    padding: 0,
    width: '48.5%',
  },
  cardMainAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  cardMainActionGrid: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  chevronBox: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  imageBox: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 14,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  imageBoxGrid: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    height: 132,
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
  },
  contentGrid: {
    marginHorizontal: 0,
    minHeight: 116,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  kind: {
    color: '#7A579D',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#2D2141',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 3,
  },
  titleGrid: {
    fontSize: 13,
    lineHeight: 17,
  },
  description: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  descriptionGrid: {
    fontSize: 11,
    lineHeight: 15,
  },
  priceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 7,
  },
  originalPrice: {
    color: '#9C8AB4',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  originalPriceGrid: {
    fontSize: 10,
  },
  price: {
    color: '#6527AA',
    fontSize: 13,
    fontWeight: '800',
  },
  priceGrid: {
    fontSize: 12,
  },
  discountBadge: {
    backgroundColor: '#E8F7EE',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: '#177245',
    fontSize: 10,
    fontWeight: '900',
  },
  quickAddButton: {
    alignItems: 'center',
    backgroundColor: '#F4EAFE',
    borderColor: '#DEC7F0',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quickAddText: {
    color: '#7427D5',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 26,
    marginTop: -2,
  },
});
