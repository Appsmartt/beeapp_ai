import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import { ChevronRight } from 'lucide-react-native';
import { Business, getCategoryLabel } from '../../mocks/myServices';

interface BusinessListItemProps {
  business: Business;
  onPress: () => void;
}

const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

/** Extract up to 2 initials from a business name */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Build the product/service count label */
function buildCountLabel(business: Business): string {
  const parts: string[] = [];
  if (business.offersProducts && business.products.length > 0) {
    const n = business.products.length;
    parts.push(`${n} producto${n !== 1 ? 's' : ''}`);
  }
  if (business.offersServices && business.services.length > 0) {
    const n = business.services.length;
    parts.push(`${n} servicio${n !== 1 ? 's' : ''}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Sin catálogo aún';
}

export default function BusinessListItem({ business, onPress }: BusinessListItemProps) {
  const initials = getInitials(business.name);
  const categoryLabel = getCategoryLabel(business.category);
  const countLabel = buildCountLabel(business);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Text content */}
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {categoryLabel}
        </Text>
        <Text style={styles.count} numberOfLines={1}>
          {countLabel}
        </Text>
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
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  texts: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  category: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  count: {
    fontSize: FONT.caption - 1,
    fontWeight: '400',
    color: colors.neutral.gray400,
    marginTop: 2,
  },
});
