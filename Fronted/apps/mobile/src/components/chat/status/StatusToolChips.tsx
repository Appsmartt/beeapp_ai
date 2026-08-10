import { ReactNode } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Type, ImagePlus, Sticker, Music, Camera, ShoppingBag, X } from 'lucide-react-native';
import { StatusProductLink } from '../../../mocks/statuses';
import { MAX_IMAGE_LAYERS, MAX_STICKER_LAYERS, MAX_TEXT_LAYERS } from '../../../mocks/statusMedia';

interface StatusToolChipsProps {
  textCount: number;
  onAddText: () => void;
  imageCount: number;
  onAddImage: () => void;
  stickerCount: number;
  onOpenStickers: () => void;
  hasMusic: boolean;
  onOpenMusic: () => void;
  hasPhoto: boolean;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  product: StatusProductLink | null;
  onLinkProduct: () => void;
  onRemoveProduct: () => void;
}

interface ChipProps {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  trailing?: ReactNode;
}

function Chip({ icon, label, onPress, disabled, active, trailing }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      {trailing}
    </TouchableOpacity>
  );
}

/** Fila de acciones del editor: capas, stickers, música, foto y producto */
export default function StatusToolChips(props: StatusToolChipsProps) {
  const iconColor = colors.neutral.text;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip
        icon={<Type size={16} color={iconColor} />}
        label={`Agregar texto ${props.textCount}/${MAX_TEXT_LAYERS}`}
        onPress={props.onAddText}
        disabled={props.textCount >= MAX_TEXT_LAYERS}
      />

      <Chip
        icon={<ImagePlus size={16} color={iconColor} />}
        label={`Imagen ${props.imageCount}/${MAX_IMAGE_LAYERS}`}
        onPress={props.onAddImage}
        disabled={props.imageCount >= MAX_IMAGE_LAYERS}
      />

      <Chip
        icon={<Sticker size={16} color={iconColor} />}
        label={`Stickers ${props.stickerCount}/${MAX_STICKER_LAYERS}`}
        onPress={props.onOpenStickers}
        disabled={props.stickerCount >= MAX_STICKER_LAYERS}
      />

      <Chip
        icon={<Music size={16} color={props.hasMusic ? colors.brand.primary : iconColor} />}
        label="Música"
        onPress={props.onOpenMusic}
        active={props.hasMusic}
      />

      <Chip
        icon={<Camera size={16} color={iconColor} />}
        label={props.hasPhoto ? 'Quitar foto' : 'Foto de fondo'}
        onPress={props.hasPhoto ? props.onRemovePhoto : props.onPickPhoto}
        trailing={props.hasPhoto ? <X size={13} color={colors.neutral.gray600} /> : undefined}
      />

      <Chip
        icon={<ShoppingBag size={16} color={colors.brand.primary} />}
        label={props.product ? props.product.name : 'Vincular producto'}
        onPress={props.product ? props.onRemoveProduct : props.onLinkProduct}
        active={!!props.product}
        trailing={props.product ? <X size={13} color={colors.neutral.gray600} /> : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
  },
  chipActive: { backgroundColor: `${colors.brand.primary}15` },
  chipDisabled: { opacity: 0.45 },
  chipText: { flexShrink: 1, fontSize: 13, fontWeight: '400', color: colors.neutral.text },
});
