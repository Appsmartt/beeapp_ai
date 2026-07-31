'use client';

import { X, ImagePlus, ShoppingBag } from 'lucide-react';
import {
  STATUS_BACKGROUNDS,
  STATUS_TEXT_COLORS,
  type StatusProductLink,
  type StatusTextAlign,
} from '@/mocks/statuses';
import { formatPrice } from '@/mocks/myServices';
import StatusToolSection from './StatusToolSection';
import StatusSwatchRow from './StatusSwatchRow';
import StatusTypographyRow from './StatusTypographyRow';

interface StatusToolPanelProps {
  text: string;
  onChangeText: (text: string) => void;
  textSize: number;
  onChangeSize: (size: number) => void;
  bold: boolean;
  onToggleBold: () => void;
  align: StatusTextAlign;
  onChangeAlign: (align: StatusTextAlign) => void;
  textColor: string;
  onChangeTextColor: (color: string) => void;
  background: string;
  onChangeBackground: (background: string) => void;
  hasPhoto: boolean;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  product: StatusProductLink | null;
  onLinkProduct: () => void;
  onRemoveProduct: () => void;
  onClose: () => void;
  onPublish: () => void;
}

/** Panel lateral de herramientas del editor de estados, por secciones */
export default function StatusToolPanel({
  text,
  onChangeText,
  textSize,
  onChangeSize,
  bold,
  onToggleBold,
  align,
  onChangeAlign,
  textColor,
  onChangeTextColor,
  background,
  onChangeBackground,
  hasPhoto,
  onPickPhoto,
  onRemovePhoto,
  product,
  onLinkProduct,
  onRemoveProduct,
  onClose,
  onPublish,
}: StatusToolPanelProps) {
  return (
    <aside className="w-full md:w-[30%] md:max-w-[320px] md:min-w-[288px] shrink-0 bg-white border-t md:border-t-0 md:border-l border-neutral-200 flex flex-col min-h-0">
      {/* Cabecera */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-9 h-9 rounded-xl text-neutral-500 hover:bg-neutral-100 flex items-center justify-center transition-colors duration-200 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-sm font-semibold text-neutral-900">Crear estado</h2>

        <button
          type="button"
          onClick={onPublish}
          disabled={!text.trim() && !hasPhoto}
          className="px-4 h-9 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-40 disabled:hover:bg-brand-primary transition-colors duration-200 shrink-0"
        >
          Publicar
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <StatusToolSection title="Texto">
          <textarea
            value={text}
            onChange={(event) => onChangeText(event.target.value)}
            placeholder="Escribe tu estado..."
            rows={3}
            className="w-full bg-transparent text-sm font-normal text-neutral-900 placeholder:text-neutral-400 border-0 border-b border-neutral-200 focus:border-brand-primary outline-none resize-none pb-2 transition-colors duration-200"
          />
        </StatusToolSection>

        <StatusToolSection title="Tipografía">
          <StatusTypographyRow
            textSize={textSize}
            onChangeSize={onChangeSize}
            bold={bold}
            onToggleBold={onToggleBold}
            align={align}
            onChangeAlign={onChangeAlign}
          />
        </StatusToolSection>

        <StatusToolSection title="Color de texto">
          <StatusSwatchRow
            values={STATUS_TEXT_COLORS}
            selected={textColor}
            onSelect={onChangeTextColor}
          />
        </StatusToolSection>

        <StatusToolSection title="Fondo">
          {hasPhoto ? (
            <button
              type="button"
              onClick={onRemovePhoto}
              className="w-full h-11 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-600 hover:bg-neutral-50 transition-colors duration-200"
            >
              Quitar imagen
            </button>
          ) : (
            <div className="space-y-4">
              <StatusSwatchRow
                values={STATUS_BACKGROUNDS}
                selected={background}
                onSelect={onChangeBackground}
              />
              <button
                type="button"
                onClick={onPickPhoto}
                className="w-full h-11 rounded-xl border border-dashed border-neutral-300 text-xs font-normal text-neutral-600 flex items-center justify-center gap-2 hover:border-brand-primary hover:text-brand-primary transition-colors duration-200"
              >
                <ImagePlus className="w-4 h-4" />
                Agregar imagen
              </button>
            </div>
          )}
        </StatusToolSection>

        <StatusToolSection title="Producto">
          {product ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-normal text-neutral-900 truncate">{product.name}</p>
                <p className="text-[11px] font-normal text-neutral-500">
                  {product.price !== null ? formatPrice(product.price) : 'Cotización'}
                </p>
              </div>
              <button
                type="button"
                onClick={onRemoveProduct}
                aria-label="Quitar producto"
                className="w-7 h-7 rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 flex items-center justify-center transition-colors duration-200 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLinkProduct}
              className="w-full h-11 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-600 flex items-center justify-center gap-2 hover:border-brand-primary hover:text-brand-primary transition-colors duration-200"
            >
              <ShoppingBag className="w-4 h-4" />
              Vincular producto de BeeServices
            </button>
          )}
        </StatusToolSection>
      </div>
    </aside>
  );
}
