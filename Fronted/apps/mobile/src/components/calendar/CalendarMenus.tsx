import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  Copy,
  Edit2,
  Eye,
  Trash2,
  Video,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  CalendarEvent,
} from '../../stores/calendarStore';


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


function getEventTypeLabel(
  event: CalendarEvent,
): string {
  if (event.backendKind === 'hybrid') {
    return 'Evento híbrido';
  }


  return event.type === 'meeting'
    ? 'Reunión virtual'
    : 'Evento presencial';
}


export function CalendarContextMenu({
  visible,
  event,
  onClose,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
}: CalendarContextMenuProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />


        <View style={styles.contextMenuSheet}>
          {event && (
            <>
              <View style={styles.menuHeader}>
                <Text
                  style={styles.menuTitle}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>


                <Text style={styles.menuSub}>
                  {getEventTypeLabel(event)}
                </Text>
              </View>


              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  onViewDetail(event);
                }}
                activeOpacity={0.7}
              >
                <Eye
                  size={18}
                  color={colors.neutral.text}
                />


                <Text style={styles.menuRowText}>
                  Ver detalle
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  onClose();
                  onEdit(event);
                }}
                activeOpacity={0.7}
              >
                <Edit2
                  size={18}
                  color={colors.neutral.text}
                />


                <Text style={styles.menuRowText}>
                  Editar evento
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => onDuplicate(event)}
                activeOpacity={0.7}
              >
                <Copy
                  size={18}
                  color={colors.neutral.text}
                />


                <Text style={styles.menuRowText}>
                  Duplicar en fecha seleccionada
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.menuRow,
                  styles.menuRowLast,
                ]}
                onPress={() => onDelete(event)}
                activeOpacity={0.7}
              >
                <Trash2
                  size={18}
                  color={colors.semantic.error}
                />


                <Text
                  style={[
                    styles.menuRowText,
                    styles.menuRowTextDanger,
                  ]}
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}


interface CalendarFabMenuProps {
  visible: boolean;
  onClose: () => void;
  onAction: (
    type: 'meeting' | 'event',
  ) => void;
  embedded?: boolean;
}


export function CalendarFabMenu({
  visible,
  onClose,
  onAction,
  embedded = false,
}: CalendarFabMenuProps) {
  if (!visible) {
    return null;
  }


  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.fabBackdrop}>
        <TouchableOpacity
          style={styles.fabBackdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />


        <View
          style={[
            styles.fabMenuContainer,
            embedded
              ? styles.fabMenuTop
              : styles.fabMenuBottom,
          ]}
        >
          <TouchableOpacity
            style={styles.fabMenuRow}
            onPress={() => onAction('meeting')}
            activeOpacity={0.7}
          >
            <Video
              size={16}
              color={colors.brand.primary}
            />


            <Text style={styles.fabMenuText}>
              Nueva reunión virtual
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={[
              styles.fabMenuRow,
              styles.fabMenuRowLast,
            ]}
            onPress={() => onAction('event')}
            activeOpacity={0.7}
          >
            <CalendarIcon
              size={16}
              color={colors.brand.primary}
            />


            <Text style={styles.fabMenuText}>
              Nuevo evento presencial
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  contextMenuSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
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
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  menuRowTextDanger: {
    color: colors.semantic.error,
  },
  fabBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.1)',
  },
  fabBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    width: 232,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  fabMenuBottom: {
    bottom: FAB_BOTTOM_OFFSET + 65,
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
  fabMenuRowLast: {
    borderBottomWidth: 0,
  },
  fabMenuText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});