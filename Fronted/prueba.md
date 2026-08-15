~/Git/beeapp_ai/Fronted/apps/mobile/src/components/home/HomeStorageCard.tsx

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';

export default function HomeStorageCard() {
  return (
    <View style={styles.storageCard}>
      <View style={styles.storageHeaderRow}>
        <View>
          <Text style={styles.storageTitle}>Espacio de Almacenamiento</Text>
          <Text style={styles.planBadge}>Plan BeeApp Plus</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Mejorar</Text>
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      <View style={styles.storageProgressBarContainer}>
        <View style={styles.storageProgressBarTrack}>
          <View style={[styles.storageProgressBarFill, { width: '55%' }]} />
        </View>
        <Text style={styles.storageLimitText}>8.2 GB de 15 GB usados (55%)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  storageCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 24,
  },
  storageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  planBadge: {
    fontSize: 11,
    color: colors.brand.primary,
    fontWeight: '700',
  },
  upgradeBtn: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  upgradeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  storageProgressBarContainer: {
    width: '100%',
  },
  storageProgressBarTrack: {
    height: 8,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  storageProgressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
  },
  storageLimitText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
});


~/Git/beeapp_ai/Fronted/apps/mobile/app/(main)/index.tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@beeapp/design-system';
import VoiceAssistantFab from '../../src/components/VoiceAssistantFab';
import HomeHeader from '../../src/components/home/HomeHeader';
import HomeSideMenu from '../../src/components/home/HomeSideMenu';
import ModuleSwitcherRow from '../../src/components/home/ModuleSwitcherRow';
import HomeCustomizeModal from '../../src/components/home/HomeCustomizeModal';
import EmbeddedModuleHost from '../../src/components/embedded/EmbeddedModuleHost';
import {
  CUSTOMIZABLE_MODULES,
  OVERVIEW_MODULE_ID,
} from '../../src/components/home/homeModules';

const DEFAULT_MODULE_IDS = CUSTOMIZABLE_MODULES.map((module) => module.id);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    DEFAULT_MODULE_IDS,
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempSelectedModuleIds, setTempSelectedModuleIds] = useState<string[]>(
    DEFAULT_MODULE_IDS,
  );

  const [activeModuleId, setActiveModuleId] = useState<string>(
    OVERVIEW_MODULE_ID,
  );
  const [moduleTarget, setModuleTarget] = useState<{
    path: string;
    params?: Record<string, string>;
  } | null>(null);
  const [openSeq, setOpenSeq] = useState(0);

  const [isDetailView, setIsDetailView] = useState(false);

  const openModule = (
    id: string,
    target?: {
      path: string;
      params?: Record<string, string>;
    },
  ) => {
    if (id === 'beeservices') {
      router.push('/(main)/beeservices');
      return;
    }

    setActiveModuleId(id);
    setModuleTarget(target ?? null);
    setOpenSeq((sequence) => sequence + 1);
    setIsDetailView(false);
  };

  const openCustomize = () => {
    setTempSelectedModuleIds([...selectedModuleIds]);
    setIsCustomizing(true);
  };

  const saveCustomize = () => {
    setSelectedModuleIds(tempSelectedModuleIds);
    setIsCustomizing(false);

    if (activeModuleId === OVERVIEW_MODULE_ID) {
      setOpenSeq((sequence) => sequence + 1);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {!isDetailView && (
        <>
          <View style={styles.topSection}>
            <HomeHeader onMenuPress={() => setSideMenuVisible(true)} />
          </View>

          <ModuleSwitcherRow
            selectedModuleIds={selectedModuleIds}
            activeModuleId={activeModuleId}
            hideOverview={activeModuleId === OVERVIEW_MODULE_ID}
            onSelect={openModule}
            onCustomize={openCustomize}
          />
        </>
      )}

      <EmbeddedModuleHost
        key={`${activeModuleId}-${openSeq}`}
        moduleId={activeModuleId}
        initialPath={moduleTarget?.path}
        initialParams={moduleTarget?.params}
        rootParams={
          activeModuleId === OVERVIEW_MODULE_ID
            ? {
                moduleIds: selectedModuleIds,
                onOpenModule: openModule,
              }
            : undefined
        }
        onStackDepthChange={(depth) => setIsDetailView(depth > 0)}
      />

      <VoiceAssistantFab />

      <HomeSideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
      />

      <HomeCustomizeModal
        visible={isCustomizing}
        selectedIds={tempSelectedModuleIds}
        onChangeSelected={setTempSelectedModuleIds}
        onCancel={() => setIsCustomizing(false)}
        onSave={saveCustomize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: spacing.md,
  },
});

~/Git/beeapp_ai/Fronted/apps/mobile/app/(main)/storage/index.tsx
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

~/Git/beeapp_ai/Fronted/apps/mobile/src/stores/storageStore.ts
import type {
  StorageFile,
  StorageFolder,
  StorageSummary,
  StorageTag,
} from '@beeapp/shared-types';


