import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Star, Store, SearchX } from 'lucide-react-native';
import { BeeListing, formatPrice, getCategory, getSeller } from '../../mocks/beeservices';
import MockPhoto from './MockPhoto';

interface ListingGridProps {
  items: BeeListing[];
  onPressItem: (item: BeeListing) => void;
}

/**
 * Two-column catalogue. Card width is a percentage so the grid keeps its two
 * columns inside the narrower embedded container of the Home.
 */
export default function ListingGrid({ items, onPressItem }: ListingGridProps) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <SearchX size={26} color={colors.neutral.gray500} />
        </View>
        <Text style={styles.emptyTitle}>Sin resultados</Text>
        <Text style={styles.emptyDesc}>
          Prueba con otra categoría o cambia las palabras de tu búsqueda.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const seller = getSeller(item.sellerId);
        const category = getCategory(item.categoryId);
        const isService = item.kind === 'service';
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => onPressItem(item)}
            activeOpacity={0.85}
          >
            <View>
              <MockPhoto
                tone={item.photoTones[0]}
                categoryId={item.categoryId}
                iconSize={28}
                style={styles.photo}
              />
              <View style={[styles.kindTag, isService && styles.kindTagService]}>
                <Text style={[styles.kindTagText, isService && styles.kindTagTextService]}>
                  {isService ? 'Servicio' : 'Producto'}
                </Text>
              </View>
            </View>

            <View style={styles.body}>
              <Text style={styles.category} numberOfLines={1}>
                {category?.name}
              </Text>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>

              <View style={styles.sellerRow}>
                <Store size={11} color={colors.neutral.gray500} />
                <Text style={styles.sellerName} numberOfLines={1}>
                  {seller?.name}
                </Text>
              </View>

              {isService ? (
                <Text style={styles.quote}>Solicitar cotización</Text>
              ) : (
                <Text style={styles.price}>{formatPrice(item.price ?? 0)}</Text>
              )}

              <View style={styles.ratingRow}>
                <Star size={10} color="#D97706" fill="#D97706" />
                <Text style={styles.ratingText}>
                  {item.rating.toFixed(1)} ({item.reviews})
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    rowGap: 12,
  },
  card: {
    // Percentage keeps exactly 2 columns both full screen and embedded in Home
    width: '48.5%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  photo: {
    height: 92,
    width: '100%',
  },
  kindTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  kindTagService: {
    backgroundColor: '#F3E8FF',
  },
  kindTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1E88E5',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kindTagTextService: {
    color: colors.brand.primary,
  },
  body: {
    padding: 10,
  },
  category: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.neutral.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.neutral.text,
    marginTop: 3,
    lineHeight: 16,
    minHeight: 32,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  sellerName: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
    marginTop: 8,
  },
  quote: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brand.primary,
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 16,
  },
});
