import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Folder } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import type {
  StorageItem,
} from '../../stores/storageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MoveFolderModalProps {
  visible: boolean;
  items: StorageItem[];
  activeItem: StorageItem | null;
  currentFolderId: string | null;
  onMove: (targetFolderId: string | null) => void;
  onClose: () => void;
}

function getDescendantFolderIds(
  folders: StorageItem[],
  parentFolderId: string,
): Set<string> {
  const blockedIds = new Set<string>([parentFolderId]);
  let changed = true;

  while (changed) {
    changed = false;

    folders.forEach((folder) => {
      if (
        folder.parentId
        && blockedIds.has(folder.parentId)
        && !blockedIds.has(folder.id)
      ) {
        blockedIds.add(folder.id);
        changed = true;
      }
    });
  }

  return blockedIds;
}

export function MoveFolderModal({
  visible,
  items,
  activeItem,
  currentFolderId,
  onMove,
  onClose,
}: MoveFolderModalProps) {
  const folders = items.filter(
    (item) => item.type === 'folder',
  );

  const blockedFolderIds =
    activeItem?.type === 'folder'
      ? getDescendantFolderIds(folders, activeItem.id)
      : new Set<string>();

  const availableFolders = folders.filter(
    (folder) => !blockedFolderIds.has(folder.id),
  );

  const isMovingFolder = activeItem?.type === 'folder';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.moveSheet}>
          <Text style={styles.moveTitle}>
            Mover a...
          </Text>

          <Text style={styles.moveSubtitle}>
            {isMovingFolder
              ? 'Selecciona la carpeta de destino. No puedes mover una carpeta dentro de ella misma o de una subcarpeta.'
              : 'Selecciona la carpeta de destino para el archivo.'}
          </Text>

          <ScrollView style={styles.moveList}>
            <TouchableOpacity
              style={[
                styles.moveFolderRow,
                currentFolderId === null
                  && styles.moveFolderRowActive,
              ]}
              onPress={() => onMove(null)}
              activeOpacity={0.7}
            >
              <Folder
                size={18}
                color={colors.brand.primary}
              />

              <Text style={styles.moveFolderText}>
                Inicio (Carpeta raíz)
              </Text>
            </TouchableOpacity>

            {availableFolders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.moveFolderRow,
                  currentFolderId === folder.id
                    && styles.moveFolderRowActive,
                ]}
                onPress={() => onMove(folder.id)}
                activeOpacity={0.7}
              >
                <Folder
                  size={18}
                  color={colors.brand.primary}
                />

                <Text style={styles.moveFolderText}>
                  {folder.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.moveActions}>
            <TouchableOpacity
              style={styles.moveCancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.moveCancelText}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface FolderNameDialogProps {
  visible: boolean;
  mode: 'create' | 'rename';
  itemType?: 'file' | 'folder';
  value: string;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FolderNameDialog({
  visible,
  mode,
  itemType = 'folder',
  value,
  onChangeText,
  onCancel,
  onConfirm,
}: FolderNameDialogProps) {
  const isCreating = mode === 'create';
  const isFile = itemType === 'file';

  const title = isCreating
    ? 'Nueva carpeta'
    : isFile
      ? 'Renombrar archivo'
      : 'Renombrar carpeta';

  const placeholder = isFile
    ? 'Nombre del archivo'
    : 'Nombre de la carpeta';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.dialogBox}>
          <Text style={styles.dialogTitle}>
            {title}
          </Text>

          <TextInput
            style={styles.dialogInput}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral.gray500}
            value={value}
            onChangeText={onChangeText}
            autoFocus
            autoCapitalize="sentences"
            autoCorrect={false}
            onSubmitEditing={onConfirm}
            returnKeyType="done"
          />

          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={styles.dialogBtnCancel}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.dialogBtnCancelText}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dialogBtnConfirm}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.dialogBtnConfirmText}>
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBox: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.neutral.text,
    marginBottom: 20,
    fontWeight: '400',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
  },
  dialogBtnCancelText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  dialogBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
  },
  dialogBtnConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  moveSheet: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  moveTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  moveSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginBottom: 16,
    lineHeight: 17,
  },
  moveList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  moveFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 10,
  },
  moveFolderRowActive: {
    backgroundColor: `${colors.brand.primary}15`,
    borderColor: `${colors.brand.primary}30`,
  },
  moveFolderText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  moveActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  moveCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  moveCancelText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
});