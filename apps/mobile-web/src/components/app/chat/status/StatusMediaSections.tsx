'use client';

import { ImagePlus, Music, Play, Check, X } from 'lucide-react';
import type { StatusMusic } from '@/mocks/statuses';
import {
  STATUS_SONGS,
  MAX_IMAGE_LAYERS,
  MAX_STICKER_LAYERS,
  type StatusSong,
} from '@/mocks/statusMedia';
import { STATUS_STICKERS, type StatusSticker } from './stickerCatalog';
import StatusToolSection from './StatusToolSection';

interface StatusMediaSectionsProps {
  imageCount: number;
  onAddImage: () => void;
  stickerCount: number;
  onAddSticker: (sticker: StatusSticker) => void;
  music: StatusMusic | null;
  onSelectMusic: (song: StatusSong) => void;
  onRemoveMusic: () => void;
}

const ACTION =
  'w-full h-11 rounded-xl border border-dashed border-neutral-300 text-xs font-normal text-neutral-600 ' +
  'flex items-center justify-center gap-2 hover:border-brand-primary hover:text-brand-primary ' +
  'disabled:opacity-40 disabled:hover:border-neutral-300 disabled:hover:text-neutral-600 transition-colors duration-200';

/** Secciones de Imagen, Stickers y Música del panel de herramientas */
export default function StatusMediaSections({
  imageCount,
  onAddImage,
  stickerCount,
  onAddSticker,
  music,
  onSelectMusic,
  onRemoveMusic,
}: StatusMediaSectionsProps) {
  return (
    <>
      <StatusToolSection title="Imagen">
        <button
          type="button"
          onClick={onAddImage}
          disabled={imageCount >= MAX_IMAGE_LAYERS}
          className={ACTION}
        >
          <ImagePlus className="w-4 h-4" />
          Agregar imagen {imageCount}/{MAX_IMAGE_LAYERS}
        </button>
      </StatusToolSection>

      <StatusToolSection title="Stickers" defaultOpen={false}>
        <p className="text-[11px] font-normal text-neutral-500 mb-3">
          {stickerCount}/{MAX_STICKER_LAYERS} en el estado
        </p>

        <div className="grid grid-cols-4 gap-3">
          {STATUS_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => onAddSticker(sticker)}
              disabled={stickerCount >= MAX_STICKER_LAYERS}
              title={sticker.label}
              aria-label={sticker.label}
              style={{ backgroundColor: sticker.background }}
              className="aspect-square rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            >
              <sticker.Icon className="w-6 h-6" style={{ color: sticker.color }} />
            </button>
          ))}
        </div>
      </StatusToolSection>

      <StatusToolSection title="Música" defaultOpen={false}>
        {music && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-xs font-normal text-neutral-900 truncate">{music.title}</span>
            </div>
            <button
              type="button"
              onClick={onRemoveMusic}
              aria-label="Quitar música"
              className="w-7 h-7 rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 flex items-center justify-center transition-colors duration-200 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-1">
          {STATUS_SONGS.map((song) => (
            <button
              key={song.id}
              type="button"
              onClick={() => onSelectMusic(song)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-neutral-50 transition-colors duration-200"
            >
              <span className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <Play className="w-3.5 h-3.5" />
              </span>

              <span className="min-w-0 flex-1 text-left">
                <span className="block text-xs font-normal text-neutral-900 truncate">
                  {song.title}
                </span>
                <span className="block text-[11px] font-normal text-neutral-500 truncate">
                  {song.artist}
                </span>
              </span>

              <span className="text-[11px] font-normal text-neutral-500 shrink-0">
                {song.duration}
              </span>
              {music?.id === song.id && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
            </button>
          ))}
        </div>
      </StatusToolSection>
    </>
  );
}
