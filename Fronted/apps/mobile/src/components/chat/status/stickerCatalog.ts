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
} from 'lucide-react-native';

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
  { id: 'heart', label: 'Corazón', Icon: Heart, color: '#D85A70', background: '#FFF0F4' },
  { id: 'thumbs-up', label: 'Me gusta', Icon: ThumbsUp, color: '#668FCE', background: '#EAF2FF' },
  { id: 'star', label: 'Estrella', Icon: Star, color: '#D4A83A', background: '#FFF7DF' },
  { id: 'zap', label: 'Rayo', Icon: Zap, color: '#D88A3B', background: '#FFF1E4' },
  { id: 'coffee', label: 'Café', Icon: Coffee, color: '#8A756D', background: '#F5EFEC' },
  { id: 'rocket', label: 'Cohete', Icon: Rocket, color: '#7567D9', background: '#EEF2FF' },
  { id: 'party', label: 'Fiesta', Icon: PartyPopper, color: '#4D9A7B', background: '#EAF7F0' },
  { id: 'flame', label: 'Fuego', Icon: Flame, color: '#D86D4A', background: '#FFF0EA' },
  { id: 'trophy', label: 'Trofeo', Icon: Trophy, color: '#B9983A', background: '#FFF6DF' },
  { id: 'check', label: 'Listo', Icon: Check, color: '#4D9A7B', background: '#EAF7F0' },
  { id: 'crown', label: 'Corona', Icon: Crown, color: '#C69A31', background: '#FFF5DA' },
  { id: 'sparkles', label: 'Destellos', Icon: Sparkles, color: '#665AC0', background: '#EEF2FF' },
];

export const getSticker = (id: string) =>
  STATUS_STICKERS.find((sticker) => sticker.id === id) ?? STATUS_STICKERS[0];
