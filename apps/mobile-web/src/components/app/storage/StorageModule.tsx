'use client';

import { useState } from 'react';
import { List, Grid2x2, Plus, FolderOpen } from 'lucide-react';
import { MOCK_STORAGE_ITEMS, StorageItem } from '@/mocks/storageItems';
import StorageOptionsBar, { StorageFilter } from './StorageOptionsBar';
import StorageBreadcrumbs, { BreadcrumbNode } from './StorageBreadcrumbs';
import StorageRow from './StorageRow';
import StoragePreview from './StoragePreview';
import StorageCreateMenu from './StorageCreateMenu';
import { CreateFolderModal, RenameModal, MoveFolderModal } from './StorageModals';
import SignatureModal from './SignatureModal';
import PinLockModal from '../chat/modals/PinLockModal';

export default function StorageModule() {
  const [items, setItems] = useState<StorageItem[]>(MOCK_STORAGE_ITEMS);
  const [filter, setFilter] = useState<StorageFilter>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<BreadcrumbNode[]>([{ id: null, name: 'Inicio' }]);

  // Modals & Menu States
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<StorageItem | null>(null);
  const [movingItem, setMovingItem] = useState<StorageItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [lockedItem, setLockedItem] = useState<StorageItem | null>(null);
  const [signingItem, setSigningItem] = useState<StorageItem | null>(null);

  // Creation Actions
  const handleCreateFolder = (name: string) => {
    const newFolder: StorageItem = {
      id: `f-${Date.now()}`,
      name,
      type: 'folder',
      itemCount: 0,
      date: 'Ahora',
      parentId: currentFolderId,
    };
    setItems((prev) => [newFolder, ...prev]);
  };

  const handleUploadMock = (type: StorageItem['type'], name: string, size: string) => {
    const newFile: StorageItem = {
      id: `st-${Date.now()}`,
      name,
      type,
      size,
      date: 'Ahora',
      parentId: currentFolderId,
    };
    setItems((prev) => [newFile, ...prev]);
    setSelectedItem(newFile);
  };

  // Breadcrumbs navigation
  const handleNavigateBreadcrumb = (index: number) => {
    const newStack = pathStack.slice(0, index + 1);
    setPathStack(newStack);
    setCurrentFolderId(newStack[newStack.length - 1].id);
  };

  // Click on item
  const handleItemPress = (item: StorageItem) => {
    if (item.isProtected) {
      setLockedItem(item);
      return;
    }
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

  // Row actions
  const handleRename = (id: string, newName: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: newName } : i)));
    if (selectedItem?.id === id) {
      setSelectedItem((prev) => (prev ? { ...prev, name: newName } : null));
    }
  };

  const handleMove = (itemId: string, targetFolderId: string | null) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, parentId: targetFolderId } : i)));
  };

  const handleDownload = (item: StorageItem) => {
    alert(`Descargando ${item.name}...`);
  };

  const handleShare = (item: StorageItem) => {
    alert(`Enlace copiado para ${item.name}`);
  };

  const handleToggleProtection = (item: StorageItem) => {
    const next = !item.isProtected;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isProtected: next } : i)));
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => (prev ? { ...prev, isProtected: next } : null));
    }
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

  // Filtering
  const filteredItems = items.filter((item) => {
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
      {/* 1. BARRA DE OPCIONES DE ALMACENAMIENTO (56px) */}
      <StorageOptionsBar filter={filter} onSelectFilter={setFilter} />

      {/* 2. PANEL IZQUIERDO: Lista de archivos (40% de ancho, min 380px, max 450px) */}
      <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        {/* Cabecera del panel */}
        <div className="p-3.5 border-b border-neutral-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-semibold text-base text-neutral-900 truncate">Almacenamiento</h1>

            <div className="flex items-center gap-1.5 shrink-0 relative">
              {/* Toggle Vista Lista / Cuadrícula */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                  }`}
                  title="Vista en lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                  }`}
                  title="Vista en cuadrícula"
                >
                  <Grid2x2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botón + Subir / Crear con Dropdown */}
              <button
                type="button"
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir</span>
              </button>

              {/* Menú de creación */}
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

          {/* Tarjeta de espacio disponible con barra de progreso */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-900">Espacio disponible</span>
              <span className="text-neutral-500 font-normal">8.5 GB de 15 GB</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full w-[56%]" />
            </div>
          </div>

          {/* Breadcrumbs */}
          {filter === 'all' && (
            <StorageBreadcrumbs pathStack={pathStack} onNavigate={handleNavigateBreadcrumb} />
          )}
        </div>

        {/* Contenido: Lista o Cuadrícula */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <FolderOpen className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">No hay archivos ni carpetas que mostrar</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-neutral-100">
              {filteredItems.map((item) => (
                <StorageRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  viewMode="list"
                  onClick={() => handleItemPress(item)}
                  onOpenPreview={openItemContent}
                  onRename={setRenamingItem}
                  onMove={setMovingItem}
                  onShare={handleShare}
                  onDownload={handleDownload}
                  onToggleProtection={handleToggleProtection}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3.5">
              {filteredItems.map((item) => (
                <StorageRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  viewMode="grid"
                  onClick={() => handleItemPress(item)}
                  onOpenPreview={openItemContent}
                  onRename={setRenamingItem}
                  onMove={setMovingItem}
                  onShare={handleShare}
                  onDownload={handleDownload}
                  onToggleProtection={handleToggleProtection}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. PANEL DERECHO: Preview / Detalle del archivo (flex-1) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedItem ? (
          <StoragePreview
            key={selectedItem.id}
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onDownload={handleDownload}
            onShare={handleShare}
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

      {/* Modales */}
      <CreateFolderModal
        visible={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />
      <RenameModal
        visible={!!renamingItem}
        item={renamingItem}
        onClose={() => setRenamingItem(null)}
        onRename={handleRename}
      />
      <MoveFolderModal
        visible={!!movingItem}
        item={movingItem}
        folders={items}
        onClose={() => setMovingItem(null)}
        onMove={handleMove}
      />
      <SignatureModal
        visible={!!signingItem}
        item={signingItem}
        onClose={() => setSigningItem(null)}
        onConfirmSign={handleConfirmSign}
      />
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
    </div>
  );
}
