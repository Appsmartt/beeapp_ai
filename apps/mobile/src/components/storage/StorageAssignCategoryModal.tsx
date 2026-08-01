import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Check } from 'lucide-react-native';
import { StorageCategory } from '../../stores/storageStore';
import { getCategoryIcon } from '../chat/categoryIcons';

interface StorageAssignCategoryModalProps {
  visible: boolean;
  itemName?: string;
  categories: StorageCategory[];
  /** Categories the item already belongs to */
  selectedIds: string[];
  onSave: (categoryIds: string[]) => void;
  onClose: () => void;
}

/** Assigns a storage item to one or several categories (mock, in memory) */
export default function StorageAssignCategoryModal({
  visible,
  itemName,
  categories,
  selectedIds,
  onSave,
  onClose,
}: StorageAssignCategoryModalProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (visible) setSelected(selectedIds);
  }, [visible, selectedIds]);

  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Asignar a categoría</Text>
          {!!itemName && <Text style={styles.subtitle}>{itemName}</Text>}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {categories.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no has creado categorías.</Text>
            ) : (
              categories.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                const isSelected = selected.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.row}
                    onPress={() => toggle(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: category.color }]}>
                      <Icon size={16} color={colors.neutral.gray700} />
                    </View>
                    <Text style={styles.rowName}>{category.name}</Text>
                    {isSelected && <Check size={18} color={colors.brand.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(selected)} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  subtitle: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 4 },
  list: { marginTop: spacing.sm },
  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '400', color: colors.neutral.gray700 },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
});
