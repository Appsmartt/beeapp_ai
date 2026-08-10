'use client';

import { useRef, useEffect } from 'react';
import { FolderPlus, FileUp, Image as ImageIcon, Film, ScanLine } from 'lucide-react';

interface StorageCreateMenuProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: () => void;
  onUploadDocument: () => void;
  onUploadPhoto: () => void;
  onUploadVideo: () => void;
  onScanDocument: () => void;
}

export default function StorageCreateMenu({
  visible,
  onClose,
  onCreateFolder,
  onUploadDocument,
  onUploadPhoto,
  onUploadVideo,
  onScanDocument,
}: StorageCreateMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-10 w-60 bg-white border border-neutral-200 rounded-xl shadow-xl z-40 py-1.5 text-xs text-neutral-800 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        type="button"
        onClick={() => { onClose(); onCreateFolder(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <FolderPlus className="w-4 h-4 text-brand-primary shrink-0" />
        <span>Crear carpeta</span>
      </button>

      <button
        type="button"
        onClick={() => { onClose(); onUploadDocument(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left font-normal transition-colors border-t border-neutral-100"
      >
        <FileUp className="w-4 h-4 text-blue-600 shrink-0" />
        <span>Subir archivo (Documento)</span>
      </button>

      <button
        type="button"
        onClick={() => { onClose(); onUploadPhoto(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
        <span>Subir foto</span>
      </button>

      <button
        type="button"
        onClick={() => { onClose(); onUploadVideo(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <Film className="w-4 h-4 text-rose-600 shrink-0" />
        <span>Subir video</span>
      </button>

      <button
        type="button"
        onClick={() => { onClose(); onScanDocument(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 text-left font-normal transition-colors border-t border-neutral-100"
      >
        <ScanLine className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Escanear documento</span>
      </button>
    </div>
  );
}
