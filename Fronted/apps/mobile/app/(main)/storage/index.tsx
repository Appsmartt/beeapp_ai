import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from 'expo-router';

import {
  createStorageFileShare,
  createStorageFolder,
  createStorageTag,
  getReceivedStorageShares,
  getStorageFiles,
  getStorageFolders,
  getStorageSummary,
  getStorageTags,
  moveStorageFileToTrash,
  replaceStorageFileTags,
  uploadStorageFiles,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  FileSharePermission,
  StorageFile,
  StorageFolder,
  StorageShareRecipient,
  StorageSummary,
} from '@beeapp/shared-types';
import { colors } from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import StorageCategoryChips from '../../../src/components/storage/StorageCategoryChips';
import StorageCategoryModals from '../../../src/components/storage/StorageCategoryModals';
import StorageContextMenu from '../../../src/components/storage/StorageContextMenu';
import {
  FolderNameDialog,
  MoveFolderModal,
} from '../../../src/components/storage/StorageDialogs';
import StorageFabMenu from '../../../src/components/storage/StorageFabMenu';
import StorageHeader from '../../../src/components/storage/StorageHeader';
import StorageItemsView from '../../../src/components/storage/StorageItemsView';
import StorageShareModal from '../../../src/components/storage/StorageShareModal';
import {
  StorageBreadcrumbs,
  StorageFilterChips,
  StorageSummaryCard,
} from '../../../src/components/storage/StorageSummaryFilters';
import PinLockModal from '../../../src/components/security/PinLockModal';
import {
  getProtectedIds,
  hasPin,
  isProtected,
  setProtected,
} from '../../../src/stores/pinStore';
import {
  getItems,
  getStorageCategories,
  mapStorageFileToItem,
  mapStorageFolderToItem,
  mapStorageTagToCategory,
  setItems,
  setStorageCategories,
  setStorageSummary,
  type StorageCategory,
  type StorageItem,
} from '../../../src/stores/storageStore';
import {
  getFilteredItems,
  type SortOption,
  type StorageFilter,
} from '../../../src/utils/storageHelpers';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import type {
  ViewMode,
} from '../../../src/components/layout/ViewModeToggle';


const MAX_FILE_SIZE_BYTES = 52_428_800;


function getFolderItemCounts(
  folders: StorageFolder[],
  files: StorageFile[],
): Map<string, number> {
  const counts = new Map<string, number>();

  folders.forEach((folder) => {
    counts.set(folder.id, 0);
  });

  files.forEach((file) => {
    if (file.folder_id) {
      counts.set(
        file.folder_id,
        (counts.get(file.folder_id) || 0) + 1,
      );
    }
  });

  folders.forEach((folder) => {
    if (folder.parent_id) {
      counts.set(
        folder.parent_id,
        (counts.get(folder.parent_id) || 0) + 1,
      );
    }
  });

  return counts;
}


