'use client';

import { useCallback, useState } from 'react';
import type {
  StatusImageLayer,
  StatusMusic,
  StatusStickerLayer,
  StatusTextLayer,
} from '@/mocks/statuses';
import {
  IMAGE_LAYER_MIN,
  MAX_IMAGE_LAYERS,
  MAX_STICKER_LAYERS,
  MAX_TEXT_LAYERS,
  STATUS_IMAGE_COLORS,
} from '@/mocks/statusMedia';

export type LayerKind = 'text' | 'image' | 'sticker';

export interface LayerSelection {
  kind: LayerKind;
  id: string;
}

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.round(Math.random() * 999)}`;

/** Cada capa nueva baja un poco para no caer justo encima de la anterior */
const stagger = (index: number) => Math.min(80, 42 + index * 9);

const newTextLayer = (index: number, color: string): StatusTextLayer => ({
  id: newId('tx'),
  content: '',
  x: 50,
  y: stagger(index),
  fontSize: 24,
  fontWeight: '400',
  color,
  align: 'center',
});

/**
 * Estado de las capas del editor de estados: textos, imágenes, stickers,
 * música y cuál está seleccionada. Vive aparte para que el modal no crezca.
 */
export function useStatusLayers(defaultTextColor: string) {
  const [texts, setTexts] = useState<StatusTextLayer[]>([]);
  const [images, setImages] = useState<StatusImageLayer[]>([]);
  const [stickers, setStickers] = useState<StatusStickerLayer[]>([]);
  const [music, setMusic] = useState<StatusMusic | null>(null);
  const [selection, setSelection] = useState<LayerSelection | null>(null);

  /** Deja el editor con una sola capa de texto vacía, como al abrirlo */
  const reset = useCallback((color: string) => {
    const first = newTextLayer(0, color);
    setTexts([first]);
    setImages([]);
    setStickers([]);
    setMusic(null);
    setSelection({ kind: 'text', id: first.id });
  }, []);

  const addText = useCallback(() => {
    setTexts((prev) => {
      if (prev.length >= MAX_TEXT_LAYERS) return prev;
      const layer = newTextLayer(prev.length, defaultTextColor);
      setSelection({ kind: 'text', id: layer.id });
      return [...prev, layer];
    });
  }, [defaultTextColor]);

  const addImage = useCallback(() => {
    setImages((prev) => {
      if (prev.length >= MAX_IMAGE_LAYERS) return prev;
      const layer: StatusImageLayer = {
        id: newId('im'),
        x: 50,
        y: stagger(prev.length),
        size: IMAGE_LAYER_MIN + 40,
        color: STATUS_IMAGE_COLORS[prev.length % STATUS_IMAGE_COLORS.length],
      };
      setSelection({ kind: 'image', id: layer.id });
      return [...prev, layer];
    });
  }, []);

  const addSticker = useCallback((stickerId: string) => {
    setStickers((prev) => {
      if (prev.length >= MAX_STICKER_LAYERS) return prev;
      const layer: StatusStickerLayer = {
        id: newId('st'),
        stickerId,
        x: 50,
        y: stagger(prev.length),
      };
      setSelection({ kind: 'sticker', id: layer.id });
      return [...prev, layer];
    });
  }, []);

  const patchText = useCallback((id: string, patch: Partial<StatusTextLayer>) => {
    setTexts((prev) => prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }, []);

  const moveImage = useCallback((id: string, x: number, y: number) => {
    setImages((prev) => prev.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)));
  }, []);

  const resizeImage = useCallback((id: string, size: number) => {
    setImages((prev) => prev.map((layer) => (layer.id === id ? { ...layer, size } : layer)));
  }, []);

  const moveSticker = useCallback((id: string, x: number, y: number) => {
    setStickers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)));
  }, []);

  const removeLayer = useCallback((kind: LayerKind, id: string) => {
    if (kind === 'text') setTexts((prev) => prev.filter((layer) => layer.id !== id));
    if (kind === 'image') setImages((prev) => prev.filter((layer) => layer.id !== id));
    if (kind === 'sticker') setStickers((prev) => prev.filter((layer) => layer.id !== id));
    setSelection(null);
  }, []);

  const selectedTextId = selection?.kind === 'text' ? selection.id : null;
  const selectedText = texts.find((layer) => layer.id === selectedTextId) ?? null;

  return {
    texts,
    images,
    stickers,
    music,
    selection,
    selectedText,
    selectedTextId,
    setSelection,
    setMusic,
    reset,
    addText,
    addImage,
    addSticker,
    patchText,
    moveImage,
    resizeImage,
    moveSticker,
    removeLayer,
  };
}
