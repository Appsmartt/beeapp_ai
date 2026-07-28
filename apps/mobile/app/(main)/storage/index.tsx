import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useNavigation } from 'expo-router';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import StorageHeader from '../../../src/components/storage/StorageHeader';
import { getItems, setItems, StorageItem } from '../../../src/stores/storageStore';
import {
  getFilteredItems,
  buildMockUploadFile,
  SortOption,
  StorageFilter,
} from '../../../src/utils/storageHelpers';
import StorageItemsView from '../../../src/components/storage/StorageItemsView';
import { ViewMode } from '../../../src/components/layout/ViewModeToggle';
import StorageContextMenu from '../../../src/components/storage/StorageContextMenu';
import { MoveFolderModal, FolderNameDialog } from '../../../src/components/storage/StorageDialogs';
import StorageFabMenu from '../../../src/components/storage/StorageFabMenu';
import PinLockModal from '../../../src/components/security/PinLockModal';
import { getProtectedIds, hasPin, isProtected, setProtected } from '../../../src/stores/pinStore';
import {
  StorageSummaryCard,
  StorageFilterChips,
  StorageBreadcrumbs,
} from '../../../src/components/storage/StorageSummaryFilters';

export default function StorageIndexScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();

  // Storage State
  const [items, setLocalItems] = useState<StorageItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Inicio' },
  ]);

  // UI States
  // Search moved to the global Home search bar: the module keeps the filter dormant
  const [searchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  // List by default; the grid is an adaptive 2/3-column layout
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeFilter, setActiveFilter] = useState<StorageFilter>('all');

  // Modals & Menu States
  const [activeItem, setActiveItem] = useState<StorageItem | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);

  // PIN protection (mock, global store)
  const [protectedIds, setProtectedIds] = useState<string[]>(getProtectedIds());
  const [lockedItem, setLockedItem] = useState<StorageItem | null>(null);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  // Load items from memory store on mount / focus
  useEffect(() => {
    setLocalItems(getItems());
    // Refocus listener to keep items synchronized
    const unsubscribe = navigation.addListener('focus', () => {
      setLocalItems(getItems());
    });
    return unsubscribe;
  }, [navigation]);

  // Sync back local state to store
  const syncStore = (newItems: StorageItem[]) => {
    setLocalItems(newItems);
    setItems(newItems);
  };

  // Breadcrumbs click
  const handleBreadcrumbPress = (index: number) => {
    const newStack = pathStack.slice(0, index + 1);
    setPathStack(newStack);
    setCurrentFolderId(newStack[newStack.length - 1].id);
    setFabMenuVisible(false);
  };

  // Folder click
  const handleFolderPress = (folder: StorageItem) => {
    setPathStack([...pathStack, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setFabMenuVisible(false);
  };

  // Open folder or preview file, asking for the PIN when protected
  const handleOpenItem = (item: StorageItem) => {
    if (isProtected(item.id)) {
      setLockedItem(item);
      return;
    }
    openItemContent(item);
  };

  const openItemContent = (item: StorageItem) => {
    if (item.type === 'folder') {
      handleFolderPress(item);
    } else {
      router.push({
        pathname: '/(main)/storage/preview',
        params: { id: item.id },
      });
    }
  };

  // Protect / unprotect with the global PIN
  const handleToggleProtect = (item: StorageItem) => {
    if (!hasPin()) {
      alert('Primero crea tu PIN de protección en Perfil → Seguridad.');
      return;
    }
    const wasProtected = isProtected(item.id);
    setProtectedIds([...setProtected(item.id, !wasProtected)]);
    alert(wasProtected ? 'Protección retirada.' : 'Elemento protegido con tu PIN.');
  };

  // Folder CRUD Operations
  const handleCreateFolder = () => {
    if (!folderNameInput.trim()) return;
    const newFolder: StorageItem = {
      id: `f-${Date.now()}`,
      name: folderNameInput.trim(),
      type: 'folder',
      parentId: currentFolderId,
      updatedAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      itemCount: 0,
    };
    syncStore([...items, newFolder]);
    setFolderModalVisible(false);
    setFolderNameInput('');
  };

  const handleRenameItem = () => {
    if (!activeItem || !folderNameInput.trim()) return;
    const updated = items.map((item) =>
      item.id === activeItem.id ? { ...item, name: folderNameInput.trim() } : item
    );
    syncStore(updated);
    setFolderModalVisible(false);
    setFolderNameInput('');
    setActiveItem(null);
  };

  const handleDeleteItem = (item: StorageItem) => {
    const updated = items.filter((i) => i.id !== item.id);
    syncStore(updated);
    alert(`${item.type === 'folder' ? 'Carpeta' : 'Archivo'} eliminado.`);
    setContextMenuVisible(false);
    setActiveItem(null);
  };

  const handleMoveItem = (targetFolderId: string | null) => {
    if (!activeItem) return;
    const updated = items.map((i) =>
      i.id === activeItem.id ? { ...i, parentId: targetFolderId } : i
    );
    syncStore(updated);
    alert(`Elemento movido con éxito.`);
    setMoveModalVisible(false);
    setContextMenuVisible(false);
    setActiveItem(null);
  };

  // Mock Uploads
  const triggerMockUpload = (type: 'pdf' | 'image' | 'video' | 'doc', customName?: string) => {
    const newFile = buildMockUploadFile(type, currentFolderId, customName);
    syncStore([...items, newFile]);
    setFabMenuVisible(false);
    alert(`Subido con éxito: ${newFile.name}`);
  };

  // Context Menu triggers
  const openContextMenu = (item: StorageItem) => {
    setActiveItem(item);
    setContextMenuVisible(true);
  };

  const triggerRenameFlow = () => {
    if (!activeItem) return;
    setFolderModalMode('rename');
    setFolderNameInput(activeItem.name);
    setContextMenuVisible(false);
    setFolderModalVisible(true);
  };

  const filteredItems = getFilteredItems(items, searchQuery, currentFolderId, activeFilter, sortBy);

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <StorageHeader
          onBack={router.canGoBack ? () => router.back() : undefined}
          onAction={router.embedded ? () => setFabMenuVisible(!fabMenuVisible) : undefined}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
          <StorageSummaryCard />

          <StorageFilterChips activeFilter={activeFilter} onChange={setActiveFilter} />

          {/* Breadcrumbs (only when not searching) */}
          {!searchQuery && (
            <StorageBreadcrumbs pathStack={pathStack} onPress={handleBreadcrumbPress} />
          )}

          <StorageItemsView
            items={filteredItems}
            protectedIds={protectedIds}
            onOpenItem={handleOpenItem}
            onOpenMenu={openContextMenu}
            viewMode={viewMode}
          />

          <View style={{ height: 160 }} />
        </ScrollView>

        <StorageContextMenu
          visible={contextMenuVisible}
          item={activeItem}
          onClose={() => setContextMenuVisible(false)}
          onOpenItem={handleOpenItem}
          isProtected={activeItem ? protectedIds.includes(activeItem.id) : false}
          onToggleProtect={handleToggleProtect}
          onRename={triggerRenameFlow}
          onMove={() => setMoveModalVisible(true)}
          onShare={() => { alert('Compartir enlace generado.'); setContextMenuVisible(false); }}
          onDownload={() => { alert('Descargando archivo...'); setContextMenuVisible(false); }}
          onSign={(item) => {
            router.push({
              pathname: '/(main)/storage/sign',
              params: { id: item.id },
            });
          }}
          onDelete={handleDeleteItem}
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
          onConfirm={folderModalMode === 'create' ? handleCreateFolder : handleRenameItem}
        />

        {/* PIN required to open a protected element */}
        <PinLockModal
          visible={!!lockedItem}
          itemName={lockedItem?.name}
          onClose={() => setLockedItem(null)}
          onSuccess={() => {
            const item = lockedItem;
            setLockedItem(null);
            if (item) openItemContent(item);
          }}
        />

        <StorageFabMenu
          embedded={router.embedded}
          menuVisible={fabMenuVisible}
          onToggleMenu={() => setFabMenuVisible(!fabMenuVisible)}
          onCloseMenu={() => setFabMenuVisible(false)}
          onCreateFolder={() => {
            setFabMenuVisible(false);
            setFolderModalMode('create');
            setFolderNameInput('');
            setFolderModalVisible(true);
          }}
          onUpload={triggerMockUpload}
        />

        {/* Tab Menu bar */}
        {!router.embedded && <FloatingTabBar activeTab="explore" />}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  scrollList: { flex: 1 },
});
