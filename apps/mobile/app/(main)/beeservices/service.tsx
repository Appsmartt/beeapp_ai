import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Star, MapPin, MessageCircle, FileText, Clock } from 'lucide-react-native';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import DetailGallery from '../../../src/components/beeservices/DetailGallery';
import SellerCard from '../../../src/components/beeservices/SellerCard';
import { getCategory, getListing, getSeller } from '../../../src/mocks/beeservices';

/**
 * Service detail: no price and no cart. The interested user contacts the
 * provider by chat to agree on a quote (wired up in a later phase).
 */
export default function BeeServiceScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const service = getListing(String(params.id ?? ''));
  const provider = service ? getSeller(service.sellerId) : undefined;
  const category = service ? getCategory(service.categoryId) : undefined;

  if (!service || !provider) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Servicio</Text>
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
            Detalle del servicio
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <DetailGallery tones={service.photoTones} categoryId={service.categoryId} />

          <View style={styles.body}>
            <View style={styles.tagRow}>
              <View style={styles.kindTag}>
                <Text style={styles.kindTagText}>Servicio</Text>
              </View>
              {!!category && (
                <View style={[styles.categoryTag, { backgroundColor: category.bg }]}>
                  <Text style={[styles.categoryTagText, { color: category.color }]}>{category.name}</Text>
                </View>
              )}
              {!!service.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{service.badge}</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{service.name}</Text>

            <View style={styles.ratingRow}>
              <Star size={13} color="#D97706" fill="#D97706" />
              <Text style={styles.ratingText}>
                {service.rating.toFixed(1)} · {service.reviews} opiniones
              </Text>
            </View>

            {/* No closed price: services are quoted */}
            <View style={styles.quoteCard}>
              <FileText size={16} color={colors.brand.primary} />
              <View style={styles.quoteCol}>
                <Text style={styles.quoteTitle}>Cotización a medida</Text>
                <Text style={styles.quoteDesc}>{service.quoteHint}</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Clock size={14} color={colors.neutral.gray600} />
                <Text style={styles.metaText}>{service.delivery}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <MapPin size={14} color={colors.neutral.gray600} />
                <Text style={styles.metaText}>{provider.city}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Qué incluye</Text>
            <Text style={styles.description}>{service.description}</Text>

            <SellerCard
              seller={provider}
              label="Proveedor"
              onPress={() =>
                router.push({ pathname: '/(main)/beeservices/seller', params: { id: provider.id } })
              }
            />

            <View style={styles.noteRow}>
              <MessageCircle size={13} color={colors.neutral.gray600} />
              <Text style={styles.noteText}>
                Los servicios no se agregan al carrito: se acuerdan por chat con quien los publica.
              </Text>
            </View>
          </View>

          <View style={{ height: router.embedded ? 110 : 190 }} />
        </ScrollView>

        {/* Contact action: visual only in this phase */}
        <View style={[styles.actionBar, !router.embedded && styles.actionBarStandalone]}>
          <TouchableOpacity style={styles.contactBtn} activeOpacity={0.85}>
            <MessageCircle size={17} color={colors.neutral.white} />
            <Text style={styles.contactBtnText}>Contactar y solicitar cotización</Text>
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
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kindTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brand.primary,
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
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    backgroundColor: '#F9F5FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    padding: 12,
  },
  quoteCol: {
    flex: 1,
  },
  quoteTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  quoteDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  metaCard: {
    marginTop: 12,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
  },
  metaText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.neutral.gray100,
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
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
  },
});
