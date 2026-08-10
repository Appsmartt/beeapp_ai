import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { FileText, Star, Clock, Lock } from 'lucide-react-native';

export interface NoteRowData {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  isFavorite: boolean;
  colorTag: string;
  reminderDate?: string;
}

interface NoteListRowProps {
  note: NoteRowData;
  isProtected: boolean;
  showSeparator: boolean;
  onPress: () => void;
  onToggleFavorite: (e: any) => void;
}

/**
 * Flat note row for the single-column list: round icon tinted with the note
 * color, title, one-line preview and date — same anatomy as the mail list.
 */
export default function NoteListRow({
  note,
  isProtected,
  showSeparator,
  onPress,
  onToggleFavorite,
}: NoteListRowProps) {
  const dateLabel = new Date(note.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.row, showSeparator && styles.rowSeparator]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Protected notes reveal nothing: no title, no preview */}
        {isProtected ? (
          <>
            <View style={[styles.iconCircle, styles.iconCircleLocked]}>
              <Lock size={17} color={colors.neutral.gray600} />
            </View>

            <View style={styles.details}>
              <View style={styles.titleRow}>
                <Text style={styles.titleLocked} numberOfLines={1}>
                  Nota protegida
                </Text>
              </View>
              <Text style={styles.previewLocked} numberOfLines={1}>
                Desbloquea para ver el contenido
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.iconCircle, { backgroundColor: `${note.colorTag}22` }]}>
              <FileText size={17} color={note.colorTag} />
            </View>

            <View style={styles.details}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {note.title || 'Sin Título'}
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.preview} numberOfLines={1}>
                  {note.content}
                </Text>
                {!!note.reminderDate && (
                  <View style={styles.reminderBadge}>
                    <Clock size={9} color="#D97706" />
                    <Text style={styles.reminderText} numberOfLines={1}>
                      {note.reminderDate.split('•')[0].trim()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.metaCol}>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <TouchableOpacity onPress={onToggleFavorite} style={styles.starBtn} activeOpacity={0.7}>
            <Star
              size={15}
              color={note.isFavorite ? '#F59E0B' : colors.neutral.gray400}
              fill={note.isFavorite ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
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
  iconCircleLocked: {
    backgroundColor: colors.neutral.gray100,
  },
  titleLocked: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  previewLocked: {
    fontSize: 11.5,
    fontWeight: '400',
    color: colors.neutral.gray400,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  preview: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.brand.primary + '15',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  reminderText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.brand.primary,
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
  actionsPanel: {
    flexDirection: 'row',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 150,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  editBtn: {
    backgroundColor: colors.neutral.gray100,
  },
  deleteBtn: {
    backgroundColor: colors.semantic.error + '15',
  },
  actionText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.text,
    textTransform: 'uppercase',
  },
});
