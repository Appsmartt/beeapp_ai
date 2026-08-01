import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Plus, X, Check } from 'lucide-react-native';
import { MOCK_NOTE_CATEGORIES, NoteCategory } from '../../mocks/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface NoteCategoryChipsProps {
  /** Ids de las categorías asignadas a la nota */
  value: string[];
  onChange: (ids: string[]) => void;
}

const findCategory = (id: string): NoteCategory | undefined =>
  MOCK_NOTE_CATEGORIES.find((category) => category.id === id);

/** Chips de las categorías de la nota, con "+" para asignar más */
export default function NoteCategoryChips({ value, onChange }: NoteCategoryChipsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return (
    <View style={styles.row}>
      {value.map((id) => {
        const category = findCategory(id);
        if (!category) return null;
        const Icon = getNoteCategoryIcon(category.iconKey);

        return (
          <View key={id} style={[styles.chip, { borderColor: category.color }]}>
            <Icon size={12} color={category.color} />
            <Text style={[styles.chipText, { color: category.color }]}>{category.name}</Text>
            <TouchableOpacity onPress={() => toggle(id)} hitSlop={6} activeOpacity={0.7}>
              <X size={11} color={category.color} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={styles.addChip} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
        <Plus size={13} color={colors.neutral.gray600} />
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} activeOpacity={1} />

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Categorías de la nota</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ padding: 4 }} activeOpacity={0.7}>
                <X size={18} color={colors.neutral.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {MOCK_NOTE_CATEGORIES.map((category) => {
                const Icon = getNoteCategoryIcon(category.iconKey);
                const isOn = value.includes(category.id);

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.option}
                    onPress={() => toggle(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: `${category.color}1A` }]}>
                      <Icon size={16} color={category.color} />
                    </View>
                    <Text style={styles.optionText}>{category.name}</Text>
                    {isOn && <Check size={18} color={colors.brand.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 11, fontWeight: '400' },
  addChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26, 26, 46, 0.35)' },
  sheet: {
    maxHeight: '65%',
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  optionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text },
});
