import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { colors, radii, spacing } from '@beeapp/design-system';
import { Trash2 } from 'lucide-react-native';
import type { ChatCategoryRecord } from '@beeapp/api-client';
import { getCategoryIcon } from './categoryIcons';

interface Props {
  visible: boolean;
  categories: ChatCategoryRecord[];
  deletingId: string | null;
  onDelete: (category: ChatCategoryRecord) => void;
  onClose: () => void;
}

export default function ManageChatCategoriesModal({
  visible, categories, deletingId, onDelete, onClose,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Tus categorías</Text>
          <Text style={styles.subtitle}>Organiza tus chats a tu manera.</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.icon);
              return (
                <View key={category.id} style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: category.color }]}>
                    <Icon size={18} color={colors.neutral.gray700} />
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
                  <TouchableOpacity
                    disabled={Boolean(deletingId)}
                    onPress={() => onDelete(category)}
                    accessibilityLabel={`Eliminar categoría ${category.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={19} color={colors.semantic.error} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Listo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(34,43,67,0.38)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '75%',
  },
  title: { color: colors.neutral.text, fontSize: 17, fontWeight: '600' },
  subtitle: { color: colors.neutral.gray600, fontSize: 12, marginTop: 4 },
  list: { marginTop: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100,
  },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, color: colors.neutral.text, fontSize: 14 },
  close: {
    alignItems: 'center', backgroundColor: colors.brand.primary,
    borderRadius: radii.lg, paddingVertical: 13, marginTop: spacing.md,
  },
  closeText: { color: colors.neutral.white, fontWeight: '600', fontSize: 14 },
});
