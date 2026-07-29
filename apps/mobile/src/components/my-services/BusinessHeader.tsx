import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import {
  MapPin,
  Pencil,
  Trash2,
  Truck,
  Store,
  UtensilsCrossed,
  Monitor,
} from 'lucide-react-native';
import { Business, getCategoryLabel, DeliveryMethod, ServiceMode } from '../../mocks/myServices';

interface BusinessHeaderProps {
  business: Business;
  onEdit: () => void;
  onDelete: () => void;
}

const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

const DELIVERY_LABELS: Record<DeliveryMethod, { label: string; icon: typeof Truck }> = {
  domicilio: { label: 'Domicilio', icon: Truck },
  recoger: { label: 'Recoger', icon: Store },
  consumir: { label: 'Consumir', icon: UtensilsCrossed },
};

const MODE_LABELS: Record<ServiceMode, { label: string; icon: typeof Monitor }> = {
  virtual: { label: 'Virtual', icon: Monitor },
  presencial: { label: 'Presencial', icon: MapPin },
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function BusinessHeader({ business, onEdit, onDelete }: BusinessHeaderProps) {
  const initials = getInitials(business.name);
  const categoryLabel = getCategoryLabel(business.category);

  return (
    <View style={styles.container}>
      {/* Centered Logo / Initials */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* Info */}
      <Text style={styles.name}>{business.name}</Text>
      <Text style={styles.category}>{categoryLabel}</Text>

      {business.address ? (
        <View style={styles.addressRow}>
          <MapPin size={14} color={colors.neutral.gray500} />
          <Text style={styles.addressText}>{business.address}</Text>
        </View>
      ) : null}

      {business.description ? (
        <Text style={styles.description}>{business.description}</Text>
      ) : null}

      {/* Configuration Chips (ReadOnly) */}
      <View style={styles.chipsContainer}>
        {business.offersProducts &&
          business.deliveryMethods.map((method) => {
            const config = DELIVERY_LABELS[method];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <View key={method} style={styles.badge}>
                <Icon size={12} color={colors.neutral.gray600} />
                <Text style={styles.badgeText}>{config.label}</Text>
              </View>
            );
          })}

        {business.offersServices &&
          business.serviceModes.map((mode) => {
            const config = MODE_LABELS[mode];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <View key={mode} style={styles.badge}>
                <Icon size={12} color={colors.neutral.gray600} />
                <Text style={styles.badgeText}>{config.label}</Text>
              </View>
            );
          })}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
          <Pencil size={15} color={colors.neutral.gray700} />
          <Text style={styles.editBtnText}>Editar negocio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <Trash2 size={15} color={colors.semantic.error} />
          <Text style={styles.deleteBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  category: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.gray500,
    textAlign: 'center',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  addressText: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  description: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.gray700,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  badgeText: {
    fontSize: FONT.caption - 1,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.semantic.error + '40',
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.semantic.error,
  },
});
