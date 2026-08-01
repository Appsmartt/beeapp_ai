import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Plus } from 'lucide-react-native';
import { StorageCategory } from '../../stores/storageStore';
import { getCategoryIcon } from '../chat/categoryIcons';

interface StorageCategoryChipsProps {
  categories: StorageCategory[];
  /** null means "Todos": no category filter applied */
  activeCategoryId: string | null;
  onChange: (categoryId: string | null) => void;
  onCreate: () => void;
}

/** Category chips for the storage module — same design as ChatCategoryChips */
export default function StorageCategoryChips({
  categories,
  activeCategoryId,
  onChange,
  onCreate,
}: StorageCategoryChipsProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={[styles.chip, !activeCategoryId && styles.chipActive]}
          onPress={() => onChange(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, !activeCategoryId && styles.chipTextActive]}>Todos</Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const Icon = getCategoryIcon(cat.icon);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, { backgroundColor: cat.color }, isActive && styles.chipActive]}
              onPress={() => onChange(cat.id)}
              activeOpacity={0.7}
            >
              <Icon size={13} color={isActive ? colors.neutral.white : colors.neutral.gray700} />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addChip} onPress={onCreate} activeOpacity={0.7}>
          <Plus size={14} color={colors.brand.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
  },
  chipActive: {
    backgroundColor: colors.brand.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  chipTextActive: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  addChip: {
    width: 32,
    height: 32,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand.primary,
  },
});
