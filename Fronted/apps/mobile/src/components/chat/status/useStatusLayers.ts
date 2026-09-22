import { useCallback, useState } from 'react';
import {
  StatusImageLayer,
  StatusMusic,
  StatusStickerLayer,
  StatusTextLayer,
} from '../../../mocks/statuses';
import {
  IMAGE_LAYER_MIN,
  MAX_IMAGE_LAYERS,
  MAX_STICKER_LAYERS,
  MAX_TEXT_LAYERS,
  STATUS_IMAGE_COLORS,
} from '../../../mocks/statusMedia';

export type LayerKind = 'text' | 'image' | 'sticker';

export interface LayerSelection {
  kind: LayerKind;
  id: string;
}

const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.round(Math.random() * 999)}`;

/** Cada capa nueva baja un poco para no caer justo encima de la anterior */
const stagger = (index: number) => Math.min(80, 42 + index * 9);

const newTextLayer = (
  index: number,
  color: string,
  fontFamily: string,
): StatusTextLayer => ({
  id: newId('tx'),
  content: '',
  x: 50,
  y: stagger(index),
  scale: 1,
  rotation: 0,
  fontSize: 24,
  fontWeight: '400',
  color,
  fontFamily,
});

/**
 * Estado de las capas del editor de estados: textos, imágenes, stickers,
 * música y cuál está seleccionada. Vive aparte para que el modal no crezca.
 */
export function useStatusLayers(
  defaultTextColor: string,
  defaultFontFamily: string,
) {
  const [texts, setTexts] = useState<StatusTextLayer[]>([]);
  const [images, setImages] = useState<StatusImageLayer[]>([]);
  const [stickers, setStickers] = useState<StatusStickerLayer[]>([]);
  const [music, setMusic] = useState<StatusMusic | null>(null);
  const [selection, setSelection] = useState<LayerSelection | null>(null);

  /** Reinicia el editor; crea una capa de texto inicial solo cuando el flujo la requiere. */
  const reset = useCallback(
    (
      color: string,
      withInitialText = true,
    ): string | null => {
      const first = withInitialText
        ? newTextLayer(0, color, defaultFontFamily)
        : null;

      setTexts(first ? [first] : []);
      setImages([]);
      setStickers([]);
      setMusic(null);
      setSelection(
        first
          ? {
              kind: 'text',
              id: first.id,
            }
          : null,
      );

      return first?.id ?? null;
    },
    [
      defaultFontFamily,
    ],
  );

  const addText = useCallback(() => {
    setTexts((prev) => {
      if (prev.length >= MAX_TEXT_LAYERS) return prev;
      const layer = newTextLayer(
        prev.length,
        defaultTextColor,
        defaultFontFamily,
      );
      setSelection({ kind: 'text', id: layer.id });
      return [...prev, layer];
    });
  }, [
    defaultFontFamily,
    defaultTextColor,
  ]);

  const addImage = useCallback(() => {
    setImages((prev) => {
      if (prev.length >= MAX_IMAGE_LAYERS) return prev;
      const layer: StatusImageLayer = {
        id: newId('im'),
        x: 50,
        y: stagger(prev.length),
        scale: 1,
        rotation: 0,
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
        scale: 1,
        rotation: 0,
      };
      setSelection({ kind: 'sticker', id: layer.id });
      return [...prev, layer];
    });
  }, []);

  const patchText = useCallback((id: string, patch: Partial<StatusTextLayer>) => {
    setTexts((prev) => prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }, []);

  const setAllTextFontFamilies = useCallback(
    (fontFamily: string) => {
      setTexts((prev) => prev.map((layer) => ({
        ...layer,
        fontFamily,
      })));
    },
    [],
  );

  const moveImage = useCallback((id: string, x: number, y: number) => {
    setImages((prev) => prev.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)));
  }, []);

  const resizeImage = useCallback((id: string, size: number) => {
    setImages((prev) => prev.map((layer) => (layer.id === id ? { ...layer, size } : layer)));
  }, []);

  const moveSticker = useCallback((id: string, x: number, y: number) => {
    setStickers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)));
  }, []);

  const transformLayer = useCallback(
    (
      kind: LayerKind,
      id: string,
      scale: number,
      rotation: number,
    ) => {
      if (kind === 'text') {
        setTexts((prev) => prev.map((layer) => (
          layer.id === id
            ? {
              ...layer,
              scale,
              rotation,
            }
            : layer
        )));
      }

      if (kind === 'image') {
        setImages((prev) => prev.map((layer) => (
          layer.id === id
            ? {
              ...layer,
              scale,
              rotation,
            }
            : layer
        )));
      }

      if (kind === 'sticker') {
        setStickers((prev) => prev.map((layer) => (
          layer.id === id
            ? {
              ...layer,
              scale,
              rotation,
            }
            : layer
        )));
      }
    },
    [],
  );

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
    setAllTextFontFamilies,
    moveImage,
    resizeImage,
    moveSticker,
    transformLayer,
    removeLayer,
  };
}
