import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Star, Truck, ShoppingCart, CreditCard, ShieldCheck } from 'lucide-react-native';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import DetailGallery from '../../../src/components/beeservices/DetailGallery';
import SellerCard from '../../../src/components/beeservices/SellerCard';
import { formatPrice, getCategory, getListing, getSeller } from '../../../src/mocks/beeservices';

/**
 * Product detail: gallery, variants, seller and the buy actions.
 * The cart and the order flow arrive in a later phase (buttons are visual).
 */
export default function BeeProductScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const product = getListing(String(params.id ?? ''));
  const seller = product ? getSeller(product.sellerId) : undefined;
  const category = product ? getCategory(product.categoryId) : undefined;

  // Selected option of each variant group (first one by default)
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product?.variants?.forEach((group) => {
      initial[group.id] = group.options[0];
    });
    return initial;
  });

  if (!product || !seller) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Producto</Text>
          <View style={{ width: 32 }} />
        </View>
        <Text style={styles.missing}>Esta publicación ya no está disponible.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Detalle del producto
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <DetailGallery tones={product.photoTones} categoryId={product.categoryId} />

          <View style={styles.body}>
            <View style={styles.tagRow}>
              <View style={styles.kindTag}>
                <Text style={styles.kindTagText}>Producto</Text>
              </View>
              {!!category && (
                <View style={[styles.categoryTag, { backgroundColor: category.bg }]}>
                  <Text style={[styles.categoryTagText, { color: category.color }]}>{category.name}</Text>
                </View>
              )}
              {!!product.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{product.badge}</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{product.name}</Text>

            <View style={styles.ratingRow}>
              <Star size={13} color="#D97706" fill="#D97706" />
              <Text style={styles.ratingText}>
                {product.rating.toFixed(1)} · {product.reviews} opiniones
              </Text>
            </View>

            <Text style={styles.price}>{formatPrice(product.price ?? 0)}</Text>
            <Text style={styles.priceNote}>Precio en pesos colombianos. El pago se acuerda con el vendedor.</Text>

            {/* Variants */}
            {product.variants?.map((group) => (
              <View key={group.id} style={styles.variantGroup}>
                <Text style={styles.variantLabel}>{group.label}</Text>
                <View style={styles.variantOptions}>
                  {group.options.map((option) => {
                    const active = variantChoice[group.id] === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.variantChip, active && styles.variantChipActive]}
                        onPress={() => setVariantChoice({ ...variantChoice, [group.id]: option })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.variantChipText, active && styles.variantChipTextActive]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.deliveryRow}>
              <Truck size={14} color={colors.neutral.gray600} />
              <Text style={styles.deliveryText}>{product.delivery}</Text>
            </View>

            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{product.description}</Text>

            <SellerCard
              seller={seller}
              label="Vendedor"
              onPress={() =>
                router.push({ pathname: '/(main)/beeservices/seller', params: { id: seller.id } })
              }
            />

            <View style={styles.noteRow}>
              <ShieldCheck size={13} color={colors.neutral.gray600} />
              <Text style={styles.noteText}>
                BeeServices no procesa pagos: al confirmar un pedido se notifica al vendedor y el pago se
                acuerda por chat.
              </Text>
            </View>
          </View>

          <View style={{ height: router.embedded ? 110 : 190 }} />
        </ScrollView>

        {/* Buy actions: visual only in this phase */}
        <View style={[styles.actionBar, !router.embedded && styles.actionBarStandalone]}>
          <TouchableOpacity style={styles.cartBtn} activeOpacity={0.85}>
            <ShoppingCart size={17} color={colors.brand.primary} />
            <Text style={styles.cartBtnText}>Agregar al carrito</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyBtn} activeOpacity={0.85}>
            <CreditCard size={17} color={colors.neutral.white} />
            <Text style={styles.buyBtnText}>Comprar</Text>
          </TouchableOpacity>
        </View>

        {!router.embedded && <FloatingTabBar />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  missing: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: 40,
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  kindTag: {
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kindTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E88E5',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  categoryTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryTagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.neutral.text,
    marginTop: 10,
    lineHeight: 25,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brand.primary,
    marginTop: 12,
  },
  priceNote: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.neutral.gray500,
    marginTop: 3,
  },
  variantGroup: {
    marginTop: 16,
  },
  variantLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  variantChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#F9F5FF',
  },
  variantChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  variantChipTextActive: {
    color: colors.brand.primary,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deliveryText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
    marginTop: 18,
    marginBottom: 6,
  },
  description: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.neutral.gray700,
    lineHeight: 19,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.neutral.gray600,
    lineHeight: 15,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  // Full screen: sits above the floating menu instead of behind it
  actionBarStandalone: {
    bottom: 96,
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  cartBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
  },
  buyBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.neutral.white,
  },
});
