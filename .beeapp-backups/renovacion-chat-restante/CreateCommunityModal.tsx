import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Camera } from 'lucide-react-native';
import { COMMUNITY_CATEGORIES } from '../../mocks/communities';

interface CreateCommunityModalProps {
  visible: boolean;
  onCreate: (data: { name: string; description: string; category: string }) => void;
  onClose: () => void;
}

/** Sheet that creates a community: avatar (mock), name, description and category */
export default function CreateCommunityModal({ visible, onCreate, onClose }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(COMMUNITY_CATEGORIES[0]);

  // Every time it opens the form starts empty
  useEffect(() => {
    if (visible) {
      setName('');
      setDescription('');
      setCategory(COMMUNITY_CATEGORIES[0]);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Crear comunidad</Text>

          <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8} onPress={() => {}}>
            <Camera size={22} color={colors.neutral.gray500} />
            <Text style={styles.avatarText}>Agregar foto</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la comunidad"
            placeholderTextColor={colors.neutral.gray500}
          />

          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="¿De qué trata la comunidad?"
            placeholderTextColor={colors.neutral.gray500}
            multiline
          />

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.categoryRow}>
            {COMMUNITY_CATEGORIES.map((option) => {
              const isActive = category === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setCategory(option)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              disabled={!name.trim()}
              onPress={() => onCreate({ name: name.trim(), description: description.trim(), category })}
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
  avatarBtn: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral.gray300,
    marginVertical: spacing.md,
  },
  avatarText: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600 },
  input: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  label: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: spacing.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
  },
  categoryChipActive: { backgroundColor: colors.brand.primary },
  categoryText: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  categoryTextActive: { color: colors.neutral.white, fontWeight: '600' },
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
