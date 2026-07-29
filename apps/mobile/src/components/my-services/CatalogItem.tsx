import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import { Package, Wrench, ChevronRight } from 'lucide-react-native';
import { BusinessProduct, BusinessService, formatPrice } from '../../mocks/myServices';

interface CatalogItemProps {
  item: BusinessProduct | BusinessService;
  type: 'product' | 'service';
  onPress: () => void;
}

const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  domicilio: 'Domicilio',
  recoger: 'Recoger',
  consumir: 'Consumir',
};

const SERVICE_MODE_LABELS: Record<string, string> = {
  virtual: 'Virtual',
  presencial: 'Presencial',
};

export default function CatalogItem({ item, type, onPress }: CatalogItemProps) {
  const isProduct = type === 'product';
  const Icon = isProduct ? Package : Wrench;
  const iconColor = isProduct ? colors.brand.primary : colors.neutral.gray700;
  const iconBg = isProduct ? colors.brand.primary + '15' : colors.neutral.gray100;

  // Build subtitle
  let subtitle = '';
  if (isProduct) {
    const prod = item as BusinessProduct;
    const priceStr = formatPrice(prod.price);
    const methodStr = DELIVERY_METHOD_LABELS[prod.deliveryMethod] ?? prod.deliveryMethod;
    subtitle = `${priceStr} · ${methodStr}`;
  } else {
    const srv = item as BusinessService;
    const priceStr = srv.price !== null ? formatPrice(srv.price) : 'Cotización';
    const modeStr = SERVICE_MODE_LABELS[srv.mode] ?? srv.mode;
    subtitle = `${modeStr} · ${priceStr}`;
  }

  // Get first 2 characteristics
  const characteristics = item.characteristics?.slice(0, 2) ?? [];

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        {/* Characteristics mini chips */}
        {characteristics.length > 0 ? (
          <View style={styles.charContainer}>
            {characteristics.map((char, index) => (
              <View key={index} style={styles.charChip}>
                <Text style={styles.charText} numberOfLines={1}>
                  {char.name}: {char.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Chevron */}
      <ChevronRight size={18} color={colors.neutral.gray400} />
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
  content: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  subtitle: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  charContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  charChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    maxWidth: 120,
  },
  charText: {
    fontSize: FONT.caption - 2,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
});
