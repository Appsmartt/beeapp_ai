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
  ShoppingCart,
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
    offer.images.find((image) => image.is_primary)?.url
    || offer.images[0]?.url
    || null
  );
}

export default function CommercialOfferCard({
  offer,
  onPress,
  onQuickAddToCart,
}: CommercialOfferCardProps) {
  const imageUrl = getPrimaryImage(offer);
  const isProduct = offer.offer_kind === 'product';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityLabel={
          `Ver ${getOfferKindLabel(offer)} ${offer.title}`
        }
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={() => onPress(offer)}
        style={styles.cardMainAction}
      >
        <View style={styles.imageBox}>
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

        <View style={styles.content}>
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
            style={styles.title}
          >
            {offer.title}
          </Text>

          {offer.description ? (
            <Text
              numberOfLines={2}
              style={styles.description}
            >
              {offer.description}
            </Text>
          ) : null}

          <Text style={styles.price}>
            {getPriceLabel(offer)}
          </Text>
        </View>
      </TouchableOpacity>

      {isProduct && onQuickAddToCart ? (
        <TouchableOpacity
          accessibilityLabel={`Agregar ${offer.title} al carrito`}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => onQuickAddToCart(offer)}
          style={styles.quickAddButton}
        >
          <ShoppingCart
            color="#7427D5"
            size={19}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.chevronBox}>
          <ChevronRight
            color="#8A72B2"
            size={21}
          />
        </View>
      )}
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
  cardMainAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
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
  image: {
    height: '100%',
    width: '100%',
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
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
  description: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  price: {
    color: '#6527AA',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 7,
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
});
