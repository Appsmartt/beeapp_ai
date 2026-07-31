import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Lock, Unlock, Pin, BellOff, Trash2, FolderPlus, Archive } from 'lucide-react-native';
import { ChatItem } from '../../mocks/chats';

interface ChatOptionsSheetProps {
  chat: ChatItem | null;
  isProtected: boolean;
  onToggleProtection: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onAssignCategory: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onClose: () => void;
}

export default function ChatOptionsSheet({
  chat,
  isProtected,
  onToggleProtection,
  onTogglePin,
  onToggleMute,
  onAssignCategory,
  onDelete,
  onArchive,
  onClose,
}: ChatOptionsSheetProps) {
  const handleArchive = () => {
    onClose();
    if (onArchive) {
      onArchive();
    } else {
      alert('Chat archivado (Mock)');
    }
  };

  return (
    <Modal visible={!!chat} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.sheetTitle}>{chat?.name}</Text>

          {chat && (
            <>
              <TouchableOpacity style={styles.sheetBtn} onPress={onTogglePin}>
                <Pin size={18} color={colors.neutral.text} style={styles.sheetIcon} />
                <Text style={styles.sheetBtnText}>{chat.isPinned ? 'Desfijar chat' : 'Fijar chat'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetBtn} onPress={onToggleMute}>
                <BellOff size={18} color={colors.neutral.text} style={styles.sheetIcon} />
                <Text style={styles.sheetBtnText}>
                  {chat.isMuted ? 'Activar notificaciones' : 'Silenciar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetBtn} onPress={onToggleProtection}>
                {isProtected ? (
                  <Unlock size={18} color={colors.brand.primary} style={styles.sheetIcon} />
                ) : (
                  <Lock size={18} color={colors.brand.primary} style={styles.sheetIcon} />
                )}
                <Text style={styles.sheetBtnText}>
                  {isProtected ? 'Quitar protección' : 'Proteger con PIN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetBtn} onPress={onAssignCategory}>
                <FolderPlus size={18} color={colors.neutral.text} style={styles.sheetIcon} />
                <Text style={styles.sheetBtnText}>Asignar a categoría</Text>
              </TouchableOpacity>

              {!chat.isAI && (
                <TouchableOpacity style={styles.sheetBtn} onPress={handleArchive}>
                  <Archive size={18} color={colors.neutral.text} style={styles.sheetIcon} />
                  <Text style={styles.sheetBtnText}>Archivar</Text>
                </TouchableOpacity>
              )}

              {!chat.isAI && (
                <TouchableOpacity style={styles.sheetBtn} onPress={onDelete}>
                  <Trash2 size={18} color={colors.semantic.error} style={styles.sheetIcon} />
                  <Text style={[styles.sheetBtnText, styles.sheetBtnTextDanger]}>Eliminar chat</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 18,
    textAlign: 'center',
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  sheetIcon: { marginRight: 12 },
  sheetBtnText: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  sheetBtnTextDanger: { color: colors.semantic.error },
  cancelBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
    marginTop: 12,
    paddingVertical: 14,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '400', color: colors.neutral.gray600 },
});
