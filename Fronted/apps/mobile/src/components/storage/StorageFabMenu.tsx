import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  FilePlus,
  FolderPlus,
  Image as ImageIcon,
  Plus,
  Video as VideoIcon,
} from 'lucide-react-native';

export const FAB_BOTTOM_OFFSET = 105;

interface StorageFabMenuProps {
  embedded?: boolean;
  menuVisible: boolean;
  uploadDisabled?: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onCreateFolder: () => void;
  onUpload: (
    mode: 'document' | 'image' | 'video',
  ) => void;
}

export default function StorageFabMenu({
  embedded,
  menuVisible,
  uploadDisabled = false,
  onToggleMenu,
  onCloseMenu,
  onCreateFolder,
  onUpload,
}: StorageFabMenuProps) {
  return (
    <>
      {menuVisible && (
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={onCloseMenu}
        >
          <TouchableOpacity
            style={styles.fabBackdrop}
            activeOpacity={1}
            onPress={onCloseMenu}
          >
            <View
              style={[
                styles.fabMenuContainer,
                embedded
                  ? styles.fabMenuTop
                  : {
                    bottom: FAB_BOTTOM_OFFSET + 65,
                  },
              ]}
            >
              <TouchableOpacity
                style={styles.fabMenuRow}
                onPress={onCreateFolder}
                activeOpacity={0.8}
              >
                <FolderPlus
                  size={16}
                  color={colors.brand.primary}
                />
                <Text style={styles.fabMenuText}>
                  Crear carpeta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabMenuRow}
                onPress={() => onUpload('document')}
                activeOpacity={0.8}
                disabled={uploadDisabled}
              >
                <FilePlus
                  size={16}
                  color={colors.brand.primary}
                />
                <Text
                  style={[
                    styles.fabMenuText,
                    uploadDisabled && styles.disabledText,
                  ]}
                >
                  Subir archivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabMenuRow}
                onPress={() => onUpload('image')}
                activeOpacity={0.8}
                disabled={uploadDisabled}
              >
                <ImageIcon
                  size={16}
                  color={colors.brand.primary}
                />
                <Text
                  style={[
                    styles.fabMenuText,
                    uploadDisabled && styles.disabledText,
                  ]}
                >
                  Subir foto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.fabMenuRow,
                  styles.lastMenuRow,
                ]}
                onPress={() => onUpload('video')}
                activeOpacity={0.8}
                disabled={uploadDisabled}
              >
                <VideoIcon
                  size={16}
                  color={colors.brand.primary}
                />
                <Text
                  style={[
                    styles.fabMenuText,
                    uploadDisabled && styles.disabledText,
                  ]}
                >
                  Subir video
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {!embedded && (
        <TouchableOpacity
          style={styles.createFab}
          onPress={onToggleMenu}
          activeOpacity={0.8}
        >
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
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  fabMenuText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  disabledText: {
    color: colors.neutral.gray400,
  },
});