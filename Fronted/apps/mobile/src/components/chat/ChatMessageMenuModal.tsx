import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Reply, Pencil, Forward, Pin, Copy, Trash2, Bomb } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

export type ChatMessageAction =
  | 'reply'
  | 'edit'
  | 'forward'
  | 'pin'
  | 'copy'
  | 'delete'
  | 'destroy';

interface ChatMessageMenuModalProps {
  visible: boolean;
  isUser: boolean;
  isPinned?: boolean;
  isDestroyed?: boolean;
  onClose: () => void;
  onSelectAction: (action: ChatMessageAction) => void;
}

export default function ChatMessageMenuModal({
  visible,
  isUser,
  isPinned,
  isDestroyed,
  onClose,
  onSelectAction,
}: ChatMessageMenuModalProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.menuCard}>
              {/* 1. Responder */}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction('reply')}
              >
                <Reply size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>Responder</Text>
              </TouchableOpacity>

              {/* 2. Editar (Solo mensajes propios y no destruidos) */}
              {isUser && !isDestroyed && (
                <TouchableOpacity
                  style={styles.menuRow}
                  activeOpacity={0.7}
                  onPress={() => onSelectAction('edit')}
                >
                  <Pencil size={18} color={colors.neutral.gray700} />
                  <Text style={styles.menuText}>Editar</Text>
                </TouchableOpacity>
              )}

              {/* 3. Reenviar */}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction('forward')}
              >
                <Forward size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>Reenviar</Text>
              </TouchableOpacity>

              {/* 4. Fijar mensaje */}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction('pin')}
              >
                <Pin size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>
                  {isPinned ? 'Desfijar mensaje' : 'Fijar mensaje'}
                </Text>
              </TouchableOpacity>

              {/* 5. Copiar */}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction('copy')}
              >
                <Copy size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>Copiar</Text>
              </TouchableOpacity>

              {/* 6. Eliminar */}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction('delete')}
              >
                <Trash2 size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>Eliminar</Text>
              </TouchableOpacity>

              {/* 7. Destruir (Rojo) */}
              <TouchableOpacity
                style={[styles.menuRow, styles.lastRow]}
                activeOpacity={0.7}
                onPress={() => onSelectAction('destroy')}
              >
                <Bomb size={18} color="#EF4444" />
                <Text style={[styles.menuText, styles.destroyText]}>Destruir</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: 260,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  destroyText: {
    color: '#EF4444',
  },
});
