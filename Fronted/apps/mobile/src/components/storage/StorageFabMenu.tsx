
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Plus, FolderPlus, FilePlus, FileText, Image as ImageIcon, Video as VideoIcon } from 'lucide-react-native';

export const FAB_BOTTOM_OFFSET = 105;

interface StorageFabMenuProps {
  /** Embedded in Home: the trigger lives in the header, menu drops from the top */
  embedded?: boolean;
  menuVisible: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onCreateFolder: () => void;
  onUpload: (type: 'pdf' | 'image' | 'video' | 'doc', customName?: string) => void;
}

export default function StorageFabMenu({ embedded, menuVisible, onToggleMenu, onCloseMenu, onCreateFolder, onUpload }: StorageFabMenuProps) {
  return (
    <>
      {/* FAB Submenu overlay */}
      {menuVisible && (
        <Modal transparent visible={menuVisible} animationType="fade">
          <TouchableOpacity style={styles.fabBackdrop} activeOpacity={1} onPress={onCloseMenu}>
            <View style={[styles.fabMenuContainer, embedded ? styles.fabMenuTop : { bottom: FAB_BOTTOM_OFFSET + 65 }]}>
              <TouchableOpacity style={styles.fabMenuRow} onPress={onCreateFolder} activeOpacity={0.8}>
                <FolderPlus size={16} color={colors.brand.primary} />
                <Text style={styles.fabMenuText}>Crear carpeta</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fabMenuRow} onPress={() => onUpload('pdf')} activeOpacity={0.8}>
                <FilePlus size={16} color={colors.brand.primary} />
                <Text style={styles.fabMenuText}>Subir archivo (Documento)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fabMenuRow} onPress={() => onUpload('image')} activeOpacity={0.8}>
                <ImageIcon size={16} color={colors.brand.primary} />
                <Text style={styles.fabMenuText}>Subir foto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fabMenuRow} onPress={() => onUpload('video')} activeOpacity={0.8}>
                <VideoIcon size={16} color={colors.brand.primary} />
                <Text style={styles.fabMenuText}>Subir video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fabMenuRow, { borderBottomWidth: 0 }]}
                onPress={() => onUpload('pdf', 'Doc_Escaneado_Firma.pdf')}
                activeOpacity={0.8}
              >
                <FileText size={16} color={colors.brand.primary} />
                <Text style={styles.fabMenuText}>Escanear documento</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* FAB Button - only standalone: embedded, the trigger sits in the header */}
      {!embedded && (
        <TouchableOpacity style={styles.createFab} onPress={onToggleMenu} activeOpacity={0.8}>
          <Plus size={24} color={colors.neutral.white} />
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  createFab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  fabBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.1)',
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
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
  fabMenuText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});