export type StorageItemType =
  | 'folder'
  | 'pdf'
  | 'image'
  | 'video'
  | 'doc'
  | 'audio'
  | 'archive'
  | 'other';


export interface StorageItem {
  id: string;
  name: string;
  type: StorageItemType;
  size?: string;
  sizeBytes?: number;
  updatedAt: string;
  parentId: string | null;
  itemCount?: number;
  isSigned?: boolean;
  signerName?: string;
  signedAt?: string;
  isShared?: boolean;
  shareId?: string;
  categoryIds?: string[];
  mimeType?: string;
  status?: 'uploading' | 'ready' | 'failed' | 'trashed';
  createdAt?: string;
}


export interface StorageCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  sortOrder?: number;
}


let storageItems: StorageItem[] = [];
let storageSummary: StorageSummary | null = null;
let storageCategories: StorageCategory[] = [];


export function getItems(): StorageItem[] {
  return storageItems;
}


export function setItems(
  items: StorageItem[],
): void {
  storageItems = items;
}


export function getStorageSummary(): StorageSummary | null {
  return storageSummary;
}


export function setStorageSummary(
  summary: StorageSummary | null,
): void {
  storageSummary = summary;
}


export function getStorageCategories(): StorageCategory[] {
  return storageCategories;
}


export function setStorageCategories(
  categories: StorageCategory[],
): void {
  storageCategories = categories;
}


export function mapStorageTagToCategory(
  tag: StorageTag,
): StorageCategory {
  return {
    id: tag.id,
    name: tag.name,
    icon: tag.icon,
    color: tag.color,
    isDefault: tag.is_default,
    sortOrder: tag.sort_order,
  };
}


export function mapStorageFolderToItem(
  folder: StorageFolder,
  itemCount = 0,
): StorageItem {
  return {
    id: folder.id,
    name: folder.name,
    type: 'folder',
    parentId: folder.parent_id,
    itemCount,
    updatedAt: formatStorageDate(folder.updated_at),
    createdAt: folder.created_at,
  };
}


export function mapStorageFileToItem(
  file: StorageFile,
  options: {
    categoryIds?: string[];
    isShared?: boolean;
    shareId?: string;
  } = {},
): StorageItem {
  return {
    id: file.id,
    name: file.display_name,
    type: mapFileKindToItemType(file),
    parentId: file.folder_id,
    size: formatBytes(file.size_bytes),
    sizeBytes: file.size_bytes,
    updatedAt: formatStorageDate(file.updated_at),
    mimeType: file.mime_type,
    status: file.status,
    createdAt: file.created_at,
    categoryIds: options.categoryIds || [],
    isShared: options.isShared || false,
    shareId: options.shareId,
  };
}


function mapFileKindToItemType(
  file: StorageFile,
): StorageItemType {
  if (file.kind === 'image') {
    return 'image';
  }

  if (file.kind === 'video') {
    return 'video';
  }

  if (file.kind === 'audio') {
    return 'audio';
  }

  if (file.mime_type === 'application/pdf') {
    return 'pdf';
  }

  if (
    file.kind === 'document'
    || file.kind === 'spreadsheet'
    || file.kind === 'presentation'
  ) {
    return 'doc';
  }

  if (file.kind === 'archive') {
    return 'archive';
  }

  return 'other';
}


export function formatBytes(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** exponent;

  const decimals = exponent === 0
    ? 0
    : value >= 10
      ? 1
      : 2;

  return `${value.toFixed(decimals)} ${units[exponent]}`;
}


export function formatStorageDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();

  if (isToday) {
    return `Hoy, ${date.toLocaleTimeString(
      'es-CO',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    )}`;
  }

  return date.toLocaleDateString(
    'es-CO',
    {
      day: '2-digit',
      month: 'short',
    },
  );
}

~/Git/beeapp_ai/Fronted/apps/mobile/src/utils/storageHelpers.ts
import type {
  StorageItem,
} from '../stores/storageStore';


export type SortOption =
  | 'name'
  | 'date'
  | 'size'
  | 'type';

export type StorageFilter =
  | 'all'
  | 'recent'
  | 'docs'
  | 'media'
  | 'signed'
  | 'shared'
  | 'trash';


export function getSortedItems(
  list: StorageItem[],
  sortBy: SortOption,
): StorageItem[] {
  return [...list].sort((first, second) => {
    if (
      first.type === 'folder'
      && second.type !== 'folder'
    ) {
      return -1;
    }

    if (
      first.type !== 'folder'
      && second.type === 'folder'
    ) {
      return 1;
    }

    if (sortBy === 'name') {
      return first.name.localeCompare(
        second.name,
        'es',
      );
    }

    if (sortBy === 'date') {
      return (
        new Date(
          second.createdAt || 0,
        ).getTime()
        - new Date(
          first.createdAt || 0,
        ).getTime()
      );
    }

    if (sortBy === 'size') {
      return (
        (second.sizeBytes || 0)
        - (first.sizeBytes || 0)
      );
    }

    return first.type.localeCompare(second.type);
  });
}


