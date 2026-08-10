'use client';

import { X, Camera, Type, ShoppingBag } from 'lucide-react';
import {
  STATUS_BACKGROUNDS,
  STATUS_TEXT_COLORS,
  type StatusMusic,
  type StatusProductLink,
  type StatusTextAlign,
} from '@/mocks/statuses';
import { MAX_TEXT_LAYERS, type StatusSong } from '@/mocks/statusMedia';
import { formatPrice } from '@/mocks/myServices';
import type { ContactItem } from '@/mocks/contacts';
import StatusToolSection from './StatusToolSection';
import StatusSwatchRow from './StatusSwatchRow';
import StatusTypographyRow from './StatusTypographyRow';
import StatusMediaSections from './StatusMediaSections';
import MentionDropdown from './MentionDropdown';
import StatusPrivacySection, { StatusVisibility } from './StatusPrivacySection';
import type { StatusSticker } from './stickerCatalog';

interface StatusToolPanelProps {
  text: string;
  onChangeText: (text: string) => void;
  hasTextSelection: boolean;
  textCount: number;
  onAddText: () => void;
  mentionQuery: string | null;
  onSelectMention: (contact: ContactItem) => void;
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
  imageCount: number;
  onAddImage: () => void;
  stickerCount: number;
  onAddSticker: (sticker: StatusSticker) => void;
  music: StatusMusic | null;
  onSelectMusic: (song: StatusSong) => void;
  onRemoveMusic: () => void;
  product: StatusProductLink | null;
  onLinkProduct: () => void;
  onRemoveProduct: () => void;
  visibility: StatusVisibility;
  onChangeVisibility: (v: StatusVisibility) => void;
  selectedContactIds: string[];
  onChangeSelectedContacts: (ids: string[]) => void;
  selectedCategoryId: string | null;
  onChangeSelectedCategory: (id: string) => void;
  canPublish: boolean;
  onClose: () => void;
  onPublish: () => void;
}

export default function StatusToolPanel(props: StatusToolPanelProps) {
  const { hasTextSelection } = props;

  return (
    <aside className="w-full md:w-[30%] md:max-w-[320px] md:min-w-[288px] shrink-0 bg-white border-t md:border-t-0 md:border-l border-neutral-200 flex flex-col min-h-0">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100 shrink-0">
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Cerrar"
          className="w-9 h-9 rounded-xl text-neutral-500 hover:bg-neutral-100 flex items-center justify-center transition-colors duration-200 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-sm font-semibold text-neutral-900">Crear estado</h2>

        <button
          type="button"
          onClick={props.onPublish}
          disabled={!props.canPublish}
          className="px-4 h-9 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-40 disabled:hover:bg-brand-primary transition-colors duration-200 shrink-0"
        >
          Publicar
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <StatusToolSection title="Texto">
          <textarea
            value={props.text}
            onChange={(event) => props.onChangeText(event.target.value)}
            disabled={!hasTextSelection}
            placeholder={
              hasTextSelection ? 'Escribe tu estado...' : 'Selecciona un texto en el lienzo'
            }
            rows={3}
            className="w-full bg-transparent text-sm font-normal text-neutral-900 placeholder:text-neutral-400 border-0 border-b border-neutral-200 focus:border-brand-primary outline-none resize-none pb-2 disabled:opacity-50 transition-colors duration-200"
          />

          {props.mentionQuery !== null && (
            <MentionDropdown query={props.mentionQuery} onSelect={props.onSelectMention} />
          )}

          <button
            type="button"
            onClick={props.onAddText}
            disabled={props.textCount >= MAX_TEXT_LAYERS}
            className="mt-3 w-full h-11 rounded-xl border border-dashed border-neutral-300 text-xs font-normal text-neutral-600 flex items-center justify-center gap-2 hover:border-brand-primary hover:text-brand-primary disabled:opacity-40 disabled:hover:border-neutral-300 disabled:hover:text-neutral-600 transition-colors duration-200"
          >
            <Type className="w-4 h-4" />
            Agregar texto {props.textCount}/{MAX_TEXT_LAYERS}
          </button>
        </StatusToolSection>

        <StatusToolSection title="Privacidad">
          <StatusPrivacySection
            visibility={props.visibility}
            onChangeVisibility={props.onChangeVisibility}
            selectedContactIds={props.selectedContactIds}
            onChangeSelectedContacts={props.onChangeSelectedContacts}
            selectedCategoryId={props.selectedCategoryId}
            onChangeSelectedCategory={props.onChangeSelectedCategory}
          />
        </StatusToolSection>

        <StatusToolSection title="Tipografía">
          <div className={hasTextSelection ? '' : 'opacity-40 pointer-events-none'}>
            <StatusTypographyRow
              textSize={props.textSize}
              onChangeSize={props.onChangeSize}
              bold={props.bold}
              onToggleBold={props.onToggleBold}
              align={props.align}
              onChangeAlign={props.onChangeAlign}
            />
          </div>
        </StatusToolSection>

        <StatusToolSection title="Color de texto">
          <div className={hasTextSelection ? '' : 'opacity-40 pointer-events-none'}>
            <StatusSwatchRow
              values={STATUS_TEXT_COLORS}
              selected={props.textColor}
              onSelect={props.onChangeTextColor}
            />
          </div>
        </StatusToolSection>

        <StatusToolSection title="Fondo">
          {props.hasPhoto ? (
            <button
              type="button"
              onClick={props.onRemovePhoto}
              className="w-full h-11 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-600 hover:bg-neutral-50 transition-colors duration-200"
            >
              Quitar foto de fondo
            </button>
          ) : (
            <div className="space-y-4">
              <StatusSwatchRow
                values={STATUS_BACKGROUNDS}
                selected={props.background}
                onSelect={props.onChangeBackground}
              />
              <button
                type="button"
                onClick={props.onPickPhoto}
                className="w-full h-11 rounded-xl border border-dashed border-neutral-300 text-xs font-normal text-neutral-600 flex items-center justify-center gap-2 hover:border-brand-primary hover:text-brand-primary transition-colors duration-200"
              >
                <Camera className="w-4 h-4" />
                Foto de fondo
              </button>
            </div>
          )}
        </StatusToolSection>

        <StatusMediaSections
          imageCount={props.imageCount}
          onAddImage={props.onAddImage}
          stickerCount={props.stickerCount}
          onAddSticker={props.onAddSticker}
          music={props.music}
          onSelectMusic={props.onSelectMusic}
          onRemoveMusic={props.onRemoveMusic}
        />

        <StatusToolSection title="Producto" defaultOpen={false}>
          {props.product ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-normal text-neutral-900 truncate">{props.product.name}</p>
                <p className="text-[11px] font-normal text-neutral-500">
                  {props.product.price !== null ? formatPrice(props.product.price) : 'Cotización'}
                </p>
              </div>
              <button
                type="button"
                onClick={props.onRemoveProduct}
                aria-label="Quitar producto"
                className="w-7 h-7 rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 flex items-center justify-center transition-colors duration-200 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={props.onLinkProduct}
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
