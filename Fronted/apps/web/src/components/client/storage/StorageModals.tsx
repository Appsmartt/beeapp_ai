'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Folder,
  FolderInput,
  FolderPlus,
  Pencil,
  X,
} from 'lucide-react';

export interface WebStorageItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'doc' | 'video' | 'zip' | 'sheet';
  size?: string;
  sizeBytes?: number;
  itemCount?: number;
  date: string;
  parentId: string | null;
  categoryIds?: string[];
  isProtected?: boolean;
  isSigned?: boolean;
  signerName?: string;
  signedAt?: string;
  extension?: string | null;
  mimeType?: string;
}

interface CreateFolderModalProps {
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void> | void;
}

export function CreateFolderModal({
  visible,
  submitting = false,
  onClose,
  onCreate,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName || submitting) {
      return;
    }

    await onCreate(normalizedName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <button
        type="button"
        aria-label="Cerrar"
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <FolderPlus className="h-4 w-4" />
            </div>

            <h3 className="text-sm font-semibold text-neutral-900">
              Nueva carpeta
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-normal text-neutral-600">
            Nombre de la carpeta
          </label>

          <input
            type="text"
            autoFocus
            placeholder="Ej. Proyectos 2026"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            className="h-9 w-full rounded-xl border border-neutral-200 px-3 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary disabled:bg-neutral-100"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 flex-1 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="h-9 flex-1 rounded-full bg-brand-primary text-xs font-semibold text-white hover:bg-brand-dark disabled:bg-neutral-300"
          >
            {submitting ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface RenameModalProps {
  visible: boolean;
  item: WebStorageItem | null;
  submitting?: boolean;
  onClose: () => void;
  onRename: (
    item: WebStorageItem,
    newName: string,
  ) => Promise<void> | void;
}

export function RenameModal({
  visible,
  item,
  submitting = false,
  onClose,
  onRename,
}: RenameModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible && item) {
      setName(item.name);
    }
  }, [item, visible]);

  if (!visible || !item) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName || submitting) {
      return;
    }

    await onRename(item, normalizedName);
  };

  const itemLabel =
    item.type === 'folder'
      ? 'carpeta'
      : 'archivo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <button
        type="button"
        aria-label="Cerrar"
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Pencil className="h-4 w-4" />
            </div>

            <h3 className="text-sm font-semibold text-neutral-900">
              Renombrar {itemLabel}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-normal text-neutral-600">
            Nuevo nombre
          </label>

          <input
            type="text"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            className="h-9 w-full rounded-xl border border-neutral-200 px-3 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary disabled:bg-neutral-100"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 flex-1 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="h-9 flex-1 rounded-full bg-brand-primary text-xs font-semibold text-white hover:bg-brand-dark disabled:bg-neutral-300"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface MoveFolderModalProps {
  visible: boolean;
  item: WebStorageItem | null;
  folders: WebStorageItem[];
  submitting?: boolean;
  onClose: () => void;
  onMove: (
    item: WebStorageItem,
    targetFolderId: string | null,
  ) => Promise<void> | void;
}

function getBlockedFolderIds(
  item: WebStorageItem,
  folders: WebStorageItem[],
): Set<string> {
  const blockedIds = new Set<string>([item.id]);

  if (item.type !== 'folder') {
    return blockedIds;
  }

  let foundDescendant = true;

  while (foundDescendant) {
    foundDescendant = false;

    folders.forEach((folder) => {
      if (
        folder.parentId
        && blockedIds.has(folder.parentId)
        && !blockedIds.has(folder.id)
      ) {
        blockedIds.add(folder.id);
        foundDescendant = true;
      }
    });
  }

  return blockedIds;
}

export function MoveFolderModal({
  visible,
  item,
  folders,
  submitting = false,
  onClose,
  onMove,
}: MoveFolderModalProps) {
  const blockedFolderIds = useMemo(
    () => (
      item
        ? getBlockedFolderIds(item, folders)
        : new Set<string>()
    ),
    [folders, item],
  );

  const availableFolders = useMemo(
    () => folders.filter(
      (folder) => (
        folder.type === 'folder'
        && !blockedFolderIds.has(folder.id)
      ),
    ),
    [blockedFolderIds, folders],
  );

  if (!visible || !item) {
    return null;
  }

  const handleMove = async (
    targetFolderId: string | null,
  ) => {
    if (
      submitting
      || item.parentId === targetFolderId
    ) {
      onClose();
      return;
    }

    await onMove(item, targetFolderId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <button
        type="button"
        aria-label="Cerrar"
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <FolderInput className="h-4 w-4" />
            </div>

            <h3 className="text-sm font-semibold text-neutral-900">
              Mover a...
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] font-normal leading-relaxed text-neutral-500">
          {item.type === 'folder'
            ? 'Selecciona una carpeta de destino. Las subcarpetas del elemento actual no están disponibles.'
            : 'Selecciona la carpeta de destino para el archivo.'}
        </p>

        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => {
              void handleMove(null);
            }}
            disabled={submitting}
            className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-normal transition-colors disabled:opacity-50 ${
              item.parentId === null
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Folder className="h-4 w-4 text-neutral-500" />
            <span>Inicio (Carpeta raíz)</span>
          </button>

          {availableFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                void handleMove(folder.id);
              }}
              disabled={submitting}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-normal transition-colors disabled:opacity-50 ${
                item.parentId === folder.id
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                  : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Folder className="h-4 w-4 text-brand-primary" />
              <span>{folder.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="h-9 w-full rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}