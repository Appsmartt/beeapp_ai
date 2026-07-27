import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import { Package, Wrench } from 'lucide-react-native';
import { MyProductService, formatPrice, BEE_CATEGORIES } from '../../mocks/myServices';

interface MyServiceItemProps {
  item: MyProductService;
  onPress: () => void;
}

/** RN needs numeric sizes; the design-system tokens are CSS strings */
const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

/** Soft tint of a token color (hex + alpha) */
const soft = (color: string) => `${color}1A`;

export default function MyServiceItem({ item, onPress }: MyServiceItemProps) {
  const isProduct = item.type === 'product';
  const Icon = isProduct ? Package : Wrench;
  const accent = colors.brand.primary;

  const categoryName = BEE_CATEGORIES.find((c) => c.id === item.category)?.name ?? 'General';
  const priceLabel = isProduct && item.price !== null ? formatPrice(item.price) : 'Cotización';

  const isActive = item.status === 'active';
  const statusColor = isActive ? colors.semantic.success : colors.neutral.gray400;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: soft(accent) }]}>
        <Icon size={19} color={accent} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {categoryName} · {priceLabel}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: soft(statusColor) }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  texts: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    fontSize: FONT.body,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  subtitle: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: FONT.caption - 1,
    fontWeight: '400',
  },
});
