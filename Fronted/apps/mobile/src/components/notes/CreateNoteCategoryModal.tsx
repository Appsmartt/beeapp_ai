import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { X, Check } from 'lucide-react-native';
import {
  NOTE_CATEGORY_COLORS,
  NOTE_CATEGORY_ICON_KEYS,
  NoteCategory,
} from '../../mocks/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface CreateNoteCategoryModalProps {
  visible: boolean;
  onCreate: (category: Omit<NoteCategory, 'id'>) => void;
  onClose: () => void;
}

/** Modal para crear una categoría de notas: nombre, ícono y color */
export default function CreateNoteCategoryModal({
  visible,
  onCreate,
  onClose,
}: CreateNoteCategoryModalProps) {
  const [name, setName] = useState('');
  const [iconKey, setIconKey] = useState(NOTE_CATEGORY_ICON_KEYS[0]);
  const [color, setColor] = useState(NOTE_CATEGORY_COLORS[0]);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setIconKey(NOTE_CATEGORY_ICON_KEYS[0]);
    setColor(NOTE_CATEGORY_COLORS[0]);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Nueva categoría</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.neutral.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Trabajo"
              placeholderTextColor={colors.neutral.gray500}
            />

            <Text style={styles.label}>Ícono</Text>
            <View style={styles.optionsRow}>
              {NOTE_CATEGORY_ICON_KEYS.map((key) => {
                const Icon = getNoteCategoryIcon(key);
                const isActive = key === iconKey;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.iconOption, isActive && { borderColor: color }]}
                    onPress={() => setIconKey(key)}
                    activeOpacity={0.7}
                  >
                    <Icon size={18} color={isActive ? color : colors.neutral.gray600} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Color</Text>
            <View style={styles.optionsRow}>
              {NOTE_CATEGORY_COLORS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.colorOption, { backgroundColor: option }]}
                  onPress={() => setColor(option)}
                  activeOpacity={0.8}
                >
                  {option === color && <Check size={14} color={colors.neutral.white} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, !name.trim() && styles.submitBtnDisabled]}
            disabled={!name.trim()}
            onPress={() => onCreate({ name: name.trim(), iconKey, color })}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>Crear categoría</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26, 26, 46, 0.35)' },
  sheet: {
    maxHeight: '80%',
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
  body: { padding: spacing.md, gap: spacing.sm },
  label: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
});
