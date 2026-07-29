'use client';

import { ArrowLeft, Download, ShieldCheck, Lock, FileText, FolderOpen } from 'lucide-react';
import { StorageItem } from '@/mocks/storageItems';

interface StoragePreviewProps {
  item: StorageItem;
  onBack: () => void;
}

export default function StoragePreview({ item, onBack }: StoragePreviewProps) {
  return (
    <div className="bg-white min-h-full flex flex-col">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-semibold text-sm text-neutral-900 truncate max-w-[200px]">
          {item.name}
        </h1>

        <button
          type="button"
          className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="Descargar"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Preview Area */}
      <div className="p-6 space-y-6 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Large Type Icon Placeholder */}
        <div className="w-24 h-24 rounded-3xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shadow-md">
          {item.type === 'folder' ? (
            <FolderOpen className="w-12 h-12" />
          ) : (
            <FileText className="w-12 h-12" />
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 max-w-xs">
          <h2 className="font-semibold text-lg text-neutral-900 leading-snug">
            {item.name}
          </h2>
          <div className="flex items-center justify-center gap-3 text-xs text-neutral-500 font-normal">
            <span>{item.size}</span>
            <span>•</span>
            <span>{item.date}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {item.isSigned && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Documento Firmado
              </span>
            )}
            {item.isProtected && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                <Lock className="w-3.5 h-3.5" /> Protegido con PIN
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 w-full max-w-xs">
          <button
            type="button"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar archivo</span>
          </button>
        </div>

      </div>

    </div>
  );
}
