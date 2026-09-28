import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Bell, BellOff, Reply, Pencil, X } from 'lucide-react-native';
import type {
  ChatMessageModel,
} from '../../services/chatService';

interface MenuProps {
  visible: boolean;
  isMuted: boolean;
  isUpdatingMute: boolean;
  onClose: () => void;
  onToggleMute: () => void;
}

export function ConversationOverlayMenu({
  visible,
  isMuted,
  isUpdatingMute,
  onClose,
  onToggleMute,
}: MenuProps) {
  if (!visible) return null;

  return (
    <View style={styles.menuOverlay}>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomWidth: 0 }]}
        disabled={isUpdatingMute}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Quitar silencio' : 'Silenciar'}
        onPress={() => {
          onClose();
          onToggleMute();
        }}
      >
        {isMuted
          ? <Bell size={14} color={colors.neutral.text} style={{ marginRight: 8 }} />
          : <BellOff size={14} color={colors.neutral.text} style={{ marginRight: 8 }} />}
        <Text style={styles.menuItemText}>
          {isUpdatingMute ? 'Guardando...' : isMuted ? 'Quitar silencio' : 'Silenciar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface PreviewsProps {
  replyTarget: Pick<
    ChatMessageModel,
    'isUser' | 'senderName' | 'text'
  > | null;
  chatName: string;
  onCancelReply: () => void;
  editingMessage: Pick<
    ChatMessageModel,
    'text'
  > | null;
  onCancelEdit: () => void;
  toastText: string | null;
}

export function ConversationPreviews({
  replyTarget,
  chatName,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  toastText,
}: PreviewsProps) {
  return (
    <>
      {replyTarget && (
        <View style={styles.previewBar}>
          <Reply size={14} color={colors.brand.primary} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewBarTitle}>
              Respondiendo a {replyTarget.isUser ? 'Tú' : replyTarget.senderName || chatName}
            </Text>
            <Text style={styles.previewBarText} numberOfLines={1}>
              {replyTarget.text || 'Mensaje'}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={{ padding: 4 }}>
            <X size={16} color={colors.neutral.gray500} />
          </TouchableOpacity>
        </View>
      )}

      {editingMessage && (
        <View style={styles.previewBar}>
          <Pencil size={14} color={colors.brand.primary} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewBarTitle}>Editando mensaje</Text>
            <Text style={styles.previewBarText} numberOfLines={1}>
              {editingMessage.text}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelEdit} style={{ padding: 4 }}>
            <X size={16} color={colors.neutral.gray500} />
          </TouchableOpacity>
        </View>
      )}

      {toastText && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastText}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 56,
    right: 12,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    width: 140,
    zIndex: 99,
    shadowColor: '#8D9ABE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F0FF',
    borderLeftWidth: 3,
    borderLeftColor: '#A88BE8',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6147A3',
  },
  previewBarText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 3,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 43, 67, 0.80)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 100,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.white,
  },
});
