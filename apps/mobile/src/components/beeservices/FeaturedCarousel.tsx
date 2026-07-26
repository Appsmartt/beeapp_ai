import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import { Sparkles, Star } from 'lucide-react-native';
import { BeeListing, formatPrice, getSeller } from '../../mocks/beeservices';
import MockPhoto from './MockPhoto';

interface FeaturedCarouselProps {
  items: BeeListing[];
  onPressItem: (item: BeeListing) => void;
}

const GAP = 12;

/**
 * Promoted products and services. Slide width is measured from the container
 * so it fits both full screen and the narrower embedded card in Home.
 */
export default function FeaturedCarousel({ items, onPressItem }: FeaturedCarouselProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const slideWidth = width > 0 ? width - 32 : 0;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth <= 0) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / (slideWidth + GAP)));
  };

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={styles.titleRow}>
        <Sparkles size={14} color={colors.brand.primary} />
        <Text style={styles.title}>Destacados</Text>
      </View>

      {slideWidth > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={slideWidth + GAP}
          contentContainerStyle={styles.scroll}
          onScroll={onScroll}
          scrollEventThrottle={32}
        >
          {items.map((item) => {
            const seller = getSeller(item.sellerId);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.slide, { width: slideWidth }]}
                onPress={() => onPressItem(item)}
                activeOpacity={0.85}
              >
                <MockPhoto
                  tone={item.photoTones[0]}
                  categoryId={item.categoryId}
                  iconSize={38}
                  style={styles.photo}
                />
                <View style={styles.info}>
                  <View style={styles.kindRow}>
                    <View style={[styles.kindTag, item.kind === 'service' && styles.kindTagService]}>
                      <Text style={[styles.kindTagText, item.kind === 'service' && styles.kindTagTextService]}>
                        {item.kind === 'product' ? 'Producto' : 'Servicio'}
                      </Text>
                    </View>
                    {!!item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.seller} numberOfLines={1}>
                    {seller?.name}
                  </Text>
                  <View style={styles.bottomRow}>
                    <Text style={styles.price}>
                      {item.kind === 'product' ? formatPrice(item.price ?? 0) : 'Solicitar cotización'}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Star size={11} color="#D97706" fill="#D97706" />
                      <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.dots}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: GAP,
  },
  slide: {
    borderRadius: 18,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  photo: {
    height: 108,
    width: '100%',
  },
  info: {
    padding: 12,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kindTag: {
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  kindTagService: {
    backgroundColor: '#F3E8FF',
  },
  kindTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E88E5',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kindTagTextService: {
    color: colors.brand.primary,
  },
  badge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  seller: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral.gray300,
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
    width: 16,
  },
});