export function getFilteredItems(
  items: StorageItem[],
  searchQuery: string,
  currentFolderId: string | null,
  activeFilter: StorageFilter,
  sortBy: SortOption,
): StorageItem[] {
  const normalizedQuery =
    searchQuery.trim().toLowerCase();

  let list = normalizedQuery
    ? items.filter((item) =>
      item.name.toLowerCase().includes(
        normalizedQuery,
      ),
    )
    : items.filter(
      (item) => item.parentId === currentFolderId,
    );

  if (activeFilter === 'docs') {
    list = list.filter(
      (item) =>
        item.type === 'pdf'
        || item.type === 'doc',
    );
  }

  if (activeFilter === 'media') {
    list = list.filter(
      (item) =>
        item.type === 'image'
        || item.type === 'video'
        || item.type === 'audio',
    );
  }

  if (activeFilter === 'signed') {
    list = list.filter(
      (item) => item.isSigned,
    );
  }

  if (activeFilter === 'shared') {
    list = list.filter(
      (item) => item.isShared,
    );
  }

  if (activeFilter === 'trash') {
    list = list.filter(
      (item) => item.status === 'trashed',
    );
  }

  return getSortedItems(list, sortBy);
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/storage.ts
import type {
    AuthCredentials,
    CreateFileSharePayload,
    CreateFileShareResponse,
    CreateStorageFolderPayload,
    CreateStorageFolderResponse,
    CreateStorageTagPayload,
    CreateStorageTagResponse,
    CreateStorageUploadResponse,
    GetReceivedSharesResponse,
    GetStorageFileAccessResponse,
    GetStorageFilesResponse,
    GetStorageFileTagsResponse,
    GetStorageFoldersResponse,
    GetStorageShareRecipientsResponse,
    GetStorageSummaryResponse,
    GetStorageTagsResponse,
    ReceivedSharesQuery,
    ReplaceFileTagsPayload,
    ReplaceFileTagsResponse,
    StorageFilesQuery,
    StorageFoldersQuery,
    UpdateFileShareResponse,
    UpdateStorageFolderPayload,
    UpdateStorageFolderResponse,
    UpdateStorageTagPayload,
    UpdateStorageTagResponse,
    } from '@beeapp/shared-types';

import { api } from './client';


function buildQuery(
    params: object,
    ): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (
        value !== undefined
        && value !== null
        && value !== ''
        ) {
        searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : '';
}


export function getStorageSummary(
    auth: AuthCredentials,
    ): Promise<GetStorageSummaryResponse> {
    return api.get<GetStorageSummaryResponse>(
        '/storage/summary/',
        { auth },
    );
}


export function getStorageFiles(
    auth: AuthCredentials,
    query: StorageFilesQuery = {},
    ): Promise<GetStorageFilesResponse> {
    return api.get<GetStorageFilesResponse>(
        `/storage/files/${buildQuery(query)}`,
        { auth },
    );
}


export function getStorageFolders(
    auth: AuthCredentials,
    query: StorageFoldersQuery = {},
    ): Promise<GetStorageFoldersResponse> {
    return api.get<GetStorageFoldersResponse>(
        `/storage/folders/${buildQuery(query)}`,
        { auth },
    );
}


export function createStorageFolder(
    auth: AuthCredentials,
    payload: CreateStorageFolderPayload,
    ): Promise<CreateStorageFolderResponse> {
    return api.post<CreateStorageFolderResponse>(
        '/storage/folders/',
        payload,
        { auth },
    );
}


export function renameStorageFolder(
    auth: AuthCredentials,
    folderId: string,
    payload: UpdateStorageFolderPayload,
    ): Promise<UpdateStorageFolderResponse> {
    return api.patch<UpdateStorageFolderResponse>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        payload,
        { auth },
    );
}


export async function deleteStorageFolder(
    auth: AuthCredentials,
    folderId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        { auth },
    );
}


export async function uploadStorageFiles(
    auth: AuthCredentials,
    formData: FormData,
    ): Promise<CreateStorageUploadResponse> {
    return api.upload<CreateStorageUploadResponse>(
        '/storage/uploads/',
        formData,
        { auth },
    );
}


export const uploadStorageFile = uploadStorageFiles;


export function getStorageFileAccess(
    auth: AuthCredentials,
    fileId: string,
    download = false,
    ): Promise<GetStorageFileAccessResponse> {
    return api.get<GetStorageFileAccessResponse>(
        `/storage/files/${encodeURIComponent(
        fileId,
        )}/access/?download=${download}`,
        { auth },
    );
}


