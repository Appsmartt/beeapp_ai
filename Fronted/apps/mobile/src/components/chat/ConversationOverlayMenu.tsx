import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { BellOff, Trash2, Reply, Pencil, X } from 'lucide-react-native';
import { ChatMessage } from '../../mocks/chats';

interface MenuProps {
  visible: boolean;
  onClose: () => void;
  onViewInfo: () => void;
  onMute: () => void;
  onClear: () => void;
  onDelete: () => void;
}

export function ConversationOverlayMenu({ visible, onClose, onViewInfo, onMute, onClear, onDelete }: MenuProps) {
  if (!visible) return null;

  return (
    <View style={styles.menuOverlay}>
      <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onViewInfo(); }}>
        <Text style={styles.menuItemText}>Ver info</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onMute(); }}>
        <BellOff size={14} color={colors.neutral.text} style={{ marginRight: 8 }} />
        <Text style={styles.menuItemText}>Silenciar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onClear(); }}>
        <Trash2 size={14} color={colors.semantic.error} style={{ marginRight: 8 }} />
        <Text style={[styles.menuItemText, { color: colors.semantic.error }]}>Vaciar chat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { onClose(); onDelete(); }}>
        <Text style={[styles.menuItemText, { color: colors.semantic.error }]}>Eliminar chat</Text>
      </TouchableOpacity>
    </View>
  );
}

interface PreviewsProps {
  replyTarget: ChatMessage | null;
  chatName: string;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
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
    shadowColor: '#000',
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
    backgroundColor: '#FAF5FF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewBarTitle: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  previewBarText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
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
