'use client';

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FolderOpen,
  Grid2x2,
  List,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  createCurrentWebStorageFileShare,
  createCurrentWebStorageFolder,
  createCurrentWebStorageTag,
  getCurrentWebStorageFileAccess,
  getCurrentWebStorageFiles,
  getCurrentWebStorageFileTags,
  getCurrentWebStorageFolders,
  getCurrentWebStorageSummary,
  getCurrentWebStorageTags,
  moveCurrentWebStorageFile,
  moveCurrentWebStorageFileToTrash,
  moveCurrentWebStorageFolder,
  renameCurrentWebStorageFile,
  renameCurrentWebStorageFolder,
  replaceCurrentWebStorageFileTags,
  uploadCurrentWebStorageFiles,
} from '@beeapp/api-client';
import type {
  FileSharePermission,
  StorageFile,
  StorageFolder,
  StorageShareRecipient,
  StorageSummary,
  StorageTag,
} from '@beeapp/shared-types';

import ModuleNotificationBell from '../ModuleNotificationBell';
import StorageOptionsBar, {
  StorageFilter,
} from './StorageOptionsBar';
import StorageBreadcrumbs, {
  BreadcrumbNode,
} from './StorageBreadcrumbs';
import StorageCategoryChips from './StorageCategoryChips';
import StorageRow from './StorageRow';
import StoragePreview from './StoragePreview';
import StorageCreateMenu from './StorageCreateMenu';
import StorageShareModal from './StorageShareModal';
import {
  CreateFolderModal,
  MoveFolderModal,
  RenameModal,
  type WebStorageItem,
} from './StorageModals';

type StorageCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  sortOrder?: number;
};

const MAX_FILE_SIZE_BYTES = 52_428_800;

function formatBytes(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];

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

