import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Bold, Minus, Plus } from 'lucide-react-native';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS, StatusProductLink } from '../../mocks/statuses';
import StatusToolChips from './status/StatusToolChips';

interface StatusEditorToolbarProps {
  /** Tipografía: aplica a la capa de texto seleccionada */
  hasTextSelection: boolean;
  textSize: number;
  onChangeSize: (size: number) => void;
  bold: boolean;
  onToggleBold: () => void;
  textColor: string;
  onChangeTextColor: (color: string) => void;
  /** Background swatches only make sense on a text-only status */
  showBackgrounds: boolean;
  bgColor: string;
  onChangeBgColor: (color: string) => void;
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

export const STATUS_TEXT_SIZE_MIN = 16;
export const STATUS_TEXT_SIZE_MAX = 40;
const STEP = 2;

/** Text and content controls of the status editor */
export default function StatusEditorToolbar(props: StatusEditorToolbarProps) {
  const { hasTextSelection, textSize, onChangeSize, bold, onToggleBold, textColor } = props;

  const clamp = (value: number) =>
    Math.min(STATUS_TEXT_SIZE_MAX, Math.max(STATUS_TEXT_SIZE_MIN, value));

  return (
    <View style={styles.wrap}>
      <StatusToolChips
        textCount={props.textCount}
        onAddText={props.onAddText}
        imageCount={props.imageCount}
        onAddImage={props.onAddImage}
        stickerCount={props.stickerCount}
        onOpenStickers={props.onOpenStickers}
        hasMusic={props.hasMusic}
        onOpenMusic={props.onOpenMusic}
        hasPhoto={props.hasPhoto}
        onPickPhoto={props.onPickPhoto}
        onRemovePhoto={props.onRemovePhoto}
        product={props.product}
        onLinkProduct={props.onLinkProduct}
        onRemoveProduct={props.onRemoveProduct}
      />

      <View style={[styles.textRow, !hasTextSelection && styles.disabled]} pointerEvents={hasTextSelection ? 'auto' : 'none'}>
        <TouchableOpacity
          style={styles.sizeBtn}
          onPress={() => onChangeSize(clamp(textSize - STEP))}
          activeOpacity={0.7}
        >
          <Minus size={14} color={colors.neutral.text} />
          <Text style={styles.sizeSmall}>A</Text>
        </TouchableOpacity>

        <View style={styles.sizeTrack}>
          <View
            style={[
              styles.sizeFill,
              {
                width: `${
                  ((textSize - STATUS_TEXT_SIZE_MIN) / (STATUS_TEXT_SIZE_MAX - STATUS_TEXT_SIZE_MIN)) * 100
                }%`,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={styles.sizeBtn}
          onPress={() => onChangeSize(clamp(textSize + STEP))}
          activeOpacity={0.7}
        >
          <Text style={styles.sizeBig}>A</Text>
          <Plus size={14} color={colors.neutral.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boldBtn, bold && styles.boldBtnActive]}
          onPress={onToggleBold}
          activeOpacity={0.7}
        >
          <Bold size={16} color={bold ? colors.neutral.white : colors.neutral.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.rowLabel}>
        {hasTextSelection ? 'Color del texto' : 'Selecciona un texto para editarlo'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.swatchRow}
        style={!hasTextSelection && styles.disabled}
        pointerEvents={hasTextSelection ? 'auto' : 'none'}
      >
        {STATUS_TEXT_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.swatch, { backgroundColor: color }, textColor === color && styles.swatchActive]}
            onPress={() => props.onChangeTextColor(color)}
            activeOpacity={0.8}
          />
        ))}
      </ScrollView>

      {props.showBackgrounds && (
        <>
          <Text style={styles.rowLabel}>Color de fondo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
            {STATUS_BG_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  props.bgColor === color && styles.swatchActive,
                ]}
                onPress={() => props.onChangeBgColor(color)}
                activeOpacity={0.8}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  disabled: { opacity: 0.4 },
  textRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  sizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  sizeSmall: { fontSize: 12, fontWeight: '400', color: colors.neutral.text },
  sizeBig: { fontSize: 19, fontWeight: '400', color: colors.neutral.text },
  sizeTrack: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  sizeFill: { height: 4, backgroundColor: colors.brand.primary, borderRadius: radii.full },
  boldBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boldBtnActive: { backgroundColor: colors.brand.primary },
  rowLabel: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, marginTop: 4 },
  swatchRow: { gap: 10, paddingVertical: 2 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  swatchActive: { borderWidth: 2, borderColor: colors.brand.primary },
});
