import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { X } from 'lucide-react-native';
import { NoteCategory } from '../../mocks/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface NoteCategoryGridProps {
  categories: NoteCategory[];
  /** Cuántas notas hay dentro de cada categoría, por id */
  countOf: (category: NoteCategory) => number;
  onOpen: (category: NoteCategory) => void;
  onRemove: (id: string) => void;
}

/** Cuadrícula de 2 columnas con las categorías de notas */
export default function NoteCategoryGrid({
  categories,
  countOf,
  onOpen,
  onRemove,
}: NoteCategoryGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const Icon = getNoteCategoryIcon(category.iconKey);
        const count = countOf(category);

        return (
          <TouchableOpacity
            key={category.id}
            style={styles.card}
            onPress={() => onOpen(category)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${category.color}1A` }]}>
              <Icon size={18} color={category.color} />
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {category.name}
              </Text>
              <Text style={styles.count}>
                {count} {count === 1 ? 'nota' : 'notas'}
              </Text>
            </View>

            {!category.isFixed && (
              <TouchableOpacity
                onPress={() => onRemove(category.id)}
                hitSlop={8}
                style={styles.removeBtn}
                activeOpacity={0.7}
              >
                <X size={13} color={colors.neutral.gray500} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  count: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  removeBtn: { padding: 2 },
});
