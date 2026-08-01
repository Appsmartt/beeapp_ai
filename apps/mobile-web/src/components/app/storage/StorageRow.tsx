'use client';

import { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  FileSpreadsheet,
  Lock,
  Unlock,
  ShieldCheck,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Eye,
  Pencil,
  FolderInput,
  Tag,
} from 'lucide-react';
import { StorageItem } from '@/mocks/storageItems';

interface StorageRowProps {
  item: StorageItem;
  isSelected: boolean;
  viewMode: 'list' | 'grid';
  onClick: () => void;
  onOpenPreview: (item: StorageItem) => void;
  onRename: (item: StorageItem) => void;
  onMove: (item: StorageItem) => void;
  onShare: (item: StorageItem) => void;
  onDownload: (item: StorageItem) => void;
  onToggleProtection: (item: StorageItem) => void;
  onDelete: (item: StorageItem) => void;
  onAssignCategory?: (item: StorageItem) => void;
}

export function renderStorageIcon(type: StorageItem['type'], isProtected?: boolean) {
  if (isProtected) return <Lock className="w-5 h-5 text-neutral-600" />;
  switch (type) {
    case 'folder':
      return <FolderOpen className="w-5 h-5 text-brand-primary" />;
    case 'image':
      return <ImageIcon className="w-5 h-5 text-purple-600" />;
    case 'video':
      return <Film className="w-5 h-5 text-blue-600" />;
    case 'zip':
      return <Archive className="w-5 h-5 text-amber-600" />;
    case 'sheet':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    default:
      return <FileText className="w-5 h-5 text-neutral-600" />;
  }
}

export default function StorageRow({
  item,
  isSelected,
  viewMode,
  onClick,
  onOpenPreview,
  onRename,
  onMove,
  onShare,
  onDownload,
  onToggleProtection,
  onDelete,
  onAssignCategory,
}: StorageRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subtext =
    item.type === 'folder'
      ? `${item.itemCount || 0} ${item.itemCount === 1 ? 'elemento' : 'elementos'}`
      : item.size || 'Archivo';

  const menuContent = (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-8 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 py-1.5 text-xs text-neutral-800 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        type="button"
        onClick={() => { setMenuOpen(false); onOpenPreview(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <Eye className="w-3.5 h-3.5 text-neutral-500" />
        <span>Abrir / Vista previa</span>
      </button>

      <button
        type="button"
        onClick={() => { setMenuOpen(false); onRename(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-neutral-500" />
        <span>Renombrar</span>
      </button>

      <button
        type="button"
        onClick={() => { setMenuOpen(false); onMove(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <FolderInput className="w-3.5 h-3.5 text-neutral-500" />
        <span>Mover a otra carpeta</span>
      </button>

      <button
        type="button"
        onClick={() => { setMenuOpen(false); onShare(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <Share2 className="w-3.5 h-3.5 text-neutral-500" />
        <span>Compartir</span>
      </button>

      <button
        type="button"
        onClick={() => { setMenuOpen(false); onDownload(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        <Download className="w-3.5 h-3.5 text-neutral-500" />
        <span>Descargar</span>
      </button>

      {onAssignCategory && (
        <button
          type="button"
          onClick={() => { setMenuOpen(false); onAssignCategory(item); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
        >
          <Tag className="w-3.5 h-3.5 text-brand-primary" />
          <span className="text-brand-primary font-normal">Asignar a categoría</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => { setMenuOpen(false); onToggleProtection(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
      >
        {item.isProtected ? (
          <Unlock className="w-3.5 h-3.5 text-brand-primary" />
        ) : (
          <Lock className="w-3.5 h-3.5 text-brand-primary" />
        )}
        <span className="text-brand-primary font-normal">
          {item.isProtected ? 'Quitar protección' : 'Proteger con PIN'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => { setMenuOpen(false); onDelete(item); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 text-left font-normal transition-colors border-t border-neutral-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Eliminar</span>
      </button>
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={`relative p-3.5 rounded-2xl bg-white border border-neutral-200/80 hover:border-brand-primary/40 cursor-pointer flex flex-col justify-between h-40 transition-all select-none ${
          isSelected ? 'ring-2 ring-brand-primary border-transparent' : ''
        }`}
      >
        <div className="flex items-center justify-between relative">
          <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-center">
            {renderStorageIcon(item.type, item.isProtected)}
          </div>

          <div className="flex items-center gap-1">
            {item.isSigned && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            {item.isProtected && <Lock className="w-4 h-4 text-brand-primary" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {menuOpen && menuContent}
        </div>

        <div className="space-y-1 min-w-0">
          <p className="font-normal text-xs text-neutral-900 truncate">{item.name}</p>
          <p className="text-[10px] text-neutral-400 font-normal">
            {subtext} • {item.date}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`group relative py-3 px-3 flex items-center gap-3 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors select-none ${
        isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
        {renderStorageIcon(item.type, item.isProtected)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-normal text-xs text-neutral-900 truncate">{item.name}</span>
          <span className="text-[10px] text-neutral-400 font-normal shrink-0">{item.date}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-neutral-500 font-normal">{subtext}</span>

          {item.isSigned && (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
              <ShieldCheck className="w-2.5 h-2.5" /> Firmado
            </span>
          )}

          {item.isProtected && (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-brand-primary bg-brand-primary/10 px-1.5 py-0.2 rounded border border-brand-primary/20">
              <Lock className="w-2.5 h-2.5" /> PIN
            </span>
          )}
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="Opciones de archivo"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && menuContent}
      </div>
    </div>
  );
}
