import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Lock } from 'lucide-react-native';
import { useGridColumns } from '../layout/ViewModeToggle';
import { NoteRowData } from './NoteListRow';

const GAP = 12;

interface NotesGridViewProps {
  notes: NoteRowData[];
  /** Ids protected with the global PIN: they never show their content */
  protectedIds: string[];
  onOpen: (id: string) => void;
}

/** Adaptive grid of note cards: two columns on phones, three from tablet up */
export default function NotesGridView({ notes, protectedIds, onOpen }: NotesGridViewProps) {
  const columns = useGridColumns();

  return (
    <View style={styles.grid}>
      {notes.map((note) => {
        const locked = protectedIds.includes(note.id);
        const dateLabel = new Date(note.updatedAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        });

        return (
          <TouchableOpacity
            key={note.id}
            style={[styles.card, { width: `${100 / columns}%` }]}
            onPress={() => onOpen(note.id)}
            activeOpacity={0.8}
          >
            <View style={styles.inner}>
              <View style={styles.titleRow}>
                <View style={[styles.colorDot, { backgroundColor: note.colorTag }]} />
                <Text style={styles.title} numberOfLines={2}>
                  {locked ? 'Nota protegida' : note.title}
                </Text>
                {locked && <Lock size={13} color={colors.brand.primary} />}
              </View>

              {!locked && (
                <Text style={styles.preview} numberOfLines={4}>
                  {note.content}
                </Text>
              )}

              <Text style={styles.date}>{dateLabel}</Text>
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
  // The width comes from the column count; the gap lives in the padding
  card: {
    padding: GAP / 2,
  },
  inner: {
    height: 150,
    backgroundColor: colors.neutral.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    marginTop: 6,
  },
  date: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
    textAlign: 'right',
    marginTop: 'auto',
  },
});
