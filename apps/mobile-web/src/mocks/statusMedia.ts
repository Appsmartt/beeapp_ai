/**
 * Música y placeholders de imagen del editor de estados. Todo es mock:
 * ninguna canción suena y ninguna imagen sale de una galería real.
 */

export interface StatusSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
}

export const STATUS_SONGS: StatusSong[] = [
  { id: 'sg1', title: 'Chill Vibes', artist: 'Artista Mock', duration: '3:24' },
  { id: 'sg2', title: 'Business Flow', artist: 'Artista Mock', duration: '2:48' },
  { id: 'sg3', title: 'Morning Energy', artist: 'Artista Mock', duration: '4:12' },
  { id: 'sg4', title: 'Focus Mode', artist: 'Artista Mock', duration: '3:05' },
  { id: 'sg5', title: 'Night Drive', artist: 'Artista Mock', duration: '3:36' },
];

/** Cada imagen agregada toma el siguiente color, para distinguir las capas */
export const STATUS_IMAGE_COLORS = ['#D8DEE9', '#E4D9F2', '#D9E8E3'];

/** Topes de capas por estado */
export const MAX_TEXT_LAYERS = 5;
export const MAX_IMAGE_LAYERS = 3;
export const MAX_STICKER_LAYERS = 3;

/** Tamaños de las capas de imagen y sticker, en px */
export const IMAGE_LAYER_MIN = 80;
export const IMAGE_LAYER_MAX = 220;
export const IMAGE_LAYER_STEP = 20;
export const STICKER_LAYER_SIZE = 80;
