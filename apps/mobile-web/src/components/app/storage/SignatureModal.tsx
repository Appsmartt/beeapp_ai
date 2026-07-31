'use client';

import { useState } from 'react';
import { X, PenTool, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { StorageItem } from '@/mocks/storageItems';

interface SignatureModalProps {
  visible: boolean;
  item: StorageItem | null;
  onClose: () => void;
  onConfirmSign: (itemId: string, signerName: string) => void;
}

export default function SignatureModal({ visible, item, onClose, onConfirmSign }: SignatureModalProps) {
  const [signatureMode, setSignatureMode] = useState<'draw' | 'saved'>('draw');
  const [isDrawn, setIsDrawn] = useState(false);
  const [signerName, setSignerName] = useState('Santiago Valencia');

  if (!visible || !item) return null;

  const handleSimulateDraw = () => {
    setIsDrawn(true);
  };

  const handleClear = () => {
    setIsDrawn(false);
  };

  const handleConfirm = () => {
    if (signatureMode === 'draw' && !isDrawn) return;
    onConfirmSign(item.id, signerName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Dark blur backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-opacity" onClick={onClose} />

      {/* Floating white modal card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4 border border-neutral-100 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-neutral-900">Firmar Documento</h3>
              <p className="text-[11px] text-neutral-500 font-normal truncate max-w-[240px]">{item.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => {
              setSignatureMode('draw');
              setIsDrawn(false);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              signatureMode === 'draw' ? 'bg-white text-brand-primary shadow-xs font-semibold' : 'text-neutral-600'
            }`}
          >
            Dibuja tu firma
          </button>
          <button
            type="button"
            onClick={() => {
              setSignatureMode('saved');
              setIsDrawn(true);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              signatureMode === 'saved' ? 'bg-white text-brand-primary shadow-xs font-semibold' : 'text-neutral-600'
            }`}
          >
            Firma guardada
          </button>
        </div>

        {/* Signature Area */}
        {signatureMode === 'draw' ? (
          <div className="relative h-40 border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 flex items-center justify-center overflow-hidden">
            {isDrawn ? (
              <div className="text-center space-y-1">
                <span className="font-serif italic text-2xl text-blue-900 font-bold -rotate-3 inline-block">
                  Santiago Valencia
                </span>
                <p className="text-[10px] text-neutral-400 font-mono">Verificado por BeeAI Crypto Engine</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSimulateDraw}
                className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-brand-primary transition-colors cursor-pointer p-4"
              >
                <PenTool className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs font-semibold text-neutral-700">Haz clic para trazar tu firma</span>
                <span className="text-[10px] font-normal text-neutral-400">Dibuja sobre esta superficie con el mouse</span>
              </button>
            )}

            {isDrawn && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-white border border-neutral-200 text-[10px] font-medium text-neutral-600 flex items-center gap-1 hover:bg-neutral-100"
              >
                <RotateCcw className="w-3 h-3" /> Borrar
              </button>
            )}
          </div>
        ) : (
          <div className="h-40 border border-purple-200 rounded-2xl bg-purple-50/60 p-4 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">Firma Registrada</span>
            <span className="font-serif italic text-2xl text-blue-900 font-bold -rotate-3 inline-block">
              Santiago Valencia
            </span>
            <span className="text-[10px] text-neutral-500 font-normal">Sincronizada con BeeServices • Válida para contratos</span>
          </div>
        )}

        {/* Signer Name Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 block">Nombre del firmante</label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-full border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={signatureMode === 'draw' && !isDrawn}
            onClick={handleConfirm}
            className={`flex-1 h-10 rounded-full text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
              signatureMode === 'draw' && !isDrawn
                ? 'bg-neutral-300 cursor-not-allowed'
                : 'bg-brand-primary hover:bg-brand-dark'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Firmar Documento</span>
          </button>
        </div>
      </div>
    </div>
  );
}
