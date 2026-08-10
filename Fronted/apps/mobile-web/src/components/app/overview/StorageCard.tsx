'use client';

import type { ElementType } from 'react';
import { FolderOpen, Folder, FileText, FileImage, File, Lock, Film, Archive, FileSpreadsheet } from 'lucide-react';
import { MOCK_STORAGE_ITEMS, StorageItem } from '@/mocks/storageItems';
import OverviewCard from './OverviewCard';

interface StorageCardProps {
  onSeeMore: () => void;
}

const TYPE_ICONS: Record<StorageItem['type'], ElementType> = {
  folder: Folder,
  pdf: FileText,
  image: FileImage,
  doc: File,
  video: Film,
  zip: Archive,
  sheet: FileSpreadsheet,
};

/** Espacio ocupado (mock, coherente con el módulo de Almacenamiento) */
const USED_GB = 8.5;
const TOTAL_GB = 15;

/** Almacenamiento: barra de espacio arriba y mini grid de archivos en dos columnas */
export default function StorageCard({ onSeeMore }: StorageCardProps) {
  const usedPercent = Math.round((USED_GB / TOTAL_GB) * 100);

  return (
    <OverviewCard title="Almacenamiento" icon={FolderOpen} onSeeMore={onSeeMore}>
      {/* Barra de espacio */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] font-normal mb-1.5">
          <span className="text-neutral-500">
            {USED_GB} GB de {TOTAL_GB} GB
          </span>
          <span className="text-neutral-400">{usedPercent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${usedPercent}%` }} />
        </div>
      </div>

      {/* Mini grid de archivos */}
      <div className="grid grid-cols-2 gap-2">
        {MOCK_STORAGE_ITEMS.slice(0, 4).map((item) => {
          const Icon = TYPE_ICONS[item.type];
          return (
            <div
              key={item.id}
              className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 flex flex-col items-center text-center hover:bg-neutral-100/70 transition-colors"
            >
              <div className="relative">
                <Icon className="w-6 h-6 text-brand-primary" />
                {item.isProtected && (
                  <Lock className="w-3 h-3 text-neutral-500 absolute -right-1.5 -bottom-1 bg-white rounded-full" />
                )}
              </div>
              <p className="text-[10px] text-neutral-800 font-normal truncate w-full mt-2">{item.name}</p>
              <p className="text-[10px] text-neutral-400 font-normal truncate w-full">{item.size}</p>
            </div>
          );
        })}
      </div>
    </OverviewCard>
  );
}
