'use client';

import { Bold, Image as ImageIcon, ShoppingBag, Trash2 } from 'lucide-react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS, StatusProductLink } from '@/mocks/statuses';
import { formatPrice } from '@/mocks/myServices';

interface StatusEditorToolbarProps {
  textSize: number;
  onChangeSize: (size: number) => void;
  bold: boolean;
  onToggleBold: () => void;
  textColor: string;
  onChangeTextColor: (color: string) => void;
  showBackgrounds: boolean;
  bgColor: string;
  onChangeBgColor: (color: string) => void;
  hasPhoto: boolean;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  product: StatusProductLink | null;
  onLinkProduct: () => void;
  onRemoveProduct: () => void;
}

export default function StatusEditorToolbar({
  textSize,
  onChangeSize,
  bold,
  onToggleBold,
  textColor,
  onChangeTextColor,
  showBackgrounds,
  bgColor,
  onChangeBgColor,
  hasPhoto,
  onPickPhoto,
  onRemovePhoto,
  product,
  onLinkProduct,
  onRemoveProduct,
}: StatusEditorToolbarProps) {
  return (
    <div className="bg-white border-t border-neutral-200 p-3 space-y-3 rounded-b-3xl">
      {/* Row 1: Text controls (Size & Bold & Photo & Product) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => onChangeSize(Math.max(16, textSize - 2))}
            className="w-7 h-7 rounded-lg bg-white text-xs font-bold text-neutral-700 flex items-center justify-center hover:bg-neutral-50"
          >
            A-
          </button>
          <span className="text-[11px] font-semibold text-neutral-600 px-1">{textSize}px</span>
          <button
            type="button"
            onClick={() => onChangeSize(Math.min(36, textSize + 2))}
            className="w-7 h-7 rounded-lg bg-white text-xs font-bold text-neutral-700 flex items-center justify-center hover:bg-neutral-50"
          >
            A+
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleBold}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
            bold ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-neutral-200 text-neutral-600'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={hasPhoto ? onRemovePhoto : onPickPhoto}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
            hasPhoto ? 'border-red-500 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
          }`}
          title={hasPhoto ? 'Quitar foto' : 'Subir foto'}
        >
          {hasPhoto ? <Trash2 className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={product ? onRemoveProduct : onLinkProduct}
          className={`px-3 h-9 rounded-xl border flex items-center gap-1.5 shrink-0 text-xs font-medium transition-colors ${
            product ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{product ? product.name : 'Vincular producto'}</span>
        </button>
      </div>

      {/* Row 2: Color Pickers */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 shrink-0">Texto:</span>
          {STATUS_TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChangeTextColor(c)}
              className={`w-6 h-6 rounded-full border-2 shrink-0 transition-transform ${
                textColor === c ? 'border-brand-primary scale-110' : 'border-white shadow-xs'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {showBackgrounds && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 shrink-0">Fondo:</span>
            {STATUS_BG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChangeBgColor(c)}
                className={`w-6 h-6 rounded-full border-2 shrink-0 transition-transform ${
                  bgColor === c ? 'border-brand-primary scale-110' : 'border-white shadow-xs'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {product && (
        <div className="flex items-center justify-between bg-neutral-50 p-2 rounded-xl text-xs border border-neutral-200">
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingBag className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="font-semibold text-neutral-800 truncate">{product.name}</span>
            <span className="text-neutral-500 text-[11px]">
              {product.price !== null ? formatPrice(product.price) : 'Cotización'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRemoveProduct}
            className="text-neutral-400 hover:text-neutral-700 text-[11px] font-semibold"
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}
