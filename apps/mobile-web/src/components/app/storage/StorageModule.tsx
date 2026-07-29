'use client';

import { useState } from 'react';
import {
  FolderOpen,
  FileText,
  List,
  Grid2x2,
  Plus,
  ShieldCheck,
  Lock,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { MOCK_STORAGE_ITEMS, StorageItem } from '@/mocks/storageItems';
import StoragePreview from './StoragePreview';

export default function StorageModule() {
  const [items, setItems] = useState<StorageItem[]>(MOCK_STORAGE_ITEMS);
  const [filter, setFilter] = useState<'all' | 'recent' | 'docs' | 'photos' | 'signed'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);

  const handleUploadFile = () => {
    const newItem: StorageItem = {
      id: `st-${Date.now()}`,
      name: 'Nuevo_Documento_Subido.pdf',
      type: 'pdf',
      size: '1.8 MB',
      date: 'Ahora',
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'recent') return item.date === 'Hoy' || item.date === 'Ahora';
    if (filter === 'docs') return item.type === 'pdf' || item.type === 'doc';
    if (filter === 'photos') return item.type === 'image';
    if (filter === 'signed') return item.isSigned;
    return true;
  });

  return (
    <div className="bg-white min-h-full flex flex-col lg:flex-row pb-24 lg:pb-0">
      
      {/* LEFT COLUMN: Storage File List or Grid */}
      <div className={`flex-1 lg:w-96 lg:flex-none lg:border-r lg:border-neutral-200 flex flex-col ${
        selectedItem ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Header & Controls */}
        <div className="p-4 border-b border-neutral-100 space-y-3">
          
          {/* Title & View Toggle */}
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-base text-neutral-900">Almacenamiento</h1>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                  }`}
                  title="Vista en lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                  }`}
                  title="Vista en cuadrícula"
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleUploadFile}
                className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Subir</span>
              </button>
            </div>
          </div>

          {/* Storage Capacity Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-900">Espacio disponible</span>
              <span className="text-neutral-500 font-normal">8.5 GB de 15 GB</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full w-[56%]" />
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
            {[
              { key: 'all', label: 'Todos', icon: FolderOpen },
              { key: 'recent', label: 'Recientes', icon: Clock },
              { key: 'docs', label: 'Documentos', icon: FileText },
              { key: 'photos', label: 'Fotos y Videos', icon: ImageIcon },
              { key: 'signed', label: 'Firmados', icon: ShieldCheck },
            ].map((f) => {
              const IconComp = f.icon;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key as 'all' | 'recent' | 'docs' | 'photos' | 'signed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                    active
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <FolderOpen className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">No hay archivos en esta categoría</p>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW (Flat Rows) */
            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`py-3 px-1 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    selectedItem?.id === item.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                    {item.type === 'folder' ? (
                      <FolderOpen className="w-5 h-5 text-brand-primary" />
                    ) : (
                      <FileText className="w-5 h-5 text-neutral-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-neutral-900 truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                        {item.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-neutral-500 font-normal">{item.size}</span>
                      {item.isSigned && (
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Firmado
                        </span>
                      )}
                      {item.isProtected && (
                        <span className="text-[9px] font-semibold text-brand-primary bg-brand-primary/10 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> PIN
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* GRID VIEW (Responsive Columns) */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-brand-primary/40 cursor-pointer flex flex-col justify-between h-36 transition-all ${
                    selectedItem?.id === item.id ? 'ring-2 ring-brand-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-brand-primary">
                      {item.type === 'folder' ? <FolderOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    {item.isProtected && <Lock className="w-3.5 h-3.5 text-brand-primary" />}
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-neutral-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-normal">
                      {item.size} • {item.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Storage File Preview */}
      <div className={`flex-1 flex-col ${selectedItem ? 'flex' : 'hidden lg:flex'}`}>
        {selectedItem ? (
          <StoragePreview item={selectedItem} onBack={() => setSelectedItem(null)} />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <FolderOpen className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún archivo seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona un archivo de la lista de la izquierda para ver su previsualización y descargarlo.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