export async function moveStorageFileToTrash(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<void> {
    await api.post<void>(
        `/storage/files/${encodeURIComponent(fileId)}/trash/`,
        undefined,
        { auth },
    );
}


export async function restoreStorageFile(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<void> {
    await api.post<void>(
        `/storage/files/${encodeURIComponent(fileId)}/restore/`,
        undefined,
        { auth },
    );
}


export async function permanentlyDeleteStorageFile(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/files/${encodeURIComponent(fileId)}/`,
        { auth },
    );
}


export function getStorageTags(
    auth: AuthCredentials,
    ): Promise<GetStorageTagsResponse> {
    return api.get<GetStorageTagsResponse>(
        '/storage/tags/',
        { auth },
    );
}


export function createStorageTag(
    auth: AuthCredentials,
    payload: CreateStorageTagPayload,
    ): Promise<CreateStorageTagResponse> {
    return api.post<CreateStorageTagResponse>(
        '/storage/tags/',
        payload,
        { auth },
    );
}


export function updateStorageTag(
    auth: AuthCredentials,
    tagId: string,
    payload: UpdateStorageTagPayload,
    ): Promise<UpdateStorageTagResponse> {
    return api.patch<UpdateStorageTagResponse>(
        `/storage/tags/${encodeURIComponent(tagId)}/`,
        payload,
        { auth },
    );
}


export async function deleteStorageTag(
    auth: AuthCredentials,
    tagId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/tags/${encodeURIComponent(tagId)}/`,
        { auth },
    );
}


export function getStorageFileTags(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<GetStorageFileTagsResponse> {
    return api.get<GetStorageFileTagsResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/tags/`,
        { auth },
    );
}


export function replaceStorageFileTags(
    auth: AuthCredentials,
    fileId: string,
    payload: ReplaceFileTagsPayload,
    ): Promise<ReplaceFileTagsResponse> {
    return api.put<ReplaceFileTagsResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/tags/`,
        payload,
        { auth },
    );
}


export function searchStorageShareRecipients(
    auth: AuthCredentials,
    searchValue: string,
    limit = 10,
    ): Promise<GetStorageShareRecipientsResponse> {
    return api.get<GetStorageShareRecipientsResponse>(
        `/storage/share-recipients/${buildQuery({
        q: searchValue,
        limit,
        })}`,
        { auth },
    );
}


export function createStorageFileShare(
    auth: AuthCredentials,
    fileId: string,
    payload: CreateFileSharePayload,
    ): Promise<CreateFileShareResponse> {
    return api.post<CreateFileShareResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/shares/`,
        payload,
        { auth },
    );
}


export function getReceivedStorageShares(
    auth: AuthCredentials,
    query: ReceivedSharesQuery = {},
    ): Promise<GetReceivedSharesResponse> {
    return api.get<GetReceivedSharesResponse>(
        `/storage/shares/received/${buildQuery(query)}`,
        { auth },
    );
}


export function hideReceivedStorageShare(
    auth: AuthCredentials,
    shareId: string,
    ): Promise<UpdateFileShareResponse> {
    return api.post<UpdateFileShareResponse>(
        `/storage/shares/${encodeURIComponent(shareId)}/hide/`,
        undefined,
        { auth },
    );
}


export function revokeStorageFileShare(
    auth: AuthCredentials,
    shareId: string,
    ): Promise<UpdateFileShareResponse> {
    return api.post<UpdateFileShareResponse>(
        `/storage/shares/${encodeURIComponent(shareId)}/revoke/`,
        undefined,
        { auth },
    );
}

~/Git/beeapp_ai/Fronted/packages/shared-types/src/index.ts
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING';

export type AuthScheme = 'Bearer' | 'Session';

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'website';

export interface ProfileSocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface BaseUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface RegisterUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_dial_code: string;
  phone_number: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string;
  phone_number: string;
  role: UserRole;
}

export interface RegisterUserResponse {
  message: string;
  user: RegisteredUser;
}

export interface LoginUserPayload {
  email: string;
  password: string;
}

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
}

export interface MobileAuthSession {
  token: string;
  expires_at: string;
}

export type AuthSession =
  | SupabaseAuthSession
  | MobileAuthSession;

export interface RefreshSessionPayload {
  refresh_token?: string;
  session_token?: string;
}

export interface RefreshSessionResponse {
  session: AuthSession;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface LoginUserResponse {
  message: string;
  session: SupabaseAuthSession;
  user: AuthenticatedUser;
}

export interface RequestPhoneOtpPayload {
  phone: string;
}

export interface RequestPhoneOtpResponse {
  message: string;
}

export interface VerifyPhoneOtpPayload {
  phone: string;
  code: string;
}

export interface MobileAuthenticatedUser
  extends AuthenticatedUser {
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface VerifyPhoneOtpMobileResponse {
  message: string;
  session: MobileAuthSession;
  user: MobileAuthenticatedUser;
}

export interface AuthCredentials {
  token: string;
  scheme: AuthScheme;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
  role: UserRole;
  occupation: string | null;
  location: string | null;
  assistant_name: string | null;
  assistant_tone: string | null;
  social_links: ProfileSocialLink[];
}

export interface CurrentUserProfile
  extends UserProfile {
  email: string | null;
}

export interface GetCurrentProfileResponse {
  profile: CurrentUserProfile;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_dial_code: string;
  phone_number: string;
  occupation?: string | null;
  location?: string | null;
  social_links: ProfileSocialLink[];
}

export interface UpdateProfileResponse {
  message: string;
  profile: CurrentUserProfile;
}

export type DeviceType = 'WEB' | 'MOBILE' | 'DESKTOP';

export interface DeviceSession {
  id: string;
  device_name: string;
  device_type: DeviceType;
  platform: string | null;
  browser: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface GetDeviceSessionsResponse {
  devices: DeviceSession[];
}

export interface QrLoginChallengeResponse {
  challenge_token: string;
  expires_at: string;
}

export interface QrLoginChallengeStatusResponse {
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'CONSUMED'
    | 'EXPIRED'
    | 'CANCELLED';
  expires_at: string;
}

export interface ScanQrLoginPayload {
  challenge_token: string;
}

export interface ScanQrLoginResponse {
  message: string;
  device: DeviceSession;
}

export interface WebSessionProfileResponse {
  user: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface UpdateOnboardingProfilePayload {
  occupation: string;
  location: string;
}

export interface UpdateOnboardingProfileResponse {
  message: string;
  profile: UserProfile;
}

export interface UpdateAssistantSettingsPayload {
  assistant_name: string;
  assistant_tone: string;
}

export interface UpdateAssistantSettingsResponse {
  message: string;
  profile: UserProfile;
}

export interface PasswordResetRequestPayload {
  phone: string;
}

export interface PasswordResetRequestResponse {
  message: string;
}

export interface PasswordResetVerifyPayload {
  phone: string;
  code: string;
}

export interface PasswordResetVerifyResponse {
  message: string;
  reset_token: string;
}

export interface PasswordResetConfirmPayload {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export type StorageFileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'other';

export type StorageFileStatus =
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'trashed';

export type StorageScope =
  | 'all'
  | 'recent'
  | 'documents'
  | 'media';

export type FileSharePermission =
  | 'viewer'
  | 'editor';

export interface StorageSummary {
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
  available_bytes: number;
  usage_percentage: number;
  updated_at: string | null;
}

export interface StorageFolder {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StorageFile {
  id: string;
  owner_id?: string;
  folder_id: string | null;
  bucket_id?: string;
  storage_path?: string;
  original_name: string;
  display_name: string;
  extension: string | null;
  mime_type: string;
  kind: StorageFileKind;
  size_bytes: number;
  status: StorageFileStatus;
  is_starred: boolean;
  trashed_at: string | null;
  purge_after: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageTag {
  id: string;
  owner_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StorageShareRecipient {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
}

export interface StorageShareProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone_dial_code: string | null;
  phone_number: string | null;
}

export interface StorageFileShare {
  id: string;
  file_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  permission: FileSharePermission;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  hidden_at: string | null;
  shared_with_displayed_at: string | null;
  created_at: string;
  updated_at: string;
  file?: StorageFile;
  shared_by?: StorageShareProfile | null;
}

export interface StorageFilesQuery {
  folder_id?: string | null;
  status?: 'ready' | 'trashed';
  scope?: StorageScope;
  kind?: StorageFileKind;
  tag_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface StorageFoldersQuery {
  parent_id?: string | null;
}

export interface ReceivedSharesQuery {
  include_hidden?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateStorageFolderPayload {
  name: string;
  parent_id?: string | null;
}

export interface UpdateStorageFolderPayload {
  name: string;
}

export interface CreateStorageTagPayload {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface UpdateStorageTagPayload {
  name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface ReplaceFileTagsPayload {
  tag_ids: string[];
}

export interface CreateFileSharePayload {
  recipient_id: string;
  permission?: FileSharePermission;
  expires_at?: string | null;
}

export interface GetStorageSummaryResponse {
  storage: StorageSummary;
}

export interface GetStorageFilesResponse {
  files: StorageFile[];
  count: number;
  limit: number;
  offset: number;
}

export interface GetStorageFoldersResponse {
  folders: StorageFolder[];
}

export interface GetStorageTagsResponse {
  tags: StorageTag[];
}

export interface GetStorageFileTagsResponse {
  tags: StorageTag[];
}

export interface GetStorageShareRecipientsResponse {
  recipients: StorageShareRecipient[];
}

export interface GetReceivedSharesResponse {
  shares: StorageFileShare[];
  count: number;
  limit: number;
  offset: number;
}

export interface CreateStorageFolderResponse {
  folder: StorageFolder;
}

export interface UpdateStorageFolderResponse {
  folder: StorageFolder;
}

export interface CreateStorageTagResponse {
  tag: StorageTag;
}

export interface UpdateStorageTagResponse {
  tag: StorageTag;
}

export interface ReplaceFileTagsResponse {
  tags: StorageTag[];
}

export interface CreateFileShareResponse {
  share: StorageFileShare;
}

export interface UpdateFileShareResponse {
  share: StorageFileShare;
}

export interface UploadFailedFile {
  name: string;
  detail: string;
  code: 'quota_exceeded' | 'upload_failed';
}

export interface CreateStorageUploadResponse {
  files: StorageFile[];
  failed_files: UploadFailedFile[];
  success_count: number;
  failure_count: number;
}

export interface GetStorageFileAccessResponse {
  file: StorageFile;
  url: string;
  expires_in_seconds: number;
  download: boolean;
}

export type NotificationModule = string;

export interface AppNotification {
  id: string;
  module: NotificationModule;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  push_sent_at: string | null;
  push_error: string | null;
  created_at: string;
  expires_at: string;
}

export interface NotificationsQuery {
  module?: NotificationModule;
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetNotificationsResponse {
  notifications: AppNotification[];
  count: number;
  limit: number;
  offset: number;
  unread_count: number;
}

export interface MarkNotificationReadResponse {
  notification: AppNotification;
}

export interface MarkAllNotificationsReadResponse {
  message: string;
  updated_count: number;
}

export interface RegisterPushDevicePayload {
  expo_push_token: string;
  platform: 'android' | 'ios' | 'web';
  device_id?: string;
  app_version?: string;
}

export interface PushDevice {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: string;
  device_id: string | null;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterPushDeviceResponse {
  device: PushDevice;
}

~/Git/beeapp_ai/Fronted/apps/mobile/src/components/home/overviewDataMappers.ts
import {
  Bot,
  Calendar,
  File,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Lock,
  Video,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import { OverviewEntry } from './OverviewSection';
import { MOCK_CHATS } from '../../mocks/chats';
import { MOCK_EMAILS } from '../../mocks/emails';
import { MOCK_NOTES } from '../../mocks/notes';
import {
  getEvents,
  TODAY_STR,
  TOMORROW_STR,
} from '../../stores/calendarStore';
import {
  getItems,
  StorageItem,
} from '../../stores/storageStore';
import { isProtected } from '../../stores/pinStore';

export interface OverviewTarget {
  pathname: string;
  params?: Record<string, string>;
}

export interface OverviewRow {
  entry: OverviewEntry;
  target: OverviewTarget;
}

const PREVIEW_COUNT = 5;

const initialsOf = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

const FILE_ICONS: Record<
  StorageItem['type'],
  typeof File
> = {
  folder: Folder,
  pdf: FileText,
  image: FileImage,
  video: FileVideo,
  doc: File,
  audio: File,
  archive: File,
  other: File,
};

const FILE_LABELS: Record<
  StorageItem['type'],
  string
> = {
  folder: 'Carpeta',
  pdf: 'Documento PDF',
  image: 'Imagen',
  video: 'Video',
  doc: 'Documento',
  audio: 'Audio',
  archive: 'Archivo comprimido',
  other: 'Archivo',
};

const MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const eventDayLabel = (date: string) => {
  if (date === TODAY_STR) {
    return 'Hoy';
  }

  if (date === TOMORROW_STR) {
    return 'Mañana';
  }

  const [, month, day] = date.split('-');

  return `${Number(day)} ${
    MONTHS[Number(month) - 1] ?? ''
  }`.trim();
};

const mailRows = (): OverviewRow[] =>
  MOCK_EMAILS.slice(0, PREVIEW_COUNT).map(
    (email) => ({
      entry: {
        key: email.id,
        initials: initialsOf(email.senderName),
        avatarColor: email.initialsColor,
        title: email.subject,
        subtitle: email.senderName,
        timestamp: email.isRead
          ? email.date
          : email.time,
        unread: !email.isRead,
        verified: email.senderVerified,
      },
      target: {
        pathname: '/(main)/mail/detail',
        params: { id: email.id },
      },
    }),
  );

const chatRows = (): OverviewRow[] =>
  MOCK_CHATS.slice(0, PREVIEW_COUNT).map(
    (chat) => {
      const chatLocked = isProtected(chat.id);

      return {
        entry: {
          initials: chat.isAI
            ? undefined
            : initialsOf(chat.name),
          icon: chat.isAI ? Bot : undefined,
          iconColor: chat.isAI
            ? colors.brand.primary
            : colors.neutral.gray600,
          key: chat.id,
          avatarColor: chat.isAI
            ? `${colors.brand.primary}15`
            : colors.neutral.gray100,
          title: chat.name,
          subtitle: chatLocked
            ? 'Chat protegido'
            : chat.lastMessage,
          timestamp: chat.time,
          unread: chat.unreadCount > 0,
          verified: chat.verified,
          locked: chatLocked,
        },
        target: {
          pathname: '/(main)/chat/conversation',
          params: {
            id: chat.id,
            name: chat.name,
            isGroup: String(chat.isGroup),
            online: String(Boolean(chat.online)),
          },
        },
      };
    },
  );

const noteRows = (): OverviewRow[] =>
  MOCK_NOTES.slice(0, PREVIEW_COUNT).map(
    (note) => {
      const locked =
        note.isProtected || isProtected(note.id);

      return {
        entry: {
          key: note.id,
          icon: locked ? Lock : FileText,
          iconColor: colors.neutral.gray600,
          avatarColor: colors.neutral.gray100,
          title: locked
            ? 'Nota protegida'
            : note.title,
          subtitle: locked
            ? 'Desbloquea para ver el contenido'
            : note.preview,
          timestamp: note.date,
        },
        target: {
          pathname: '/(main)/notes/edit',
          params: { id: note.id },
        },
      };
    },
  );

const fileRows = (): OverviewRow[] =>
  getItems()
    .slice(0, PREVIEW_COUNT)
    .map((item) => ({
      entry: {
        key: item.id,
        icon: FILE_ICONS[item.type],
        iconColor: colors.neutral.gray600,
        avatarColor: colors.neutral.gray100,
        title: item.name,
        subtitle:
          item.type === 'folder'
            ? `${FILE_LABELS.folder} · ${
              item.itemCount ?? 0
            } ${
              item.itemCount === 1
                ? 'elemento'
                : 'elementos'
            }`
            : `${FILE_LABELS[item.type]}${
              item.size
                ? ` · ${item.size}`
                : ''
            }`,
        timestamp: item.updatedAt,
        locked: isProtected(item.id),
      },
      target:
        item.type === 'folder'
          ? { pathname: '/(main)/storage' }
          : {
            pathname: '/(main)/storage/preview',
            params: { id: item.id },
          },
    }));

const calendarRows = (): OverviewRow[] =>
  getEvents()
    .filter((event) => event.date >= TODAY_STR)
    .sort((first, second) =>
      (
        first.date
        + first.timeStart
      ).localeCompare(
        second.date + second.timeStart,
      ),
    )
    .slice(0, PREVIEW_COUNT)
    .map((event) => ({
      entry: {
        key: event.id,
        icon: event.isVirtual ? Video : Calendar,
        iconColor: colors.neutral.gray600,
        avatarColor: colors.neutral.gray100,
        title: event.title,
        subtitle: `${event.timeStart} - ${
          event.timeEnd
        } · ${
          event.isVirtual
            ? 'Virtual'
            : event.location ?? 'Presencial'
        }`,
        timestamp: eventDayLabel(event.date),
      },
      target: {
        pathname: '/(main)/calendar/detail',
        params: { id: event.id },
      },
    }));

const BUILDERS: Record<
  string,
  () => OverviewRow[]
> = {
  mail: mailRows,
  chat: chatRows,
  notes: noteRows,
  files: fileRows,
  calendar: calendarRows,
};

export const getOverviewRows = (
  moduleId: string,
): OverviewRow[] => BUILDERS[moduleId]?.() ?? [];

~/Git/beeapp_ai/Fronted/apps/mobile/src/components/home/HomeOverviewCards.tsx

import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Mail, FileText, MessageCircle, ChevronRight } from 'lucide-react-native';

export function HomeActivityCard() {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityItem}>
        <View style={[styles.activityIconBadge, { backgroundColor: '#EBF5FF' }]}>
          <Mail size={16} color="#1E88E5" />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityTitle}>Correo de Carlos "Reunión de avance"</Text>
          <Text style={styles.activityTime}>Hoy, 10:30 AM</Text>
        </View>
        <ChevronRight size={16} color={colors.neutral.gray500} />
      </View>

      <View style={styles.activityItem}>
        <View style={[styles.activityIconBadge, { backgroundColor: '#FEF3C7' }]}>
          <FileText size={16} color="#D97706" />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityTitle}>Nota creada "Ideas de mercadeo"</Text>
          <Text style={styles.activityTime}>Hoy, 09:15 AM</Text>
        </View>
        <ChevronRight size={16} color={colors.neutral.gray500} />
      </View>

      <View style={[styles.activityItem, { borderBottomWidth: 0 }]}>
        <View style={[styles.activityIconBadge, { backgroundColor: '#E8F5E9' }]}>
          <MessageCircle size={16} color="#2E7D32" />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityTitle}>Mensaje de Whatsapp "Cliente aceptó oferta"</Text>
          <Text style={styles.activityTime}>Ayer, 04:45 PM</Text>
        </View>
        <ChevronRight size={16} color={colors.neutral.gray500} />
      </View>
    </View>
  );
}

export function HomeEventsCard() {
  return (
    <View style={styles.eventsCard}>
      <View style={styles.eventItem}>
        <View style={styles.eventTimeWrap}>
          <Text style={styles.eventTimeHour}>14:00</Text>
          <Text style={styles.eventTimeDuration}>45 min</Text>
        </View>
        <View style={styles.eventBarIndicator} />
        <View style={styles.eventTextWrap}>
          <Text style={styles.eventTitle}>Sincronización semanal de equipo</Text>
          <Text style={styles.eventMeta}>En 2 horas • Sala Virtual BeeApp</Text>
        </View>
      </View>

      <View style={[styles.eventItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
        <View style={styles.eventTimeWrap}>
          <Text style={styles.eventTimeHour}>10:00</Text>
          <Text style={styles.eventTimeDuration}>1 hora</Text>
        </View>
        <View style={[styles.eventBarIndicator, { backgroundColor: colors.semantic.info }]} />
        <View style={styles.eventTextWrap}>
          <Text style={styles.eventTitle}>Presentación de resultados Q2</Text>
          <Text style={styles.eventMeta}>Mañana • Oficina Principal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  activityIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  eventsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    marginBottom: 14,
  },
  eventTimeWrap: {
    width: 50,
    alignItems: 'center',
  },
  eventTimeHour: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  eventTimeDuration: {
    fontSize: 10,
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  eventBarIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
    marginHorizontal: 12,
  },
  eventTextWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
});


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/home/homeModules.ts
import { Mail, FileText, Folder, Calendar, MessageCircle, LayoutGrid } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

export interface HomeModule {
  id: string;
  name: string;
  icon: typeof Mail;
  bgColor: string;
  iconColor: string;
  desc: string;
  /** Special chip: renders the cross-module overview instead of a module */
  isOverview?: boolean;
}

/** Id of the always-present overview chip */
export const OVERVIEW_MODULE_ID = 'todas';

// Módulos disponibles para los accesos rápidos personalizables del home.
// Cada uno se abre EMBEBIDO dentro del Home (nunca navega a otra ruta).
export const MODULES_POOL: HomeModule[] = [
  { id: OVERVIEW_MODULE_ID, name: 'Todas', icon: LayoutGrid, bgColor: colors.brand.primary + '15', iconColor: colors.brand.primary, desc: 'Resumen de todos los módulos activos', isOverview: true },
  { id: 'chat', name: 'Chat', icon: MessageCircle, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Mensajes, historias y llamadas' },
  { id: 'mail', name: 'Correos', icon: Mail, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Bandeja de entrada y correos' },
  { id: 'notes', name: 'Notas', icon: FileText, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Notas y apuntes personales' },
  { id: 'files', name: 'Almacenamiento', icon: Folder, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Archivos y firma digital de documentos' },
  { id: 'calendar', name: 'Agenda', icon: Calendar, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Agenda de reuniones y eventos' },
];

/** Modules the user can turn on/off and reorder ("Todas" is always first) */
export const CUSTOMIZABLE_MODULES = MODULES_POOL.filter((m) => !m.isOverview);

export const getModule = (id: string) => MODULES_POOL.find((m) => m.id === id);


~/Git/beeapp_ai/Fronted/apps/mobile/package.json
{
  "name": "@beeapp/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "type-check": "tsc --noEmit",
    "postinstall": "node scripts/patch-expo-router.js"
  },
  "dependencies": {
    "@beeapp/api-client": "*",
    "@beeapp/design-system": "*",
    "@beeapp/shared-types": "*",
    "expo": "~51.0.0",
    "expo-camera": "~15.0.16",
    "expo-dev-client": "~4.0.26",
    "expo-local-authentication": "~14.0.1",
    "expo-router": "~3.5.24",
    "expo-secure-store": "~13.0.2",
    "expo-status-bar": "~1.12.1",
    "lucide-react-native": "^1.25.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.74.5",
    "react-native-draggable-flatlist": "^4.0.3",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-reanimated": "~3.10.1",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "react-native-svg": "15.2.0",
    "react-native-web": "~0.19.10"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@beeapp/config": "*",
    "@types/react": "~18.2.45",
    "typescript": "^5.4.0"
  }
}



andres-mendoza@gordosaurioPc:~/Git/beeapp_ai/Fronted/apps/mobile$ find src -type f \( -iname '*storage*' -o -iname '*file*' -o -iname '*notification*' \) | sort
src/components/chat/ChatProfileHeader.tsx
src/components/chat/ChatProfileRow.tsx
src/components/chat/ChatProfileScreen.tsx
src/components/chat/CommunityProfileScreen.tsx
src/components/home/HomeStorageCard.tsx
src/components/ModuleNotificationBell.tsx
src/components/NotificationsPopover.tsx
src/components/NotificationTicker.tsx
src/components/storage/StorageAssignCategoryModal.tsx
src/components/storage/StorageCategoryChips.tsx
src/components/storage/StorageCategoryModals.tsx
src/components/storage/StorageContextMenu.tsx
src/components/storage/StorageDialogs.tsx
src/components/storage/StorageFabMenu.tsx
src/components/storage/StorageHeader.tsx
src/components/storage/storageItemIcon.tsx
src/components/storage/StorageItemsGrid.tsx
src/components/storage/StorageItemsView.tsx
src/components/storage/StorageShareModal.tsx
src/components/storage/StorageSummaryFilters.tsx
src/mocks/tabNotifications.ts
src/stores/storageStore.ts
src/utils/storageHelpers.ts
andres-mendoza@gordosaurioPc:~/Git/beeapp_ai/Fronted/apps/mobile$ 