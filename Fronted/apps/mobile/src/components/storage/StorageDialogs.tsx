
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Dimensions } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Folder } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MoveFolderModalProps {
  visible: boolean;
  items: StorageItem[];
  activeItem: StorageItem | null;
  currentFolderId: string | null;
  onMove: (targetFolderId: string | null) => void;
  onClose: () => void;
}

export function MoveFolderModal({ visible, items, activeItem, currentFolderId, onMove, onClose }: MoveFolderModalProps) {
  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.moveSheet}>
          <Text style={styles.moveTitle}>Mover a...</Text>
          <Text style={styles.moveSubtitle}>Selecciona la carpeta de destino para el archivo</Text>

          <ScrollView style={styles.moveList}>
            {/* Root Option */}
            <TouchableOpacity
              style={[styles.moveFolderRow, currentFolderId === null && styles.moveFolderRowActive]}
              onPress={() => onMove(null)}
            >
              <Folder size={18} color={colors.brand.primary} />
              <Text style={styles.moveFolderText}>Inicio (Carpeta Raíz)</Text>
            </TouchableOpacity>

            {/* Subfolders list */}
            {items
              .filter((i) => i.type === 'folder' && i.id !== activeItem?.id)
              .map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.moveFolderRow, currentFolderId === f.id && styles.moveFolderRowActive]}
                  onPress={() => onMove(f.id)}
                >
                  <Folder size={18} color={colors.brand.primary} />
                  <Text style={styles.moveFolderText}>{f.name}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          <View style={styles.moveActions}>
            <TouchableOpacity style={styles.moveCancelBtn} onPress={onClose}>
              <Text style={styles.moveCancelText}>Cancelar</Text>
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
  value: string;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FolderNameDialog({ visible, mode, value, onChangeText, onCancel, onConfirm }: FolderNameDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.dialogBox}>
          <Text style={styles.dialogTitle}>
            {mode === 'create' ? 'Nueva Carpeta' : 'Renombrar'}
          </Text>
          <TextInput
            style={styles.dialogInput}
            placeholder="Nombre de la carpeta"
            placeholderTextColor={colors.neutral.gray500}
            value={value}
            onChangeText={onChangeText}
            autoFocus
          />
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtnCancel} onPress={onCancel}>
              <Text style={styles.dialogBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogBtnConfirm} onPress={onConfirm}>
              <Text style={styles.dialogBtnConfirmText}>Confirmar</Text>
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
    shadowOffset: { width: 0, height: 10 },
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
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary + '30',
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
