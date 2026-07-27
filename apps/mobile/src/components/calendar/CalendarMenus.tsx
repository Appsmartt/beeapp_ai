
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Calendar as CalendarIcon, Video, Edit2, Copy, Trash2, Eye } from 'lucide-react-native';
import { CalendarEvent } from '../../stores/calendarStore';

export const FAB_BOTTOM_OFFSET = 105;

interface CalendarContextMenuProps {
  visible: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onViewDetail: (event: CalendarEvent) => void;
  onEdit: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}

export function CalendarContextMenu({ visible, event, onClose, onViewDetail, onEdit, onDuplicate, onDelete }: CalendarContextMenuProps) {
  return (
    <Modal transparent visible={visible} animationType="slide">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.contextMenuSheet}>
          {event && (
            <>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle} numberOfLines={1}>{event.title}</Text>
                <Text style={styles.menuSub}>
                  {event.type === 'meeting' ? 'Reunión Virtual' : 'Evento Presencial'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  onViewDetail(event);
                }}
              >
                <Eye size={18} color={colors.neutral.text} />
                <Text style={styles.menuRowText}>Ver detalle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  onEdit(event);
                }}
              >
                <Edit2 size={18} color={colors.neutral.text} />
                <Text style={styles.menuRowText}>Editar reunión/evento</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuRow} onPress={() => onDuplicate(event)}>
                <Copy size={18} color={colors.neutral.text} />
                <Text style={styles.menuRowText}>Duplicar en Hoy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRow, { borderBottomWidth: 0 }]}
                onPress={() => onDelete(event)}
              >
                <Trash2 size={18} color={colors.semantic.error} />
                <Text style={[styles.menuRowText, { color: colors.semantic.error }]}>Eliminar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface CalendarFabMenuProps {
  visible: boolean;
  onClose: () => void;
  onAction: (type: 'meeting' | 'event') => void;
  /** Embedded in Home: the trigger lives in the header, menu drops from the top */
  embedded?: boolean;
}

export function CalendarFabMenu({ visible, onClose, onAction, embedded }: CalendarFabMenuProps) {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={styles.fabBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.fabMenuContainer, embedded ? styles.fabMenuTop : { bottom: FAB_BOTTOM_OFFSET + 65 }]}>
          <TouchableOpacity style={styles.fabMenuRow} onPress={() => onAction('meeting')}>
            <Video size={16} color={colors.brand.primary} />
            <Text style={styles.fabMenuText}>Nueva reunión (con video)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.fabMenuRow, { borderBottomWidth: 0 }]} onPress={() => onAction('event')}>
            <CalendarIcon size={16} color={colors.brand.primary} />
            <Text style={styles.fabMenuText}>Nuevo evento (presencial)</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  contextMenuSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  menuHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    paddingBottom: 12,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  menuSub: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginTop: 2,
    fontWeight: '400',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    gap: 12,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  fabBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.1)',
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  fabMenuTop: {
    top: 120,
    right: 26,
  },
  fabMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    gap: 10,
  },
  fabMenuText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});
