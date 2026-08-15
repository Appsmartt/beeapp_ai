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
  Pin,
  Share2,
  Star,
} from 'lucide-react-native';

import type {
  NoteListItem,
} from '../../services/notesService';
import {
  useGridColumns,
} from '../layout/ViewModeToggle';

const GAP = 12;

interface NotesGridViewProps {
  notes: NoteListItem[];
  onOpen: (id: string) => void;
  onLongPress: (note: NoteListItem) => void;
}

/**
 * Tarjetas adaptables para notas reales. El contenido
 * mostrado es el preview derivado de los bloques JSON.
 */
export default function NotesGridView({
  notes,
  onOpen,
  onLongPress,
}: NotesGridViewProps) {
  const columns = useGridColumns();

  return (
    <View style={styles.grid}>
      {notes.map((note) => {
        const updatedAt = new Date(note.updatedAt);

        const dateLabel = Number.isNaN(
          updatedAt.getTime(),
        )
          ? ''
          : updatedAt.toLocaleDateString(
            'es-CO',
            {
              day: 'numeric',
              month: 'short',
            },
          );

        return (
          <TouchableOpacity
            key={note.id}
            style={[
              styles.card,
              {
                width: `${100 / columns}%`,
              },
            ]}
            onPress={() => onOpen(note.id)}
            onLongPress={() => onLongPress(note)}
            delayLongPress={450}
            activeOpacity={0.8}
          >
            <View style={styles.inner}>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: note.colorTag,
                    },
                  ]}
                />

                <Text
                  style={styles.title}
                  numberOfLines={2}
                >
                  {note.title}
                </Text>

                {note.isPinned && (
                  <Pin
                    size={13}
                    color={colors.brand.primary}
                  />
                )}
              </View>

              <Text
                style={styles.preview}
                numberOfLines={4}
              >
                {note.preview || 'Sin contenido'}
              </Text>

              <View style={styles.footer}>
                <Text style={styles.date}>
                  {dateLabel}
                </Text>

                <View style={styles.flags}>
                  {note.isFavorite && (
                    <Star
                      size={12}
                      color="#F59E0B"
                      fill="#F59E0B"
                    />
                  )}

                  {note.isShared && (
                    <Share2
                      size={12}
                      color={colors.neutral.gray500}
                    />
                  )}
                </View>
              </View>
            </View>
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
    paddingHorizontal: spacing.md - GAP / 2,
    paddingTop: spacing.sm,
  },
  card: {
    padding: GAP / 2,
  },
  inner: {
    height: 154,
    backgroundColor: colors.neutral.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  preview: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    lineHeight: 17,
    marginTop: 7,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  date: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  flags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});