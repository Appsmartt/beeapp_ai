import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ChatCategory } from '../../mocks/chats';
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES, CATEGORY_COLORS, CategoryIconName } from './categoryIcons';

interface CreateCategoryModalProps {
  visible: boolean;
  onCreate: (category: Omit<ChatCategory, 'id'>) => void;
  onClose: () => void;
}

/** Sheet that creates a chat category: name, icon and chip color */
export default function CreateCategoryModal({ visible, onCreate, onClose }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIconName>('Users');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  // Every time it opens the form starts empty
  useEffect(() => {
    if (visible) {
      setName('');
      setIcon('Users');
      setColor(CATEGORY_COLORS[0]);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Crear categoría</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la categoría"
            placeholderTextColor={colors.neutral.gray500}
          />

          <Text style={styles.label}>Ícono</Text>
          <View style={styles.optionRow}>
            {CATEGORY_ICON_NAMES.map((iconName) => {
              const Icon = CATEGORY_ICONS[iconName];
              const isSelected = icon === iconName;
              return (
                <TouchableOpacity
                  key={iconName}
                  style={[styles.iconOption, isSelected && styles.optionSelected]}
                  onPress={() => setIcon(iconName)}
                  activeOpacity={0.7}
                >
                  <Icon size={18} color={isSelected ? colors.brand.primary : colors.neutral.gray600} />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Color del chip</Text>
          <View style={styles.optionRow}>
            {CATEGORY_COLORS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.colorOption, { backgroundColor: option }, color === option && styles.optionSelected]}
                onPress={() => setColor(option)}
                activeOpacity={0.8}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              disabled={!name.trim()}
              onPress={() => onCreate({ name: name.trim(), icon, color })}
              activeOpacity={0.8}
            >
              <Text style={styles.createBtnText}>Crear</Text>
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
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  input: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  optionSelected: { borderWidth: 2, borderColor: colors.brand.primary },
  actions: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '400', color: colors.neutral.gray700 },
  createBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  createBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
});
