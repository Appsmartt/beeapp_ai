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

/** Capa de texto suelta sobre el estado. x/y son porcentaje del lienzo */
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

/** Capa de imagen. Mock: un recuadro de color, no una foto real */
export interface StatusImageLayer {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

/** Capa de sticker: un ícono de Lucide sobre un círculo de color suave */
export interface StatusStickerLayer {
  id: string;
  stickerId: string;
  x: number;
  y: number;
}

/** Canción de fondo elegida en el editor. Mock: no se reproduce nada */
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
  /** Alineación del texto sobre el estado. Por defecto, centrado */
  textAlign?: StatusTextAlign;
  /**
   * Capas del editor. Los campos sueltos de arriba (`text`, `textPosition`,
   * `textSize`…) siguen reflejando la primera capa de texto, así que el visor
   * y los estados mock antiguos funcionan sin cambios.
   */
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

/**
 * Fondos del editor de estados: los tres primeros son degradados y el resto
 * colores planos. Se guardan como valor CSS de `background`, así que sirven
 * igual para el lienzo del editor, el visor y los círculos del panel.
 */
export const STATUS_BACKGROUNDS = [
  'linear-gradient(160deg, #7C3AED 0%, #4C1D95 100%)',
  'linear-gradient(160deg, #2563EB 0%, #1E3A8A 100%)',
  'linear-gradient(160deg, #15803D 0%, #14532D 100%)',
  '#0F0E17',
  '#1F2937',
  '#FFFFFF',
];

export const MOCK_STATUSES: StatusItem[] = [
  {
    id: 's_my_1',
    authorId: 'me',
    authorName: 'Santiago Valencia',
    authorInitials: 'SV',
    authorColor: '#F3E8FF',
    type: 'text',
    text: 'Probando las nuevas funciones de privacidad de BeeApp AI.',
    photoUrl: null,
    bgColor: STATUS_BG_COLORS[0],
    linkedProduct: null,
    textPosition: { x: 50, y: 50 },
    textSize: 24,
    textWeight: '700',
    textColor: '#FFFFFF',
    timestamp: 'hace 1 h',
    viewed: true,
    viewedBy: [
      { contactId: 'c1', contactName: 'Carlos Mendoza', viewedAt: 'hace 45 min' },
      { contactId: 'c3', contactName: 'María Gómez', viewedAt: 'hace 30 min' },
      { contactId: 'c2', contactName: 'Eduardo Torres', viewedAt: 'hace 10 min' },
    ],
  },
  {
    id: 's1',
    authorId: 'c1',
    authorName: 'Carlos Mendoza',
    authorInitials: 'CM',
    authorColor: '#EBF5FF',
    type: 'photo',
    text: 'Cerrando la ronda de asesorías del mes con el equipo legal.',
    photoUrl: 'https://picsum.photos/id/1015/600/800',
    bgColor: null,
    linkedProduct: null,
    textPosition: { x: 50, y: 78 },
    textSize: 20,
    textWeight: '400',
    textColor: '#FFFFFF',
    timestamp: 'hace 2 h',
    viewed: false,
  },
  {
    id: 's2',
    authorId: 'c3',
    authorName: 'María Gómez',
    authorInitials: 'MG',
    authorColor: '#ECFDF5',
    type: 'photo',
    text: 'Nueva entrega de termos inteligentes lista para despacho.',
    photoUrl: 'https://picsum.photos/id/1060/600/800',
    bgColor: null,
    linkedProduct: { id: 'p2', name: 'Termo Inteligente de Acero Inoxidable', price: 89000 },
    textPosition: { x: 50, y: 24 },
    textSize: 26,
    textWeight: '700',
    textColor: '#F4C20D',
    timestamp: 'hace 4 h',
    viewed: false,
  },
  {
    id: 's3',
    authorId: 'c2',
    authorName: 'Eduardo Torres',
    authorInitials: 'ET',
    authorColor: '#FEF3C7',
    type: 'text',
    text: 'Agenda abierta para consultorías de estrategia esta semana.',
    photoUrl: null,
    bgColor: STATUS_BG_COLORS[0],
    linkedProduct: null,
    textPosition: { x: 50, y: 50 },
    textSize: 30,
    textWeight: '700',
    textColor: '#FFFFFF',
    timestamp: 'hace 6 h',
    viewed: true,
  },
  {
    id: 's4',
    authorId: 'c4',
    authorName: 'Sofía Castro',
    authorInitials: 'SC',
    authorColor: '#F3E8FF',
    type: 'text',
    text: 'Gracias a todos los que pasaron por el taller de diseño de marca.',
    photoUrl: null,
    bgColor: STATUS_BG_COLORS[5],
    linkedProduct: null,
    textPosition: { x: 50, y: 38 },
    textSize: 24,
    textWeight: '400',
    textColor: '#1A1A2E',
    timestamp: 'hace 8 h',
    viewed: false,
  },
  {
    id: 's5',
    authorId: 'c1',
    authorName: 'Carlos Mendoza',
    authorInitials: 'CM',
    authorColor: '#EBF5FF',
    type: 'photo',
    text: 'Montaje del stand para la feria de emprendimiento.',
    photoUrl: 'https://picsum.photos/id/1074/600/800',
    bgColor: null,
    linkedProduct: null,
    textPosition: { x: 50, y: 50 },
    textSize: 34,
    textWeight: '700',
    textColor: '#FFFFFF',
    timestamp: 'hace 10 h',
    viewed: false,
  },
  {
    id: 's6',
    authorId: 'g1',
    authorName: 'Laura Restrepo',
    authorInitials: 'LR',
    authorColor: '#FFEBEE',
    type: 'text',
    text: 'Quedan pocos cupos para la mentoría de finanzas del viernes.',
    photoUrl: null,
    bgColor: STATUS_BG_COLORS[2],
    linkedProduct: { id: 'p1', name: 'Teclado Mecánico Inalámbrico RGB', price: 349000 },
    textPosition: { x: 50, y: 62 },
    textSize: 22,
    textWeight: '400',
    textColor: '#FFFFFF',
    timestamp: 'hace 12 h',
    viewed: true,
  },
];

export function addStatus(status: Omit<StatusItem, 'id' | 'timestamp' | 'viewed'>): StatusItem {
  const newStatus: StatusItem = {
    ...status,
    id: 'st_' + Date.now().toString(36),
    timestamp: 'Ahora',
    viewed: true,
  };
  MOCK_STATUSES.unshift(newStatus);
  return newStatus;
}

export function markStatusViewed(id: string) {
  const status = MOCK_STATUSES.find((s) => s.id === id);
  if (status) status.viewed = true;
}
