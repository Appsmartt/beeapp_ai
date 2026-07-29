import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import { Wrench, Edit, Trash2, Monitor, MapPin } from 'lucide-react-native';
import { BusinessService, formatPrice } from '../../mocks/myServices';

interface ServiceDetailScreenProps {
  service: BusinessService;
  onEdit: () => void;
  onDelete: () => void;
}

const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

const SERVICE_MODE_LABELS: Record<string, { label: string; icon: typeof Monitor }> = {
  virtual: { label: 'Virtual', icon: Monitor },
  presencial: { label: 'Presencial', icon: MapPin },
};

export default function ServiceDetailScreen({ service, onEdit, onDelete }: ServiceDetailScreenProps) {
  const priceLabel = service.price !== null ? formatPrice(service.price) : 'Cotización';
  const modeConfig = SERVICE_MODE_LABELS[service.mode] ?? { label: service.mode, icon: Monitor };
  const ModeIcon = modeConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Image Gallery Mock Container */}
      <View style={styles.imageGallery}>
        <Wrench size={48} color={colors.neutral.gray600} />
        <Text style={styles.galleryText}>Imágenes del servicio</Text>
      </View>

      {/* Info Block */}
      <View style={styles.infoBlock}>
        <Text style={styles.name}>{service.name}</Text>
        <Text style={styles.price}>{priceLabel}</Text>

        {service.description ? (
          <Text style={styles.description}>{service.description}</Text>
        ) : null}
      </View>

      {/* Service Mode Badge */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modalidad</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <ModeIcon size={14} color={colors.neutral.gray700} />
            <Text style={styles.badgeText}>{modeConfig.label}</Text>
          </View>
        </View>
      </View>

      {/* Characteristics */}
      {service.characteristics && service.characteristics.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Características</Text>
          <View style={styles.charList}>
            {service.characteristics.map((char, index) => (
              <View key={index} style={styles.charRow}>
                <Text style={styles.charName}>{char.name}</Text>
                <Text style={styles.charValue}>{char.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
          <Edit size={16} color={colors.neutral.gray700} />
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <Trash2 size={16} color={colors.semantic.error} />
          <Text style={styles.deleteBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  content: { padding: spacing.md, paddingBottom: 100 },
  imageGallery: {
    height: 200,
    backgroundColor: colors.neutral.gray50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  galleryText: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  infoBlock: {
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 12,
  },
  description: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.gray700,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  badgeText: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  charList: {
    gap: 8,
  },
  charRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray50,
  },
  charName: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  charValue: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.semantic.error + '40',
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.semantic.error,
  },
});