export default function StorageIndexScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();

  const [items, setLocalItems] = useState<StorageItem[]>(
    getItems(),
  );

  const [summary, setLocalSummary] =
    useState<StorageSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentFolderId, setCurrentFolderId] =
    useState<string | null>(null);

  const [pathStack, setPathStack] = useState<
    { id: string | null; name: string }[]
  >([
    {
      id: null,
      name: 'Inicio',
    },
  ]);

  const [searchQuery] = useState('');

  const [sortBy, setSortBy] =
    useState<SortOption>('name');

  const [viewMode, setViewMode] =
    useState<ViewMode>('list');

  const [activeFilter, setActiveFilter] =
    useState<StorageFilter>('all');

  const [activeItem, setActiveItem] =
    useState<StorageItem | null>(null);

  const [contextMenuVisible, setContextMenuVisible] =
    useState(false);

  const [storageCategories, setLocalCategories] =
    useState<StorageCategory[]>(
      getStorageCategories(),
    );

  const [activeCategoryId, setActiveCategoryId] =
    useState<string | null>(null);

  const [createCategoryVisible, setCreateCategoryVisible] =
    useState(false);

  const [assignCategoryVisible, setAssignCategoryVisible] =
    useState(false);

  const [protectedIds, setProtectedIds] = useState<string[]>(
    getProtectedIds(),
  );

  const [lockedItem, setLockedItem] =
    useState<StorageItem | null>(null);

  const [folderModalVisible, setFolderModalVisible] =
    useState(false);

  const [folderModalMode, setFolderModalMode] = useState<
    'create' | 'rename'
  >('create');

  const [folderNameInput, setFolderNameInput] =
    useState('');

  const [moveModalVisible, setMoveModalVisible] =
    useState(false);

  const [fabMenuVisible, setFabMenuVisible] =
    useState(false);

  const [sharedItems, setSharedItems] = useState<
    StorageItem[]
  >([]);

  const [shareModalVisible, setShareModalVisible] =
    useState(false);

  const [shareAuth, setShareAuth] =
    useState<AuthCredentials | null>(null);

  const [sharing, setSharing] = useState(false);


  const syncLocalItems = useCallback(
    (nextItems: StorageItem[]) => {
      setItems(nextItems);
      setLocalItems(nextItems);
    },
    [],
  );


  const loadStorage = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const auth = await getValidSessionCredentials();

        if (!auth) {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        const [
          summaryResponse,
          foldersResponse,
          filesResponse,
          tagsResponse,
        ] = await Promise.all([
          getStorageSummary(auth),
          getStorageFolders(auth, {}),
          getStorageFiles(auth, {
            status: 'ready',
            scope: 'recent',
            limit: 100,
            offset: 0,
          }),
          getStorageTags(auth),
        ]);

        const folderCounts = getFolderItemCounts(
          foldersResponse.folders,
          filesResponse.files,
        );

        const nextCategories = tagsResponse.tags.map(
          mapStorageTagToCategory,
        );

        const nextItems = [
          ...foldersResponse.folders.map((folder) =>
            mapStorageFolderToItem(
              folder,
              folderCounts.get(folder.id) || 0,
            ),
          ),
          ...filesResponse.files.map((file) =>
            mapStorageFileToItem(file),
          ),
        ];

        setStorageCategories(nextCategories);
        setLocalCategories(nextCategories);

        setStorageSummary(summaryResponse.storage);
        setLocalSummary(summaryResponse.storage);

        syncLocalItems(nextItems);
      } catch (error) {
        Alert.alert(
          'No fue posible cargar archivos',
          error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [syncLocalItems],
  );


  const loadSharedFiles = useCallback(
    async () => {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const response = await getReceivedStorageShares(
        auth,
      );

      const nextSharedItems = response.shares
        .filter((share) => Boolean(share.file))
        .map((share) =>
          mapStorageFileToItem(
            share.file as StorageFile,
            {
              isShared: true,
              shareId: share.id,
            },
          ),
        );

      setSharedItems(nextSharedItems);
    },
    [],
  );


  useEffect(() => {
    void loadStorage();
  }, [loadStorage]);


  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        void loadStorage(true);
      },
    );

    return unsubscribe;
  }, [loadStorage, navigation]);


  useEffect(() => {
    if (activeFilter !== 'shared') {
      return;
    }

    void loadSharedFiles()
      .catch((error) => {
        Alert.alert(
          'No fue posible cargar compartidos',
          error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
      });
  }, [activeFilter, loadSharedFiles]);


  const handleBreadcrumbPress = (
    index: number,
  ) => {
    const nextStack = pathStack.slice(0, index + 1);

    setPathStack(nextStack);

    setCurrentFolderId(
      nextStack[nextStack.length - 1].id,
    );

    setFabMenuVisible(false);
  };


  const handleFolderPress = (
    folder: StorageItem,
  ) => {
    setPathStack([
      ...pathStack,
      {
        id: folder.id,
        name: folder.name,
      },
    ]);

    setCurrentFolderId(folder.id);
    setFabMenuVisible(false);
  };


  const openItemContent = (
    item: StorageItem,
  ) => {
    if (item.type === 'folder') {
      handleFolderPress(item);
      return;
    }

    router.push({
      pathname: '/(main)/storage/preview',
      params: {
        id: item.id,
      },
    });
  };


  const handleOpenItem = (
    item: StorageItem,
  ) => {
    if (isProtected(item.id)) {
      setLockedItem(item);
      return;
    }

    openItemContent(item);
  };


  const handleToggleProtect = (
    item: StorageItem,
  ) => {
    if (!hasPin()) {
      Alert.alert(
        'Configura tu PIN',
        (
          'Primero crea tu PIN de protección en '
          + 'Perfil → Seguridad.'
        ),
      );
      return;
    }

    const wasProtected = isProtected(item.id);

    setProtectedIds([
      ...setProtected(item.id, !wasProtected),
    ]);

    Alert.alert(
      wasProtected
        ? 'Protección retirada'
        : 'Elemento protegido',
    );
  };


  const handleCreateFolder = async () => {
    const name = folderNameInput.trim();

    if (!name) {
      return;
    }

    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await createStorageFolder(auth, {
        name,
        parent_id: currentFolderId,
      });

      setFolderModalVisible(false);
      setFolderNameInput('');

      await loadStorage(true);
    } catch (error) {
      Alert.alert(
        'No fue posible crear la carpeta',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleRenameItem = () => {
    Alert.alert(
      'Próximamente',
      (
        'Renombrar carpetas y archivos se conectará '
        + 'cuando el backend exponga esos endpoints.'
      ),
    );

    setFolderModalVisible(false);
    setFolderNameInput('');
    setActiveItem(null);
  };


  const handleDeleteItem = async (
    item: StorageItem,
  ) => {
    if (item.type === 'folder') {
      Alert.alert(
        'Próximamente',
        (
          'La eliminación de carpetas se conectará '
          + 'en una siguiente iteración.'
        ),
      );
      return;
    }

    Alert.alert(
      'Mover a papelera',
      `¿Deseas mover “${item.name}” a la papelera?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            try {
              const auth =
                await getValidSessionCredentials();

              if (!auth) {
                throw new Error(
                  (
                    'Tu sesión expiró. '
                    + 'Inicia sesión nuevamente.'
                  ),
                );
              }

              await moveStorageFileToTrash(
                auth,
                item.id,
              );

              setContextMenuVisible(false);
              setActiveItem(null);

              await loadStorage(true);
            } catch (error) {
              Alert.alert(
                'No fue posible mover el archivo',
                error instanceof Error
                  ? error.message
                  : 'Intenta nuevamente.',
              );
            }
          },
        },
      ],
    );
  };


  const handleMoveItem = () => {
    Alert.alert(
      'Próximamente',
      (
        'Mover archivos entre carpetas requiere '
        + 'un endpoint backend adicional.'
      ),
    );

    setMoveModalVisible(false);
    setContextMenuVisible(false);
    setActiveItem(null);
  };


  const handleUpload = async (
    mode: 'document' | 'image' | 'video',
  ) => {
    setFabMenuVisible(false);

    const type =
      mode === 'image'
        ? 'image/*'
        : mode === 'video'
          ? 'video/*'
          : '*/*';

    const result = await DocumentPicker.getDocumentAsync({
      type,
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const tooLargeAsset = result.assets.find(
      (asset) =>
        asset.size !== undefined
        && asset.size > MAX_FILE_SIZE_BYTES,
    );

    if (tooLargeAsset) {
      Alert.alert(
        'Archivo demasiado grande',
        (
          'Cada archivo debe pesar máximo 50 MB. '
          + `“${tooLargeAsset.name}” supera ese límite.`
        ),
      );
      return;
    }

    try {
      setUploading(true);

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const formData = new FormData();

      result.assets.forEach((asset) => {
        formData.append(
          'files',
          {
            uri: asset.uri,
            name: asset.name || 'archivo',
            type: asset.mimeType
              || 'application/octet-stream',
          } as unknown as Blob,
        );
      });

      if (currentFolderId) {
        formData.append('folder_id', currentFolderId);
      }

      const uploadResponse = await uploadStorageFiles(
        auth,
        formData,
      );

      await loadStorage(true);

      if (uploadResponse.failure_count > 0) {
        Alert.alert(
          'Carga completada parcialmente',
          (
            `${uploadResponse.success_count} archivo(s) `
            + 'se subieron correctamente. '
            + `${uploadResponse.failure_count} no pudieron subirse.`
          ),
        );
        return;
      }

      Alert.alert(
        'Archivos subidos',
        (
          `${uploadResponse.success_count} archivo(s) `
          + 'se guardaron correctamente.'
        ),
      );
    } catch (error) {
      Alert.alert(
        'No fue posible subir los archivos',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setUploading(false);
    }
  };


  const handleCreateCategory = async (
    data: Omit<StorageCategory, 'id'>,
  ) => {
    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await createStorageTag(auth, {
        name: data.name,
        icon: data.icon,
        color: data.color,
      });

      setCreateCategoryVisible(false);

      await loadStorage(true);
    } catch (error) {
      Alert.alert(
        'No fue posible crear la categoría',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleAssignCategories = async (
    categoryIds: string[],
  ) => {
    if (!activeItem || activeItem.type === 'folder') {
      return;
    }

    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await replaceStorageFileTags(
        auth,
        activeItem.id,
        {
          tag_ids: categoryIds,
        },
      );

      setAssignCategoryVisible(false);
      setActiveItem(null);

      await loadStorage(true);
    } catch (error) {
      Alert.alert(
        'No fue posible actualizar las categorías',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleOpenShare = async () => {
    if (!activeItem || activeItem.type === 'folder') {
      Alert.alert(
        'No disponible',
        'Solo puedes compartir archivos.',
      );
      return;
    }

    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      setShareAuth(auth);
      setContextMenuVisible(false);
      setShareModalVisible(true);
    } catch (error) {
      Alert.alert(
        'No fue posible preparar el compartido',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleShare = async (
    recipient: StorageShareRecipient,
    permission: FileSharePermission,
  ) => {
    if (!activeItem || !shareAuth) {
      throw new Error(
        'No fue posible identificar el archivo o la sesión.',
      );
    }

    try {
      setSharing(true);

      await createStorageFileShare(
        shareAuth,
        activeItem.id,
        {
          recipient_id: recipient.id,
          permission,
        },
      );

      setShareModalVisible(false);
      setActiveItem(null);

      Alert.alert(
        'Archivo compartido',
        (
          `“${activeItem.name}” fue compartido con `
          + `${recipient.first_name} ${recipient.last_name}.`
        ),
      );
    } finally {
      setSharing(false);
    }
  };


  const visibleItems = useMemo(() => {
    if (activeFilter === 'shared') {
      return getFilteredItems(
        sharedItems,
        searchQuery,
        currentFolderId,
        'all',
        sortBy,
      );
    }

    return getFilteredItems(
      items,
      searchQuery,
      currentFolderId,
      activeFilter,
      sortBy,
    ).filter((item) => {
      if (!activeCategoryId) {
        return true;
      }

      return item.categoryIds?.includes(
        activeCategoryId,
      );
    });
  }, [
    activeCategoryId,
    activeFilter,
    currentFolderId,
    items,
    searchQuery,
    sharedItems,
    sortBy,
  ]);


  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <StorageHeader
          onBack={
            router.canGoBack
              ? () => router.back()
              : undefined
          }
          onAction={
            router.embedded
              ? () =>
                setFabMenuVisible(
                  (visible) => !visible,
                )
              : undefined
          }
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ScrollView
          style={styles.scrollList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadStorage(true)}
              tintColor={colors.brand.primary}
            />
          }
        >
          <StorageSummaryCard
            summary={summary}
            loading={loading}
          />

          <StorageFilterChips
            activeFilter={activeFilter}
            onChange={setActiveFilter}
          />

          <StorageCategoryChips
            categories={storageCategories}
            activeCategoryId={activeCategoryId}
            onChange={setActiveCategoryId}
            onCreate={() =>
              setCreateCategoryVisible(true)
            }
          />

          {!searchQuery && activeFilter !== 'shared' && (
            <StorageBreadcrumbs
              pathStack={pathStack}
              onPress={handleBreadcrumbPress}
            />
          )}

          <StorageItemsView
            items={visibleItems}
            protectedIds={protectedIds}
            onOpenItem={handleOpenItem}
            onOpenMenu={(item) => {
              setActiveItem(item);
              setContextMenuVisible(true);
            }}
            viewMode={viewMode}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <StorageContextMenu
          visible={contextMenuVisible}
          item={activeItem}
          onClose={() => setContextMenuVisible(false)}
          onOpenItem={handleOpenItem}
          isProtected={
            activeItem
              ? protectedIds.includes(activeItem.id)
              : false
          }
          onToggleProtect={handleToggleProtect}
          onRename={() => {
            if (!activeItem) {
              return;
            }

            setFolderModalMode('rename');
            setFolderNameInput(activeItem.name);
            setContextMenuVisible(false);
            setFolderModalVisible(true);
          }}
          onMove={() => setMoveModalVisible(true)}
          onShare={() => {
            void handleOpenShare();
          }}
          onDownload={() => {
            if (!activeItem) {
              return;
            }

            router.push({
              pathname: '/(main)/storage/preview',
              params: {
                id: activeItem.id,
                download: 'true',
              },
            });

            setContextMenuVisible(false);
          }}
          onSign={(item) => {
            router.push({
              pathname: '/(main)/storage/sign',
              params: {
                id: item.id,
              },
            });
          }}
          onDelete={handleDeleteItem}
          onAssignCategory={(item) => {
            if (item.type === 'folder') {
              Alert.alert(
                'No disponible',
                'Las categorías solo se asignan a archivos.',
              );
              return;
            }

            setActiveItem(item);
            setContextMenuVisible(false);
            setAssignCategoryVisible(true);
          }}
        />

        <MoveFolderModal
          visible={moveModalVisible}
          items={items}
          activeItem={activeItem}
          currentFolderId={currentFolderId}
          onMove={handleMoveItem}
          onClose={() => setMoveModalVisible(false)}
        />

        <FolderNameDialog
          visible={folderModalVisible}
          mode={folderModalMode}
          value={folderNameInput}
          onChangeText={setFolderNameInput}
          onCancel={() => setFolderModalVisible(false)}
          onConfirm={
            folderModalMode === 'create'
              ? handleCreateFolder
              : handleRenameItem
          }
        />

        <PinLockModal
          visible={!!lockedItem}
          itemName={lockedItem?.name}
          onClose={() => setLockedItem(null)}
          onSuccess={() => {
            const item = lockedItem;

            setLockedItem(null);

            if (item) {
              openItemContent(item);
            }
          }}
        />

        <StorageFabMenu
          embedded={router.embedded}
          menuVisible={fabMenuVisible}
          uploadDisabled={uploading}
          onToggleMenu={() =>
            setFabMenuVisible(
              (visible) => !visible,
            )
          }
          onCloseMenu={() => setFabMenuVisible(false)}
          onCreateFolder={() => {
            setFabMenuVisible(false);
            setFolderModalMode('create');
            setFolderNameInput('');
            setFolderModalVisible(true);
          }}
          onUpload={handleUpload}
        />

        {!router.embedded && (
          <FloatingTabBar activeTab="explore" />
        )}

        <StorageCategoryModals
          createVisible={createCategoryVisible}
          onCreate={handleCreateCategory}
          onCloseCreate={() =>
            setCreateCategoryVisible(false)
          }
          assignVisible={assignCategoryVisible}
          itemName={activeItem?.name}
          categories={storageCategories}
          selectedIds={activeItem?.categoryIds || []}
          onSave={handleAssignCategories}
          onCloseAssign={() =>
            setAssignCategoryVisible(false)
          }
        />

        <StorageShareModal
          visible={shareModalVisible}
          fileName={activeItem?.name}
          auth={shareAuth}
          submitting={sharing}
          onClose={() => {
            if (sharing) {
              return;
            }

            setShareModalVisible(false);
          }}
          onShare={handleShare}
        />
      </View>
    </ScreenSafeArea>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  scrollList: {
    flex: 1,
  },
  bottomSpacer: {
    height: 160,
  },
});