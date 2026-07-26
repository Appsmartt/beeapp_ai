import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Star, MapPin, MessageCircle, Package, Handshake, CalendarDays } from 'lucide-react-native';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ListingGrid from '../../../src/components/beeservices/ListingGrid';
import { BeeListing, getCategory, getSeller, getSellerListings } from '../../../src/mocks/beeservices';

/** Public seller profile inside BeeServices: who they are and what they publish. */
export default function BeeSellerScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const seller = getSeller(String(params.id ?? ''));
  const category = seller ? getCategory(seller.categoryId) : undefined;
  const listings = seller ? getSellerListings(seller.id) : [];
  const products = listings.filter((l) => l.kind === 'product');
  const services = listings.filter((l) => l.kind === 'service');

  const openListing = (item: BeeListing) => {
    router.push({
      pathname: item.kind === 'product' ? '/(main)/beeservices/product' : '/(main)/beeservices/service',
      params: { id: item.id },
    });
  };

  if (!seller) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendedor</Text>
          <View style={{ width: 32 }} />
        </View>
        <Text style={styles.missing}>Este perfil ya no está disponible.</Text>
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
            Perfil del vendedor
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: `${seller.color}1A` }]}>
              <Text style={[styles.avatarText, { color: seller.color }]}>{seller.initials}</Text>
            </View>
            <Text style={styles.name}>{seller.name}</Text>
            <Text style={styles.headline}>{seller.headline}</Text>

            <View style={styles.tagRow}>
              {!!category && (
                <View style={[styles.categoryTag, { backgroundColor: category.bg }]}>
                  <Text style={[styles.categoryTagText, { color: category.color }]}>{category.name}</Text>
                </View>
              )}
              <View style={styles.cityTag}>
                <MapPin size={11} color={colors.neutral.gray600} />
                <Text style={styles.cityTagText}>{seller.city}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <View style={styles.statValueRow}>
                  <Star size={13} color="#D97706" fill="#D97706" />
                  <Text style={styles.statValue}>{seller.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.statLabel}>{seller.reviews} opiniones</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{seller.sales}</Text>
                <Text style={styles.statLabel}>ventas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <View style={styles.statValueRow}>
                  <CalendarDays size={13} color={colors.neutral.gray600} />
                  <Text style={styles.statValueSmall}>{seller.memberSince}</Text>
                </View>
                <Text style={styles.statLabel}>en BeeServices</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.contactBtn} activeOpacity={0.85}>
              <MessageCircle size={16} color={colors.neutral.white} />
              <Text style={styles.contactBtnText}>Contactar por chat</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <Text style={styles.sectionTitle}>Sobre el vendedor</Text>
          <Text style={styles.description}>{seller.description}</Text>

          {/* Catalogue */}
          {products.length > 0 && (
            <>
              <View style={styles.groupHeader}>
                <Package size={14} color={colors.neutral.gray700} />
                <Text style={styles.groupHeaderText}>
                  Productos ({products.length})
                </Text>
              </View>
              <ListingGrid items={products} onPressItem={openListing} />
            </>
          )}

          {services.length > 0 && (
            <>
              <View style={styles.groupHeader}>
                <Handshake size={14} color={colors.neutral.gray700} />
                <Text style={styles.groupHeaderText}>
                  Servicios ({services.length})
                </Text>
              </View>
              <ListingGrid items={services} onPressItem={openListing} />
            </>
          )}

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
  profileCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    margin: 16,
    padding: 18,
    alignItems: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  headline: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 3,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  categoryTag: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  cityTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
    paddingTop: 14,
    width: '100%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  statValueSmall: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 3,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.neutral.gray100,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
    width: '100%',
  },
  contactBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  description: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.neutral.gray700,
    lineHeight: 19,
    marginHorizontal: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginTop: 20,
  },
  groupHeaderText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.neutral.text,
  },
});
