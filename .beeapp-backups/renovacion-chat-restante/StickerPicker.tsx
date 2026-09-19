import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { X } from 'lucide-react-native';
import { STATUS_STICKERS, StatusSticker } from './stickerCatalog';

interface StickerPickerProps {
  visible: boolean;
  onSelect: (sticker: StatusSticker) => void;
  onClose: () => void;
}

/** Hoja inferior con la cuadrícula de stickers de íconos de Lucide */
export default function StickerPicker({ visible, onSelect, onClose }: StickerPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Stickers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.neutral.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {STATUS_STICKERS.map((sticker) => (
              <TouchableOpacity
                key={sticker.id}
                style={styles.item}
                onPress={() => onSelect(sticker)}
                activeOpacity={0.7}
              >
                <View style={[styles.bubble, { backgroundColor: sticker.background }]}>
                  <sticker.Icon size={34} color={sticker.color} />
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {sticker.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26, 26, 46, 0.35)' },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '65%',
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  closeBtn: { padding: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  item: { width: 64, alignItems: 'center', gap: 6 },
  bubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '400', color: colors.neutral.gray600 },
});
