import {
  Heart,
  ThumbsUp,
  Star,
  Zap,
  Coffee,
  Rocket,
  PartyPopper,
  Flame,
  Trophy,
  Check,
  Crown,
  Sparkles,
} from 'lucide-react';

/**
 * Stickers del editor de estados: un ícono de Lucide sobre un círculo de
 * color suave. No hay imágenes ni emojis, solo íconos del sistema.
 */
export interface StatusSticker {
  id: string;
  label: string;
  Icon: typeof Heart;
  /** Color del ícono */
  color: string;
  /** Fondo del círculo */
  background: string;
}

export const STATUS_STICKERS: StatusSticker[] = [
  { id: 'heart', label: 'Corazón', Icon: Heart, color: '#E53935', background: '#FDECEA' },
  { id: 'thumbs-up', label: 'Me gusta', Icon: ThumbsUp, color: '#1E88E5', background: '#E7F1FD' },
  { id: 'star', label: 'Estrella', Icon: Star, color: '#F4C20D', background: '#FDF6E0' },
  { id: 'zap', label: 'Rayo', Icon: Zap, color: '#F57C00', background: '#FDF0E3' },
  { id: 'coffee', label: 'Café', Icon: Coffee, color: '#8D6E63', background: '#F3EDEB' },
  { id: 'rocket', label: 'Cohete', Icon: Rocket, color: '#6025d2', background: '#F0E9FC' },
  { id: 'party', label: 'Fiesta', Icon: PartyPopper, color: '#2E9E5B', background: '#E7F5ED' },
  { id: 'flame', label: 'Fuego', Icon: Flame, color: '#F4511E', background: '#FDEDE7' },
  { id: 'trophy', label: 'Trofeo', Icon: Trophy, color: '#C9A227', background: '#FBF4DF' },
  { id: 'check', label: 'Listo', Icon: Check, color: '#2E9E5B', background: '#E7F5ED' },
  { id: 'crown', label: 'Corona', Icon: Crown, color: '#E0A800', background: '#FCF3DA' },
  { id: 'sparkles', label: 'Destellos', Icon: Sparkles, color: '#7C3AED', background: '#F1EAFD' },
];

export const getSticker = (id: string) =>
  STATUS_STICKERS.find((sticker) => sticker.id === id) ?? STATUS_STICKERS[0];
