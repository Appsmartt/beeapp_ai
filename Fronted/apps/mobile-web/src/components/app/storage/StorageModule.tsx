'use client';

import { useState } from 'react';
import { List, Grid2x2, Plus, FolderOpen } from 'lucide-react';
import { MOCK_STORAGE_ITEMS, MOCK_STORAGE_CATEGORIES, StorageItem, StorageCategory } from '@/mocks/storageItems';
import StorageOptionsBar, { StorageFilter } from './StorageOptionsBar';
import StorageBreadcrumbs, { BreadcrumbNode } from './StorageBreadcrumbs';
import StorageCategoryChips from './StorageCategoryChips';
import StorageRow from './StorageRow';
import StoragePreview from './StoragePreview';
import StorageCreateMenu from './StorageCreateMenu';
import { CreateFolderModal, RenameModal, MoveFolderModal } from './StorageModals';
import SignatureModal from './SignatureModal';
import PinLockModal from '../chat/modals/PinLockModal';
import CreateCategoryModal from '../chat/modals/CreateCategoryModal';
import AssignCategoryModal from '../chat/modals/AssignCategoryModal';

export default function StorageModule() {
  const [items, setItems] = useState<StorageItem[]>(MOCK_STORAGE_ITEMS);
  const [categories, setCategories] = useState<StorageCategory[]>(MOCK_STORAGE_CATEGORIES);
  const [filter, setFilter] = useState<StorageFilter>('all');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<BreadcrumbNode[]>([{ id: null, name: 'Inicio' }]);

  // Modals & Menu States
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [assignCategoryItem, setAssignCategoryItem] = useState<StorageItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<StorageItem | null>(null);
  const [movingItem, setMovingItem] = useState<StorageItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [lockedItem, setLockedItem] = useState<StorageItem | null>(null);
  const [signingItem, setSigningItem] = useState<StorageItem | null>(null);

  const handleCreateFolder = (name: string) => {
    const newFolder: StorageItem = {
      id: `f-${Date.now()}`, name, type: 'folder', itemCount: 0, date: 'Ahora', parentId: currentFolderId,
    };
    setItems((prev) => [newFolder, ...prev]);
  };

  const handleUploadMock = (type: StorageItem['type'], name: string, size: string) => {
    const newFile: StorageItem = {
      id: `st-${Date.now()}`, name, type, size, date: 'Ahora', parentId: currentFolderId,
    };
    setItems((prev) => [newFile, ...prev]);
    setSelectedItem(newFile);
  };

  const handleCreateCategory = (cat: Omit<StorageCategory, 'id'>) => {
    const newCat: StorageCategory = { id: `scat-${Date.now()}`, ...cat };
    setCategories((prev) => [...prev, newCat]);
    setActiveCategoryId(newCat.id);
  };

  const handleSaveCategoryAssignments = (assignedIds: string[]) => {
    if (!assignCategoryItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === assignCategoryItem.id ? { ...i, categoryIds: assignedIds } : i))
    );
    if (selectedItem?.id === assignCategoryItem.id) {
      setSelectedItem((prev) => (prev ? { ...prev, categoryIds: assignedIds } : null));
    }
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const newStack = pathStack.slice(0, index + 1);
    setPathStack(newStack);
    setCurrentFolderId(newStack[newStack.length - 1].id);
  };

  const handleItemPress = (item: StorageItem) => {
    if (item.isProtected) { setLockedItem(item); return; }
    openItemContent(item);
  };

  const openItemContent = (item: StorageItem) => {
    if (item.type === 'folder') {
      setPathStack((prev) => [...prev, { id: item.id, name: item.name }]);
      setCurrentFolderId(item.id);
    } else {
      setSelectedItem(item);
    }
  };

  const handleRename = (id: string, newName: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: newName } : i)));
    if (selectedItem?.id === id) setSelectedItem((prev) => (prev ? { ...prev, name: newName } : null));
  };

  const handleMove = (itemId: string, targetFolderId: string | null) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, parentId: targetFolderId } : i)));
  };

  const handleToggleProtection = (item: StorageItem) => {
    const next = !item.isProtected;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isProtected: next } : i)));
    if (selectedItem?.id === item.id) setSelectedItem((prev) => (prev ? { ...prev, isProtected: next } : null));
  };

  const handleDelete = (item: StorageItem) => {
    if (confirm(`¿Eliminar ${item.name}?`)) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (selectedItem?.id === item.id) setSelectedItem(null);
    }
  };

  const handleConfirmSign = (itemId: string, signerName: string) => {
    const dateStr = 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isSigned: true, signerName, signedAt: dateStr } : i))
    );
    if (selectedItem?.id === itemId) {
      setSelectedItem((prev) => (prev ? { ...prev, isSigned: true, signerName, signedAt: dateStr } : null));
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeCategoryId && (!item.categoryIds || !item.categoryIds.includes(activeCategoryId))) {
      return false;
    }
    if (filter === 'all') return item.parentId === currentFolderId;
    if (filter === 'recent') return item.date.includes('Hoy') || item.date.includes('Ahora') || item.date.includes('Ayer');
    if (filter === 'docs') return item.type === 'pdf' || item.type === 'doc' || item.type === 'sheet';
    if (filter === 'media') return item.type === 'image' || item.type === 'video';
    if (filter === 'signed') return item.isSigned;
    if (filter === 'protected') return item.isProtected;
    return true;
  });

  return (
    <div className="bg-white min-h-full flex flex-row relative select-none">
      <StorageOptionsBar filter={filter} onSelectFilter={setFilter} />

      <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        <div className="p-3.5 border-b border-neutral-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-semibold text-base text-neutral-900 truncate">Almacenamiento</h1>
            <div className="flex items-center gap-1.5 shrink-0 relative">
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'}`}
                  title="Vista en lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'}`}
                  title="Vista en cuadrícula"
                >
                  <Grid2x2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir</span>
              </button>

              <StorageCreateMenu
                visible={createMenuOpen}
                onClose={() => setCreateMenuOpen(false)}
                onCreateFolder={() => setCreateFolderOpen(true)}
                onUploadDocument={() => handleUploadMock('pdf', 'Documento_Nuevo.pdf', '1.5 MB')}
                onUploadPhoto={() => handleUploadMock('image', 'Foto_Captura.png', '3.2 MB')}
                onUploadVideo={() => handleUploadMock('video', 'Video_Grabacion.mp4', '12.4 MB')}
                onScanDocument={() => handleUploadMock('pdf', 'Escaneo_Documento_Oficial.pdf', '2.1 MB')}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-normal text-neutral-600">Espacio Disponible</span>
              <span className="font-semibold text-neutral-900">8.2 GB / 15 GB</span>
            </div>
            <div className="h-2 bg-neutral-200/80 rounded-full overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full" style={{ width: '54.6%' }} />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 font-normal">
              <span>Doc: 3.4 GB</span>
              <span>Media: 4.2 GB</span>
              <span>Otros: 0.6 GB</span>
            </div>
          </div>

          <StorageBreadcrumbs pathStack={pathStack} onNavigate={handleNavigateBreadcrumb} />

          <StorageCategoryChips
            categories={categories}
            activeCategoryId={activeCategoryId}
            onChange={setActiveCategoryId}
            onCreate={() => setCreateCategoryOpen(true)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <FolderOpen className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">Carpeta o categoría vacía</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-1'}>
              {filteredItems.map((item) => (
                <StorageRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  viewMode={viewMode}
                  onClick={() => handleItemPress(item)}
                  onOpenPreview={openItemContent}
                  onRename={setRenamingItem}
                  onMove={setMovingItem}
                  onShare={(i) => alert(`Enlace copiado para ${i.name}`)}
                  onDownload={(i) => alert(`Descargando ${i.name}...`)}
                  onToggleProtection={handleToggleProtection}
                  onDelete={handleDelete}
                  onAssignCategory={(i) => setAssignCategoryItem(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {selectedItem ? (
          <StoragePreview
            key={selectedItem.id}
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onDownload={(i) => alert(`Descargando ${i.name}...`)}
            onShare={(i) => alert(`Enlace copiado para ${i.name}`)}
            onOpenSignModal={setSigningItem}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <FolderOpen className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún archivo seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona un archivo para ver su previsualización o información.
              </p>
            </div>
          </div>
        )}
      </div>

      <CreateFolderModal visible={createFolderOpen} onClose={() => setCreateFolderOpen(false)} onCreate={handleCreateFolder} />
      <RenameModal visible={!!renamingItem} item={renamingItem} onClose={() => setRenamingItem(null)} onRename={handleRename} />
      <MoveFolderModal visible={!!movingItem} item={movingItem} folders={items} onClose={() => setMovingItem(null)} onMove={handleMove} />
      <SignatureModal visible={!!signingItem} item={signingItem} onClose={() => setSigningItem(null)} onConfirmSign={handleConfirmSign} />
      <PinLockModal
        visible={!!lockedItem}
        itemName={lockedItem?.name}
        onClose={() => setLockedItem(null)}
        onSuccess={() => {
          if (lockedItem) {
            const itemToOpen = lockedItem;
            setLockedItem(null);
            openItemContent(itemToOpen);
          }
        }}
      />
      <CreateCategoryModal isOpen={createCategoryOpen} onClose={() => setCreateCategoryOpen(false)} onCreate={handleCreateCategory} />
      <AssignCategoryModal
        isOpen={!!assignCategoryItem}
        onClose={() => setAssignCategoryItem(null)}
        chatName={assignCategoryItem?.name}
        categories={categories}
        currentCategoryIds={assignCategoryItem?.categoryIds}
        onSave={handleSaveCategoryAssignments}
      />
    </div>
  );
}
