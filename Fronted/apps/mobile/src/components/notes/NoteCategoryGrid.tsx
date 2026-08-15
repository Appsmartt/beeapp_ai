import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';
import {
  MoreVertical,
} from 'lucide-react-native';

import type {
  NotesHomeItem,
} from '../../services/notesService';
import {
  getNoteCategoryIcon,
} from './noteCategoryIcons';


interface NoteCategoryGridProps {
  categories: NotesHomeItem[];
  countOf: (category: NotesHomeItem) => number;
  onOpen: (category: NotesHomeItem) => void;
  onOpenActions?: (category: NotesHomeItem) => void;
}


/**
 * Cuadrícula para vistas, carpetas, etiquetas y plantillas.
 * Las entidades editables tienen un menú contextual visible.
 */
export default function NoteCategoryGrid({
  categories,
  countOf,
  onOpen,
  onOpenActions,
}: NoteCategoryGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const Icon = getNoteCategoryIcon(
          category.iconKey,
        );

        const count = countOf(category);

        const canManage =
          !category.isFixed
          && (
            category.kind === 'folder'
            || category.kind === 'tag'
          );

        return (
          <TouchableOpacity
            key={category.id}
            style={styles.card}
            onPress={() => onOpen(category)}
            onLongPress={
              canManage && onOpenActions
                ? () => onOpenActions(category)
                : undefined
            }
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    `${category.color}1A`,
                },
              ]}
            >
              <Icon
                size={18}
                color={category.color}
              />
            </View>

            <View style={styles.info}>
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {category.name}
              </Text>

              <Text style={styles.count}>
                {count} {count === 1 ? 'nota' : 'notas'}
              </Text>
            </View>

            {canManage && onOpenActions && (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenActions(category);
                }}
                hitSlop={8}
                style={styles.menuButton}
                activeOpacity={0.7}
                accessibilityLabel={
                  `Opciones de ${category.name}`
                }
              >
                <MoreVertical
                  size={17}
                  color={colors.neutral.gray500}
                />
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
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  count: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  menuButton: {
    padding: 2,
  },
});