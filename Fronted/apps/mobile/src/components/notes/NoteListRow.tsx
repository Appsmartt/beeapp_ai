import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  colors,
  spacing,
} from '@beeapp/design-system';
import {
  FileText,
  Pin,
  Share2,
  Star,
} from 'lucide-react-native';

import type {
  NoteListItem,
} from '../../services/notesService';

export type NoteRowData = NoteListItem;

interface NoteListRowProps {
  note: NoteListItem;
  showSeparator: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: (
    event: unknown,
  ) => void;
}

/**
 * Fila de una nota real: título, preview de bloques,
 * fecha, favorito, fijada y compartida.
 */
export default function NoteListRow({
  note,
  showSeparator,
  onPress,
  onLongPress,
  onToggleFavorite,
}: NoteListRowProps) {
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
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[
          styles.row,
          showSeparator && styles.rowSeparator,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: `${note.colorTag}22`,
            },
          ]}
        >
          <FileText
            size={17}
            color={note.colorTag}
          />
        </View>

        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {note.title}
            </Text>

            {note.isPinned && (
              <Pin
                size={13}
                color={colors.brand.primary}
              />
            )}

            {note.isShared && (
              <Share2
                size={12}
                color={colors.neutral.gray500}
              />
            )}
          </View>

          <Text
            style={styles.preview}
            numberOfLines={1}
          >
            {note.preview || 'Sin contenido'}
          </Text>

          {note.isShared && note.sharedByName && (
            <Text
              style={styles.sharedBy}
              numberOfLines={1}
            >
              Compartida por {note.sharedByName}
            </Text>
          )}
        </View>

        <View style={styles.metaCol}>
          <Text style={styles.dateText}>
            {dateLabel}
          </Text>

          {!note.isShared && (
            <TouchableOpacity
              onPress={onToggleFavorite}
              style={styles.starBtn}
              activeOpacity={0.7}
              accessibilityLabel={
                note.isFavorite
                  ? 'Quitar de favoritas'
                  : 'Marcar como favorita'
              }
            >
              <Star
                size={15}
                color={
                  note.isFavorite
                    ? '#F59E0B'
                    : colors.neutral.gray400
                }
                fill={
                  note.isFavorite
                    ? '#F59E0B'
                    : 'transparent'
                }
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    backgroundColor: colors.neutral.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  preview: {
    fontSize: 11.5,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  sharedBy: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.brand.primary,
    marginTop: 3,
  },
  metaCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  starBtn: {
    padding: 2,
  },
});