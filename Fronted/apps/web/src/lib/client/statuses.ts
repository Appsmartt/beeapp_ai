export interface StatusProductLink {
  id: string;
  name: string;
  price: number | null;
}

export interface StatusTextPosition {
  x: number;
  y: number;
}

export type StatusTextAlign = 'left' | 'center' | 'right';

export interface StatusTextLayer {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: '400' | '700';
  color: string;
  align: StatusTextAlign;
}

export interface StatusImageLayer {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  src?: string | null;
}

export interface StatusStickerLayer {
  id: string;
  stickerId: string;
  x: number;
  y: number;
}

export interface StatusMusic {
  id: string;
  title: string;
  artist: string;
}

export interface StatusViewedBy {
  contactId: string;
  contactName: string;
  viewedAt: string;
}

export interface StatusItem {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  type: 'photo' | 'text';
  text: string;
  photoUrl: string | null;
  bgColor: string | null;
  linkedProduct: StatusProductLink | null;
  textPosition: StatusTextPosition;
  textSize: number;
  textWeight: '400' | '700';
  textColor: string;
  textAlign?: StatusTextAlign;
  textLayers?: StatusTextLayer[];
  imageLayers?: StatusImageLayer[];
  stickerLayers?: StatusStickerLayer[];
  music?: StatusMusic | null;
  timestamp: string;
  viewed: boolean;
  visibility?: 'all' | 'selected' | 'category';
  selectedContactIds?: string[];
  selectedCategoryId?: string;
  viewedBy?: StatusViewedBy[];
}

export const STATUS_TEXT_COLORS = [
  '#FFFFFF',
  '#1A1A2E',
  '#6025d2',
  '#E53935',
  '#1E88E5',
  '#2E9E5B',
  '#F4C20D',
  '#F57C00',
  '#8A8F98',
];

export const STATUS_BG_COLORS = [
  '#6025d2',
  '#1E3A8A',
  '#14532D',
  '#0F0E17',
  '#1F2937',
  '#FFFFFF',
];

export const STATUS_BACKGROUNDS = [
  'linear-gradient(160deg, #7C3AED 0%, #4C1D95 100%)',
  'linear-gradient(160deg, #2563EB 0%, #1E3A8A 100%)',
  'linear-gradient(160deg, #15803D 0%, #14532D 100%)',
  '#0F0E17',
  '#1F2937',
  '#FFFFFF',
];
