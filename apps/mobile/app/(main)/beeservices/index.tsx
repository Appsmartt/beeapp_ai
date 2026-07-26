import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors } from '@beeapp/design-system';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import BeeServicesHeader from '../../../src/components/beeservices/BeeServicesHeader';
import FeaturedCarousel from '../../../src/components/beeservices/FeaturedCarousel';
import { KindTabs, CategoryRow, KindFilter } from '../../../src/components/beeservices/MarketFilters';
import ListingGrid from '../../../src/components/beeservices/ListingGrid';
import { BEE_LISTINGS, BeeListing, getFeatured, getSeller } from '../../../src/mocks/beeservices';

/**
 * BeeServices marketplace: promoted slider, categories, product/service tabs
 * and the catalogue. Browsing only — cart, orders and quotes come later.
 */
export default function BeeServicesScreen() {
  const router = useModuleNav();

  const [searchQuery, setSearchQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Search matches name, description and seller name
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BEE_LISTINGS;
    return BEE_LISTINGS.filter((item) => {
      const seller = getSeller(item.sellerId);
      return (
        item.name.toLowerCase().includes(q) ||
        item.shortDesc.toLowerCase().includes(q) ||
        (seller?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  const byCategory = useMemo(
    () => (categoryId ? searched.filter((i) => i.categoryId === categoryId) : searched),
    [searched, categoryId]
  );

  const counts = useMemo(
    () => ({
      all: byCategory.length,
      product: byCategory.filter((i) => i.kind === 'product').length,
      service: byCategory.filter((i) => i.kind === 'service').length,
    }),
    [byCategory]
  );

  const visible = kind === 'all' ? byCategory : byCategory.filter((i) => i.kind === kind);

  const openListing = (item: BeeListing) => {
    router.push({
      pathname: item.kind === 'product' ? '/(main)/beeservices/product' : '/(main)/beeservices/service',
      params: { id: item.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <BeeServicesHeader
          onBack={router.canGoBack ? () => router.back() : undefined}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Promoted products and services */}
          {!searchQuery && <FeaturedCarousel items={getFeatured()} onPressItem={openListing} />}

          <CategoryRow value={categoryId} onChange={setCategoryId} />

          <KindTabs value={kind} onChange={setKind} counts={counts} />

          <View style={styles.resultRow}>
            <Text style={styles.resultText}>
              {visible.length} {visible.length === 1 ? 'publicación' : 'publicaciones'}
            </Text>
            <Text style={styles.resultHint}>Los servicios se cotizan por chat</Text>
          </View>

          <ListingGrid items={visible} onPressItem={openListing} />

          <View style={{ height: 140 }} />
        </ScrollView>

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
  scroll: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  resultHint: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.neutral.gray500,
  },
});
