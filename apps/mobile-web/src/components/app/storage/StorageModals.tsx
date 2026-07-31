'use client';

import { useState } from 'react';
import { X, FolderPlus, Folder, FolderInput, Pencil } from 'lucide-react';
import { StorageItem } from '@/mocks/storageItems';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateFolderModal({ visible, onClose, onCreate }: CreateFolderModalProps) {
  const [name, setName] = useState('');

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-4 border border-neutral-100 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <FolderPlus className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Nueva carpeta</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-normal text-neutral-600">Nombre de la carpeta</label>
          <input
            type="text"
            autoFocus
            placeholder="Ej: Proyectos 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 h-9 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50">
            Cancelar
          </button>
          <button type="submit" disabled={!name.trim()} className="flex-1 h-9 rounded-full bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:bg-neutral-300">
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}

interface RenameModalProps {
  visible: boolean;
  item: StorageItem | null;
  onClose: () => void;
  onRename: (id: string, newName: string) => void;
}

export function RenameModal({ visible, item, onClose, onRename }: RenameModalProps) {
  const [name, setName] = useState(item?.name || '');

  if (!visible || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRename(item.id, name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-4 border border-neutral-100 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Renombrar</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-normal text-neutral-600">Nuevo nombre</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 h-9 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50">
            Cancelar
          </button>
          <button type="submit" disabled={!name.trim()} className="flex-1 h-9 rounded-full bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:bg-neutral-300">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

interface MoveFolderModalProps {
  visible: boolean;
  item: StorageItem | null;
  folders: StorageItem[];
  onClose: () => void;
  onMove: (itemId: string, targetFolderId: string | null) => void;
}

export function MoveFolderModal({ visible, item, folders, onClose, onMove }: MoveFolderModalProps) {
  if (!visible || !item) return null;

  const validFolders = folders.filter((f) => f.type === 'folder' && f.id !== item.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-4 border border-neutral-100 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <FolderInput className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Mover a...</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => { onMove(item.id, null); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-left text-xs font-normal"
          >
            <Folder className="w-4 h-4 text-neutral-500" />
            <span>Inicio (Carpeta raíz)</span>
          </button>

          {validFolders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { onMove(item.id, f.id); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-left text-xs font-normal"
            >
              <Folder className="w-4 h-4 text-brand-primary" />
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        <button type="button" onClick={onClose} className="w-full h-9 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50">
          Cancelar
        </button>
      </div>
    </div>
  );
}
