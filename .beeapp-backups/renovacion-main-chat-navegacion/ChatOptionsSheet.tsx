import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Archive,
  BellOff,
  FolderPlus,
  Lock,
  Pin,
  RotateCcw,
  Trash2,
  Unlock,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  ChatListItemModel,
} from '../../services/chatService';

interface ChatOptionsSheetProps {
  chat: ChatListItemModel | null;
  isProtected: boolean;
  onToggleProtection: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onAssignCategory: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
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
  onRestore,
  onClose,
}: ChatOptionsSheetProps) {
  const handleArchiveOrRestore = () => {
    onClose();

    if (chat?.isArchived) {
      onRestore?.();
      return;
    }

    onArchive?.();
  };

  return (
    <Modal
      visible={Boolean(chat)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBg}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.sheetTitle}>
            {chat?.name}
          </Text>

          {chat ? (
            <>
              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={onTogglePin}
              >
                <Pin
                  size={18}
                  color={colors.neutral.text}
                  style={styles.sheetIcon}
                />

                <Text style={styles.sheetBtnText}>
                  {chat.isPinned
                    ? 'Desfijar chat'
                    : 'Fijar chat'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={onToggleMute}
              >
                <BellOff
                  size={18}
                  color={colors.neutral.text}
                  style={styles.sheetIcon}
                />

                <Text style={styles.sheetBtnText}>
                  {chat.isMuted
                    ? 'Activar notificaciones'
                    : 'Silenciar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={onToggleProtection}
              >
                {isProtected ? (
                  <Unlock
                    size={18}
                    color={colors.brand.primary}
                    style={styles.sheetIcon}
                  />
                ) : (
                  <Lock
                    size={18}
                    color={colors.brand.primary}
                    style={styles.sheetIcon}
                  />
                )}

                <Text style={styles.sheetBtnText}>
                  {isProtected
                    ? 'Quitar protección'
                    : 'Proteger con PIN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={onAssignCategory}
              >
                <FolderPlus
                  size={18}
                  color={colors.neutral.text}
                  style={styles.sheetIcon}
                />

                <Text style={styles.sheetBtnText}>
                  Asignar a categoría
                </Text>
              </TouchableOpacity>

              {!chat.isAI ? (
                <TouchableOpacity
                  style={styles.sheetBtn}
                  onPress={handleArchiveOrRestore}
                >
                  {chat.isArchived ? (
                    <RotateCcw
                      size={18}
                      color={colors.neutral.text}
                      style={styles.sheetIcon}
                    />
                  ) : (
                    <Archive
                      size={18}
                      color={colors.neutral.text}
                      style={styles.sheetIcon}
                    />
                  )}

                  <Text style={styles.sheetBtnText}>
                    {chat.isArchived
                      ? 'Restaurar chat'
                      : 'Archivar'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!chat.isAI ? (
                <TouchableOpacity
                  style={styles.sheetBtn}
                  onPress={onDelete}
                >
                  <Trash2
                    size={18}
                    color={colors.semantic.error}
                    style={styles.sheetIcon}
                  />

                  <Text
                    style={[
                      styles.sheetBtnText,
                      styles.sheetBtnTextDanger,
                    ]}
                  >
                    Eliminar chat
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios'
      ? 40
      : 24,
  },
  sheetTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
  },
  sheetBtn: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  sheetIcon: {
    marginRight: 12,
  },
  sheetBtnText: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '400',
  },
  sheetBtnTextDanger: {
    color: colors.semantic.error,
  },
  cancelBtn: {
    alignItems: 'center',
    borderColor: colors.neutral.gray100,
    borderTopWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '400',
  },
});
