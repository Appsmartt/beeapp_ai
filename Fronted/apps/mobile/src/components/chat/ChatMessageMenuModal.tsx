import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Reply, Copy } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

export type ChatMessageAction =
  | 'reply'
  | 'edit'
  | 'forward'
  | 'pin'
  | 'copy'
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
              {/* Responder */}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction('reply')}
              >
                <Reply size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>Responder</Text>
              </TouchableOpacity>

              {/* Copiar */}
              <TouchableOpacity
                style={[styles.menuRow, styles.lastRow]}
                activeOpacity={0.7}
                onPress={() => onSelectAction('copy')}
              >
                <Copy size={18} color={colors.neutral.gray700} />
                <Text style={styles.menuText}>Copiar</Text>
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
    backgroundColor: 'rgba(34, 43, 67, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: 260,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    paddingVertical: 6,
    shadowColor: '#8D9ABE',
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
});
