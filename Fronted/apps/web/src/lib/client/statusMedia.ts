export interface StatusSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
}

export const STATUS_IMAGE_COLORS = ['#D8DEE9', '#E4D9F2', '#D9E8E3'];
export const MAX_TEXT_LAYERS = 5;
export const MAX_IMAGE_LAYERS = 3;
export const MAX_STICKER_LAYERS = 3;
export const IMAGE_LAYER_MIN = 80;
export const IMAGE_LAYER_MAX = 220;
export const IMAGE_LAYER_STEP = 20;
export const STICKER_LAYER_SIZE = 80;
