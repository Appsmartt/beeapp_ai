import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronRight, MapPin, Star } from 'lucide-react-native';
import { BeeSeller } from '../../mocks/beeservices';

interface SellerCardProps {
  seller: BeeSeller;
  /** Label above the row: "Vendedor" for products, "Proveedor" for services */
  label: string;
  onPress: () => void;
}

/** Seller summary inside a listing detail, with access to their public profile. */
export default function SellerCard({ seller, label, onPress }: SellerCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: `${seller.color}1A` }]}>
          <Text style={[styles.avatarText, { color: seller.color }]}>{seller.initials}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.name} numberOfLines={1}>
            {seller.name}
          </Text>
          <Text style={styles.headline} numberOfLines={1}>
            {seller.headline}
          </Text>
          <View style={styles.metaRow}>
            <Star size={11} color="#D97706" fill="#D97706" />
            <Text style={styles.metaText}>
              {seller.rating.toFixed(1)} ({seller.reviews})
            </Text>
            <MapPin size={11} color={colors.neutral.gray500} />
            <Text style={styles.metaText}>{seller.city}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.neutral.gray500} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
    marginTop: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.neutral.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  col: {
    flex: 1,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  headline: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  metaText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.neutral.gray600,
    marginRight: 6,
  },
});
