'use client';

import { ArrowLeft, Download, Share2, ShieldCheck, Trash2, Play, Image as ImageIcon, PenTool, FolderOpen } from 'lucide-react';
import { StorageItem } from '@/mocks/storageItems';

interface StoragePreviewProps {
  item: StorageItem;
  onBack: () => void;
  onDownload: (item: StorageItem) => void;
  onShare: (item: StorageItem) => void;
  onOpenSignModal: (item: StorageItem) => void;
  onDelete: (item: StorageItem) => void;
}

export default function StoragePreview({
  item,
  onBack,
  onDownload,
  onShare,
  onOpenSignModal,
  onDelete,
}: StoragePreviewProps) {
  return (
    <div className="bg-white min-h-full flex flex-col select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 transition-colors shrink-0"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-sm text-neutral-900 truncate">{item.name}</h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onShare(item)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Compartir"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>

          <button
            type="button"
            onClick={() => onDownload(item)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Descargar"
          >
            <Download className="w-4.5 h-4.5" />
          </button>

          {item.type === 'pdf' && !item.isSigned && (
            <button
              type="button"
              onClick={() => onOpenSignModal(item)}
              className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 hover:bg-brand-dark transition-colors shadow-xs"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Firmar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Signature Banner if Signed */}
      {item.isSigned && (
        <div className="bg-purple-50 border-b border-purple-100 px-4 py-2.5 flex items-center gap-2 text-xs text-purple-900 font-normal">
          <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
          <span>
            Documento validado digitalmente por <strong>{item.signerName || 'Santiago Valencia'}</strong> ({item.signedAt || 'Hoy'})
          </span>
        </div>
      )}

      {/* Preview Content Viewport */}
      <div className="flex-1 p-6 overflow-y-auto bg-neutral-50/50 flex flex-col items-center justify-center">
        {item.type === 'folder' ? (
          <div className="text-center space-y-3 max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto shadow-sm">
              <FolderOpen className="w-10 h-10" />
            </div>
            <h2 className="font-semibold text-base text-neutral-900">{item.name}</h2>
            <p className="text-xs text-neutral-500 font-normal">
              Carpeta de almacenamiento • {item.itemCount || 0} elementos guardados
            </p>
          </div>
        ) : item.type === 'image' ? (
          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
            <div className="w-full h-64 bg-neutral-100 rounded-xl flex flex-col items-center justify-center text-neutral-400 gap-2 border border-neutral-200/60">
              <ImageIcon className="w-12 h-12 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-600">Previsualización de Imagen</span>
              <span className="text-[11px] font-normal text-neutral-400">{item.size}</span>
            </div>
          </div>
        ) : item.type === 'video' ? (
          <div className="w-full max-w-lg bg-neutral-900 rounded-2xl p-6 shadow-md flex flex-col items-center justify-center space-y-4 text-white">
            <div className="w-full h-56 bg-neutral-950 rounded-xl flex flex-col items-center justify-center relative border border-neutral-800">
              <button
                type="button"
                className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </button>
              <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                <span>0:00</span>
                <div className="flex-1 h-1 bg-neutral-700 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-brand-primary rounded-full" />
                </div>
                <span>2:15</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-2xl p-8 shadow-xs space-y-4 text-xs leading-relaxed">
            <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
              <span className="font-semibold text-sm text-brand-primary uppercase tracking-wider">{item.name}</span>
              <span className="text-[11px] text-neutral-400 font-normal">{item.size}</span>
            </div>

            <p className="font-semibold text-neutral-900">ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN (NDA)</p>
            <p className="text-neutral-600 font-normal">
              Este documento establece los términos de confidencialidad para la evaluación y uso de los servicios de BeeApp AI y la protección de datos corporativos.
            </p>
            <p className="text-neutral-600 font-normal">
              1. Toda la información compartida a través de la plataforma se mantendrá en estricta reserva y bajo encriptación de extremo a extremo.
            </p>

            {item.isSigned && (
              <div className="mt-6 p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-purple-950">
                  <p className="font-semibold text-xs text-purple-800">Sello Digital de Auditoría BeeAI</p>
                  <p className="text-[11px] font-normal text-purple-900">Firmante: {item.signerName || 'Santiago Valencia'}</p>
                  <p className="text-[10px] font-mono text-neutral-500">Hash ID: SHA-256/f89e218b...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
