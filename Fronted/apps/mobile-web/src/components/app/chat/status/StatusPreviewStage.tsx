'use client';

import { useRef } from 'react';
import { X, Music } from 'lucide-react';
import type {
  StatusImageLayer,
  StatusMusic,
  StatusStickerLayer,
  StatusTextLayer,
} from '@/mocks/statuses';
import type { LayerSelection } from './useStatusLayers';
import { TextLayers, ImageLayers, StickerLayers } from './StatusLayers';

interface StatusPreviewStageProps {
  background: string;
  photo: string | null;
  texts: StatusTextLayer[];
  images: StatusImageLayer[];
  stickers: StatusStickerLayer[];
  music: StatusMusic | null;
  selection: LayerSelection | null;
  onSelect: (selection: LayerSelection) => void;
  onMoveText: (id: string, x: number, y: number) => void;
  onMoveImage: (id: string, x: number, y: number) => void;
  onMoveSticker: (id: string, x: number, y: number) => void;
  onResizeImage: (id: string, size: number) => void;
  onRemoveLayer: (kind: LayerSelection['kind'], id: string) => void;
  onRemovePhoto: () => void;
  onRemoveMusic: () => void;
}

const idOf = (selection: LayerSelection | null, kind: LayerSelection['kind']) =>
  selection?.kind === kind ? selection.id : null;

/**
 * Zona de previsualización del editor: una hoja 9:16 flotando sobre un fondo
 * gris muy claro, con todas las capas del estado apiladas encima.
 */
export default function StatusPreviewStage(props: StatusPreviewStageProps) {
  const { background, photo, music, selection } = props;
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-neutral-50 flex items-center justify-center p-6 md:p-10 overflow-hidden">
      <div
        ref={stageRef}
        style={{ background: photo ? '#0F0E17' : background, aspectRatio: '9 / 16' }}
        className="relative h-full max-h-full max-w-full rounded-[24px] overflow-hidden shadow-[0_24px_60px_-24px_rgba(15,14,23,0.35)] transition-colors duration-200 select-none"
      >
        {photo && (
          <>
            <img
              src={photo}
              alt="Fondo del estado"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={props.onRemovePhoto}
              aria-label="Quitar imagen de fondo"
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-neutral-950/40 text-white flex items-center justify-center hover:bg-neutral-950/60 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {music && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 max-w-[70%] rounded-full bg-neutral-950/55 px-3 py-1.5">
            <Music className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-[11px] font-normal text-white truncate">{music.title}</span>
            <button
              type="button"
              onClick={props.onRemoveMusic}
              aria-label="Quitar música"
              className="text-white/80 hover:text-white transition-colors duration-200 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <ImageLayers
          layers={props.images}
          stageRef={stageRef}
          selectedId={idOf(selection, 'image')}
          onSelect={(id) => props.onSelect({ kind: 'image', id })}
          onMove={props.onMoveImage}
          onResize={props.onResizeImage}
          onRemove={(id) => props.onRemoveLayer('image', id)}
        />

        <StickerLayers
          layers={props.stickers}
          stageRef={stageRef}
          selectedId={idOf(selection, 'sticker')}
          onSelect={(id) => props.onSelect({ kind: 'sticker', id })}
          onMove={props.onMoveSticker}
          onRemove={(id) => props.onRemoveLayer('sticker', id)}
        />

        <TextLayers
          layers={props.texts}
          stageRef={stageRef}
          selectedId={idOf(selection, 'text')}
          onSelect={(id) => props.onSelect({ kind: 'text', id })}
          onMove={props.onMoveText}
          onRemove={(id) => props.onRemoveLayer('text', id)}
        />
      </div>
    </div>
  );
}