function formatStorageDate(
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

function getItemType(
  file: StorageFile,
): WebStorageItem['type'] {
  if (file.kind === 'image') {
    return 'image';
  }

  if (file.kind === 'video') {
    return 'video';
  }

  if (file.kind === 'archive') {
    return 'zip';
  }

  if (file.kind === 'spreadsheet') {
    return 'sheet';
  }

  if (file.mime_type === 'application/pdf') {
    return 'pdf';
  }

  return 'doc';
}

function mapTagToCategory(
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

function mapFolderToItem(
  folder: StorageFolder,
  itemCount: number,
): WebStorageItem {
  return {
    id: folder.id,
    name: folder.name,
    type: 'folder',
    itemCount,
    date: formatStorageDate(folder.updated_at),
    parentId: folder.parent_id,
  };
}

function mapFileToItem(
  file: StorageFile,
  categoryIds: string[],
): WebStorageItem {
  return {
    id: file.id,
    name: file.display_name,
    type: getItemType(file),
    size: formatBytes(file.size_bytes),
    sizeBytes: file.size_bytes,
    date: formatStorageDate(file.updated_at),
    parentId: file.folder_id,
    categoryIds,
    extension: file.extension,
    mimeType: file.mime_type,
  };
}

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

function getFileNameWithExtension(
  name: string,
  extension?: string | null,
): string {
  const normalizedName = name.trim();

  if (!extension) {
    return normalizedName;
  }

  const normalizedExtension = extension
    .trim()
    .replace(/^\./, '');

  if (!normalizedExtension) {
    return normalizedName;
  }

  const extensionPattern = new RegExp(
    `\\.${normalizedExtension}$`,
    'i',
  );

  if (extensionPattern.test(normalizedName)) {
    return normalizedName;
  }

  const baseName = normalizedName.replace(
    /\.[^./\\]+$/,
    '',
  );

  return `${baseName}.${normalizedExtension}`;
}

export default function StorageModule() {
  const [items, setItems] = useState<WebStorageItem[]>([]);
  const [categories, setCategories] = useState<
    StorageCategory[]
  >([]);
  const [summary, setSummary] =
    useState<StorageSummary | null>(null);

  const [filter, setFilter] =
    useState<StorageFilter>('all');

  const [activeCategoryId, setActiveCategoryId] =
    useState<string | null>(null);

  const [viewMode, setViewMode] =
    useState<'list' | 'grid'>('list');

  const [currentFolderId, setCurrentFolderId] =
    useState<string | null>(null);

  const [pathStack, setPathStack] = useState<
    BreadcrumbNode[]
  >([
    {
      id: null,
      name: 'Inicio',
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [createMenuOpen, setCreateMenuOpen] =
    useState(false);

  const [createFolderOpen, setCreateFolderOpen] =
    useState(false);

  const [createCategoryOpen, setCreateCategoryOpen] =
    useState(false);

  const [assignCategoryItem, setAssignCategoryItem] =
    useState<WebStorageItem | null>(null);

  const [renamingItem, setRenamingItem] =
    useState<WebStorageItem | null>(null);

  const [movingItem, setMovingItem] =
    useState<WebStorageItem | null>(null);

  const [selectedItem, setSelectedItem] =
    useState<WebStorageItem | null>(null);

  const [shareItem, setShareItem] =
    useState<WebStorageItem | null>(null);

  const [sharing, setSharing] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showError = (
    message: string,
  ) => {
    setSuccessMessage(null);
    setErrorMessage(message);
  };

  const showSuccess = (
    message: string,
  ) => {
    setErrorMessage(null);
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage((currentMessage) => (
        currentMessage === message
          ? null
          : currentMessage
      ));
    }, 4_000);
  };

  const loadStorage = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [
          summaryResponse,
          foldersResponse,
          filesResponse,
          tagsResponse,
        ] = await Promise.all([
          getCurrentWebStorageSummary(),
          getCurrentWebStorageFolders({}),
          getCurrentWebStorageFiles({
            status: 'ready',
            scope: 'recent',
            limit: 100,
            offset: 0,
          }),
          getCurrentWebStorageTags(),
        ]);

        const tagResults = await Promise.all(
          filesResponse.files.map(async (file) => {
            try {
              const response =
                await getCurrentWebStorageFileTags(
                  file.id,
                );

              return [
                file.id,
                response.tags.map((tag) => tag.id),
              ] as const;
            } catch {
              return [
                file.id,
                [] as string[],
              ] as const;
            }
          }),
        );

        const tagIdsByFileId = new Map(tagResults);

        const folderCounts = getFolderItemCounts(
          foldersResponse.folders,
          filesResponse.files,
        );

        const nextItems = [
          ...foldersResponse.folders.map((folder) =>
            mapFolderToItem(
              folder,
              folderCounts.get(folder.id) || 0,
            ),
          ),
          ...filesResponse.files.map((file) =>
            mapFileToItem(
              file,
              tagIdsByFileId.get(file.id) || [],
            ),
          ),
        ];

        setSummary(summaryResponse.storage);
        setCategories(
          tagsResponse.tags.map(mapTagToCategory),
        );
        setItems(nextItems);

        setSelectedItem((currentItem) => {
          if (!currentItem) {
            return null;
          }

          return (
            nextItems.find(
              (item) => item.id === currentItem.id,
            ) || null
          );
        });
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar el almacenamiento.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadStorage();
  }, [loadStorage]);

  const handleNavigateBreadcrumb = (
    index: number,
  ) => {
    const nextStack = pathStack.slice(0, index + 1);

    setPathStack(nextStack);
    setCurrentFolderId(
      nextStack[nextStack.length - 1].id,
    );
    setSelectedItem(null);
  };

  const openItemContent = (
    item: WebStorageItem,
  ) => {
    if (item.type === 'folder') {
      setPathStack((current) => [
        ...current,
        {
          id: item.id,
          name: item.name,
        },
      ]);
      setCurrentFolderId(item.id);
      setSelectedItem(null);
      return;
    }

    setSelectedItem(item);
  };

  const filteredItems = useMemo(
    () => items.filter((item) => {
      if (
        activeCategoryId
        && !item.categoryIds?.includes(
          activeCategoryId,
        )
      ) {
        return false;
      }

      if (filter === 'all') {
        return item.parentId === currentFolderId;
      }

      if (filter === 'recent') {
        return (
          item.date.includes('Hoy')
          || item.date.includes('Ayer')
        );
      }

      if (filter === 'docs') {
        return (
          item.type === 'pdf'
          || item.type === 'doc'
          || item.type === 'sheet'
        );
      }

      if (filter === 'media') {
        return (
          item.type === 'image'
          || item.type === 'video'
        );
      }

      if (filter === 'protected') {
        return item.isProtected;
      }

      return true;
    }),
    [
      activeCategoryId,
      currentFolderId,
      filter,
      items,
    ],
  );

  const usagePercentage = summary
    ? Math.min(
      100,
      Math.max(
        0,
        summary.usage_percentage,
      ),
    )
    : 0;

  const handleCreateFolder = async (
    name: string,
  ) => {
    try {
      setIsSubmitting(true);

      await createCurrentWebStorageFolder({
        name,
        parent_id: currentFolderId,
      });

      setCreateFolderOpen(false);

      await loadStorage(true);
      showSuccess('Carpeta creada correctamente.');
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible crear la carpeta.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (
    category: StorageCategory,
  ) => {
    try {
      setIsSubmitting(true);

      const response =
        await createCurrentWebStorageTag({
          name: category.name,
          icon: category.icon,
          color: category.color,
        });

      setCreateCategoryOpen(false);
      setActiveCategoryId(response.tag.id);

      await loadStorage(true);
      showSuccess('Categoría creada correctamente.');
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible crear la categoría.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async (
    item: WebStorageItem,
    newName: string,
  ) => {
    try {
      setIsSubmitting(true);

      if (item.type === 'folder') {
        await renameCurrentWebStorageFolder(
          item.id,
          {
            name: newName,
          },
        );
      } else {
        await renameCurrentWebStorageFile(
          item.id,
          {
            display_name: getFileNameWithExtension(
              newName,
              item.extension,
            ),
          },
        );
      }

      setRenamingItem(null);

      await loadStorage(true);
      showSuccess('Elemento renombrado correctamente.');
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible renombrar el elemento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (
    item: WebStorageItem,
    targetFolderId: string | null,
  ) => {
    try {
      setIsSubmitting(true);

      if (item.type === 'folder') {
        await moveCurrentWebStorageFolder(
          item.id,
          {
            parent_id: targetFolderId,
          },
        );
      } else {
        await moveCurrentWebStorageFile(
          item.id,
          {
            folder_id: targetFolderId,
          },
        );
      }

      setMovingItem(null);
      setSelectedItem(null);

      await loadStorage(true);
      showSuccess('Elemento movido correctamente.');
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible mover el elemento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCategories = async (
    assignedIds: string[],
  ) => {
    const item = assignCategoryItem;

    if (!item || item.type === 'folder') {
      return;
    }

    try {
      setIsSubmitting(true);

      await replaceCurrentWebStorageFileTags(
        item.id,
        {
          tag_ids: assignedIds,
        },
      );

      setAssignCategoryItem(null);

      await loadStorage(true);
      showSuccess('Categorías actualizadas correctamente.');
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible actualizar las categorías.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async (
    recipient: StorageShareRecipient,
    permission: FileSharePermission,
  ) => {
    const item = shareItem;

    if (!item || item.type === 'folder') {
      throw new Error(
        'Solo puedes compartir archivos.',
      );
    }

    try {
      setSharing(true);

      await createCurrentWebStorageFileShare(
        item.id,
        {
          recipient_id: recipient.id,
          permission,
        },
      );

      setShareItem(null);

      const recipientName = [
        recipient.first_name,
        recipient.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        || recipient.email
        || 'el usuario';

      showSuccess(
        `“${item.name}” fue compartido con ${recipientName}.`,
      );
    } finally {
      setSharing(false);
    }
  };

  const handleTrash = async (
    item: WebStorageItem,
  ) => {
    if (item.type === 'folder') {
      showError(
        'La eliminación de carpetas todavía no está disponible desde la vista web.',
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas mover “${item.name}” a la papelera?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);

      await moveCurrentWebStorageFileToTrash(
        item.id,
      );

      setSelectedItem(null);

      await loadStorage(true);
      showSuccess('Archivo movido a la papelera.');
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible mover el archivo a la papelera.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (
    item: WebStorageItem,
  ) => {
    if (item.type === 'folder') {
      return;
    }

    try {
      const response =
        await getCurrentWebStorageFileAccess(
          item.id,
          true,
        );

      window.open(
        response.url,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible preparar la descarga.',
      );
    }
  };

  const handleUploadClick = (
    accept: string,
  ) => {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const handleUploadChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(
      event.target.files || [],
    );

    event.target.value = '';

    if (!selectedFiles.length) {
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE_BYTES,
    );

    if (oversizedFile) {
      showError(
        `“${oversizedFile.name}” supera el límite de 50 MB.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      if (currentFolderId) {
        formData.append(
          'folder_id',
          currentFolderId,
        );
      }

      const response =
        await uploadCurrentWebStorageFiles(
          formData,
        );

      if (response.failure_count > 0) {
        showError(
          `${response.success_count} archivo(s) se subieron. ${response.failure_count} no pudieron subirse.`,
        );
      } else {
        showSuccess(
          `${response.success_count} archivo(s) se subieron correctamente.`,
        );
      }

      await loadStorage(true);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'No fue posible subir los archivos.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-full select-none bg-white">
      <StorageOptionsBar
        filter={filter}
        onSelectFilter={setFilter}
      />

      <div className="flex w-[380px] shrink-0 flex-col border-r border-neutral-200 bg-white lg:w-[420px]">
        <div className="space-y-3 border-b border-neutral-100 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="truncate text-base font-semibold text-neutral-900">
              Almacenamiento
            </h1>

            <div className="relative flex shrink-0 items-center gap-1.5">
              <div className="flex items-center rounded-xl border border-neutral-200/60 bg-neutral-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-brand-primary shadow-xs'
                      : 'text-neutral-500'
                  }`}
                  title="Vista en lista"
                >
                  <List className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-brand-primary shadow-xs'
                      : 'text-neutral-500'
                  }`}
                  title="Vista en cuadrícula"
                >
                  <Grid2x2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateMenuOpen((current) => !current)
                }
                disabled={isSubmitting}
                className="flex h-8 items-center gap-1 rounded-full bg-brand-primary px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-dark disabled:bg-neutral-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Subir</span>
              </button>

              <div className="flex h-8 items-center justify-center">
                <ModuleNotificationBell moduleId="storage" />
              </div>

              <StorageCreateMenu
                visible={createMenuOpen}
                onClose={() => setCreateMenuOpen(false)}
                onCreateFolder={() =>
                  setCreateFolderOpen(true)
                }
                onUploadDocument={() =>
                  handleUploadClick('*/*')
                }
                onUploadPhoto={() =>
                  handleUploadClick('image/*')
                }
                onUploadVideo={() =>
                  handleUploadClick('video/*')
                }
                onScanDocument={() =>
                  showError(
                    'El escáner de documentos está disponible únicamente en la app móvil.',
                  )
                }
              />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleUploadChange(event);
            }}
          />

          <div className="space-y-1.5 rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-normal text-neutral-600">
                Espacio utilizado
              </span>

              <span className="font-semibold text-neutral-900">
                {summary
                  ? `${formatBytes(
                    summary.used_bytes,
                  )} de ${formatBytes(
                    summary.quota_bytes,
                  )}`
                  : 'Cargando...'}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-neutral-200/80">
              <div
                className="h-full rounded-full bg-brand-primary transition-all"
                style={{
                  width: `${usagePercentage}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-normal text-neutral-500">
              <span>
                {summary
                  ? `${Math.round(
                    usagePercentage,
                  )}% usado`
                  : ''}
              </span>

              <span>
                {summary
                  ? `${formatBytes(
                    summary.available_bytes,
                  )} disponibles`
                  : ''}
              </span>
            </div>
          </div>

          <StorageBreadcrumbs
            pathStack={pathStack}
            onNavigate={handleNavigateBreadcrumb}
          />

          <StorageCategoryChips
            categories={categories}
            activeCategoryId={activeCategoryId}
            onChange={setActiveCategoryId}
            onCreate={() =>
              setCreateCategoryOpen(true)
            }
          />

          {errorMessage && (
            <div className="flex items-start justify-between gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <p className="text-[11px] font-normal text-red-700">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-xs font-semibold text-red-600"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-normal text-emerald-700">
                {successMessage}
              </p>

              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-xs font-semibold text-emerald-600"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-normal text-neutral-500">
              {loading
                ? 'Cargando archivos...'
                : `${filteredItems.length} elemento(s)`}
            </span>

            <button
              type="button"
              onClick={() => {
                void loadStorage(true);
              }}
              disabled={refreshing || isSubmitting}
              className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-primary disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-neutral-100"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="space-y-2 py-16 text-center text-neutral-400">
              <FolderOpen className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="text-xs font-normal">
                Carpeta o categoría vacía
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 gap-3'
                  : 'space-y-1'
              }
            >
              {filteredItems.map((item) => (
                <StorageRow
                  key={item.id}
                  item={item}
                  isSelected={
                    selectedItem?.id === item.id
                  }
                  viewMode={viewMode}
                  onClick={() => openItemContent(item)}
                  onOpenPreview={openItemContent}
                  onRename={setRenamingItem}
                  onMove={setMovingItem}
                  onShare={(nextItem) => {
                    if (nextItem.type === 'folder') {
                      showError(
                        'Solo puedes compartir archivos.',
                      );
                      return;
                    }

                    setShareItem(nextItem);
                  }}
                  onDownload={(nextItem) => {
                    void handleDownload(nextItem);
                  }}
                  onToggleProtection={(nextItem) => {
                    showError(
                      `La protección con PIN de “${nextItem.name}” se implementará más adelante.`,
                    );
                  }}
                  onDelete={(nextItem) => {
                    void handleTrash(nextItem);
                  }}
                  onAssignCategory={(nextItem) => {
                    if (nextItem.type === 'folder') {
                      showError(
                        'Las categorías solo se asignan a archivos.',
                      );
                      return;
                    }

                    setAssignCategoryItem(nextItem);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {selectedItem ? (
          <StoragePreview
            key={selectedItem.id}
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onDownload={(item) => {
              void handleDownload(item);
            }}
            onShare={(item) => {
              if (item.type === 'folder') {
                showError(
                  'Solo puedes compartir archivos.',
                );
                return;
              }

              setShareItem(item);
            }}
            onDelete={(item) => {
              void handleTrash(item);
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-neutral-50/50 p-12 text-center text-neutral-400">
            <div className="max-w-xs space-y-3">
              <FolderOpen className="mx-auto h-12 w-12 text-neutral-300" />

              <h3 className="text-sm font-semibold text-neutral-700">
                Ningún archivo seleccionado
              </h3>

              <p className="text-xs font-normal text-neutral-500">
                Selecciona un archivo para ver su previsualización o información.
              </p>
            </div>
          </div>
        )}
      </div>

      <CreateFolderModal
        visible={createFolderOpen}
        submitting={isSubmitting}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        visible={!!renamingItem}
        item={renamingItem}
        submitting={isSubmitting}
        onClose={() => setRenamingItem(null)}
        onRename={handleRename}
      />

      <MoveFolderModal
        visible={!!movingItem}
        item={movingItem}
        folders={items.filter(
          (item) => item.type === 'folder',
        )}
        submitting={isSubmitting}
        onClose={() => setMovingItem(null)}
        onMove={handleMove}
      />

      {createCategoryOpen && (
        <CreateWebCategoryModal
          submitting={isSubmitting}
          onClose={() => setCreateCategoryOpen(false)}
          onCreate={handleCreateCategory}
        />
      )}

      {assignCategoryItem && (
        <AssignWebCategoryModal
          item={assignCategoryItem}
          categories={categories}
          submitting={isSubmitting}
          onClose={() => setAssignCategoryItem(null)}
          onSave={handleAssignCategories}
        />
      )}

      <StorageShareModal
        visible={!!shareItem}
        fileName={shareItem?.name}
        submitting={sharing}
        onClose={() => {
          if (!sharing) {
            setShareItem(null);
          }
        }}
        onShare={handleShare}
      />
    </div>
  );
}

function CreateWebCategoryModal({
  submitting,
  onClose,
  onCreate,
}: {
  submitting: boolean;
  onClose: () => void;
  onCreate: (
    category: StorageCategory,
  ) => Promise<void>;
}) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-neutral-900">
          Nueva categoría
        </h3>

        <input
          autoFocus
          value={name}
          disabled={submitting}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre de la categoría"
          className="h-9 w-full rounded-xl border border-neutral-200 px-3 text-xs outline-none focus:border-brand-primary disabled:bg-neutral-100"
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-9 flex-1 rounded-full border border-neutral-200 text-xs text-neutral-700 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!name.trim() || submitting}
            onClick={() => {
              void onCreate({
                id: '',
                name: name.trim(),
                icon: 'Tag',
                color: '#F3E8FF',
              });
            }}
            className="h-9 flex-1 rounded-full bg-brand-primary text-xs font-semibold text-white disabled:bg-neutral-300"
          >
            {submitting ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignWebCategoryModal({
  item,
  categories,
  submitting,
  onClose,
  onSave,
}: {
  item: WebStorageItem;
  categories: StorageCategory[];
  submitting: boolean;
  onClose: () => void;
  onSave: (categoryIds: string[]) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    item.categoryIds || [],
  );

  const toggleCategory = (
    categoryId: string,
  ) => {
    setSelectedIds((currentIds) => (
      currentIds.includes(categoryId)
        ? currentIds.filter((id) => id !== categoryId)
        : [...currentIds, categoryId]
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-xl">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Asignar a categoría
          </h3>

          <p className="mt-1 truncate text-[11px] text-neutral-500">
            {item.name}
          </p>
        </div>

        <div className="max-h-56 space-y-1 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-400">
              Todavía no hay categorías disponibles.
            </p>
          ) : (
            categories.map((category) => {
              const isSelected = selectedIds.includes(
                category.id,
              );

              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    toggleCategory(category.id)
                  }
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50 ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor: category.color,
                    }}
                  />

                  <span className="flex-1">
                    {category.name}
                  </span>

                  {isSelected && (
                    <span className="font-semibold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-9 flex-1 rounded-full border border-neutral-200 text-xs text-neutral-700 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              void onSave(selectedIds);
            }}
            className="h-9 flex-1 rounded-full bg-brand-primary text-xs font-semibold text-white disabled:bg-neutral-300"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}