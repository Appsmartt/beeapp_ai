'use client';

import type { RefObject } from 'react';
import { Image as ImageIcon, Minus, Plus } from 'lucide-react';
import type { StatusImageLayer, StatusStickerLayer, StatusTextLayer } from '@/mocks/statuses';
import { IMAGE_LAYER_MAX, IMAGE_LAYER_MIN, IMAGE_LAYER_STEP, STICKER_LAYER_SIZE } from '@/mocks/statusMedia';
import DraggableLayer from './DraggableLayer';
import MentionText from './MentionText';
import { getSticker } from './stickerCatalog';

const clampSize = (size: number) => Math.min(IMAGE_LAYER_MAX, Math.max(IMAGE_LAYER_MIN, size));

interface CommonProps {
  stageRef: RefObject<HTMLDivElement>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

/** Capas de texto: se dibujan con las menciones a contactos en morado */
export function TextLayers({
  layers,
  ...common
}: CommonProps & { layers: StatusTextLayer[] }) {
  return (
    <>
      {layers.map((layer) => (
        <DraggableLayer
          key={layer.id}
          x={layer.x}
          y={layer.y}
          stageRef={common.stageRef}
          selected={layer.id === common.selectedId}
          onSelect={() => common.onSelect(layer.id)}
          onMove={(x, y) => common.onMove(layer.id, x, y)}
          onRemove={() => common.onRemove(layer.id)}
          className="w-[84%]"
          style={{ textAlign: layer.align }}
        >
          <p
            style={{
              fontSize: `${layer.fontSize}px`,
              fontWeight: layer.fontWeight === '700' ? 700 : 400,
              color: layer.color,
              lineHeight: 1.3,
              opacity: layer.content ? 1 : 0.45,
            }}
            className="whitespace-pre-wrap break-words drop-shadow-sm"
          >
            {layer.content ? <MentionText content={layer.content} /> : 'Texto...'}
          </p>
        </DraggableLayer>
      ))}
    </>
  );
}

/** Capas de imagen: recuadros de color con los controles de tamaño */
export function ImageLayers({
  layers,
  onResize,
  ...common
}: CommonProps & { layers: StatusImageLayer[]; onResize: (id: string, size: number) => void }) {
  return (
    <>
      {layers.map((layer) => {
        const isSelected = layer.id === common.selectedId;

        return (
          <DraggableLayer
            key={layer.id}
            x={layer.x}
            y={layer.y}
            stageRef={common.stageRef}
            selected={isSelected}
            onSelect={() => common.onSelect(layer.id)}
            onMove={(x, y) => common.onMove(layer.id, x, y)}
            onRemove={() => common.onRemove(layer.id)}
          >
            <div
              style={{ width: layer.size, height: layer.size, backgroundColor: layer.color }}
              className="rounded-xl flex items-center justify-center"
            >
              <ImageIcon
                style={{ width: Math.max(20, layer.size * 0.28), height: Math.max(20, layer.size * 0.28) }}
                className="text-neutral-500"
              />
            </div>

            {isSelected && (
              <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {[
                  { key: 'down', icon: Minus, size: clampSize(layer.size - IMAGE_LAYER_STEP), label: 'Reducir' },
                  { key: 'up', icon: Plus, size: clampSize(layer.size + IMAGE_LAYER_STEP), label: 'Ampliar' },
                ].map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onResize(layer.id, action.size)}
                    aria-label={action.label}
                    className="w-6 h-6 rounded-full bg-neutral-800 text-white flex items-center justify-center hover:bg-neutral-900 transition-colors duration-200"
                  >
                    <action.icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </DraggableLayer>
        );
      })}
    </>
  );
}

/** Capas de sticker: ícono de Lucide sobre un círculo de color suave */
export function StickerLayers({
  layers,
  ...common
}: CommonProps & { layers: StatusStickerLayer[] }) {
  return (
    <>
      {layers.map((layer) => {
        const sticker = getSticker(layer.stickerId);

        return (
          <DraggableLayer
            key={layer.id}
            x={layer.x}
            y={layer.y}
            stageRef={common.stageRef}
            selected={layer.id === common.selectedId}
            onSelect={() => common.onSelect(layer.id)}
            onMove={(x, y) => common.onMove(layer.id, x, y)}
            onRemove={() => common.onRemove(layer.id)}
          >
            <div
              style={{
                width: STICKER_LAYER_SIZE,
                height: STICKER_LAYER_SIZE,
                backgroundColor: sticker.background,
              }}
              className="rounded-full flex items-center justify-center"
            >
              <sticker.Icon className="w-11 h-11" style={{ color: sticker.color }} />
            </div>
          </DraggableLayer>
        );
      })}
    </>
  );
}
