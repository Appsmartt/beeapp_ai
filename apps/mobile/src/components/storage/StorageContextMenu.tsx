
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Eye, Edit2, Move, Share2, Download, Trash2, ShieldCheck, Lock, LockOpen, Tag } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';

interface StorageContextMenuProps {
  visible: boolean;
  item: StorageItem | null;
  onClose: () => void;
  onOpenItem: (item: StorageItem) => void;
  onRename: () => void;
  onMove: () => void;
  onShare: () => void;
  onDownload: () => void;
  onSign: (item: StorageItem) => void;
  onDelete: (item: StorageItem) => void;
  /** Whether the item is currently PIN-protected */
  isProtected: boolean;
  onToggleProtect: (item: StorageItem) => void;
  onAssignCategory: (item: StorageItem) => void;
}

export default function StorageContextMenu({
  visible,
  item,
  onClose,
  onOpenItem,
  onRename,
  onMove,
  onShare,
  onDownload,
  onSign,
  onDelete,
  isProtected,
  onToggleProtect,
  onAssignCategory,
}: StorageContextMenuProps) {
  return (
    <Modal transparent visible={visible} animationType="slide">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.contextMenuSheet}>
          {item && (
            <>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.menuSub}>{item.type === 'folder' ? 'Carpeta' : item.size}</Text>
              </View>

              <ScrollView style={{ maxHeight: 350 }}>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => {
                    onClose();
                    onOpenItem(item);
                  }}
                >
                  <Eye size={18} color={colors.neutral.text} />
                  <Text style={styles.menuRowText}>Abrir / Vista previa</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={onRename}>
                  <Edit2 size={18} color={colors.neutral.text} />
                  <Text style={styles.menuRowText}>Renombrar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={onMove}>
                  <Move size={18} color={colors.neutral.text} />
                  <Text style={styles.menuRowText}>Mover a otra carpeta</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={onShare}>
                  <Share2 size={18} color={colors.neutral.text} />
                  <Text style={styles.menuRowText}>Compartir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={onDownload}>
                  <Download size={18} color={colors.neutral.text} />
                  <Text style={styles.menuRowText}>Descargar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => {
                    onClose();
                    onAssignCategory(item);
                  }}
                >
                  <Tag size={18} color={colors.brand.primary} />
                  <Text style={[styles.menuRowText, { color: colors.brand.primary, fontWeight: '400' }]}>
                    Asignar a categoría
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => {
                    onClose();
                    onToggleProtect(item);
                  }}
                >
                  {isProtected ? (
                    <LockOpen size={18} color={colors.brand.primary} />
                  ) : (
                    <Lock size={18} color={colors.brand.primary} />
                  )}
                  <Text style={[styles.menuRowText, { color: colors.brand.primary, fontWeight: '400' }]}>
                    {isProtected ? 'Quitar protección' : 'Proteger con PIN'}
                  </Text>
                </TouchableOpacity>

                {item.type === 'pdf' && (
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => {
                      onClose();
                      onSign(item);
                    }}
                  >
                    <ShieldCheck size={18} color={colors.brand.primary} />
                    <Text style={[styles.menuRowText, { color: colors.brand.primary, fontWeight: '400' }]}>
                      Firmar documento
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.menuRow, { borderBottomWidth: 0 }]}
                  onPress={() => onDelete(item)}
                >
                  <Trash2 size={18} color={colors.semantic.error} />
                  <Text style={[styles.menuRowText, { color: colors.semantic.error }]}>Eliminar</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
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
});
