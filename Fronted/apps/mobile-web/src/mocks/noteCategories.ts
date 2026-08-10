/**
 * Categorías del módulo de Notas (mock en memoria).
 * "Todas" y "Protegidas" son fijas: son vistas, no carpetas, y no se borran.
 */

export interface NoteCategory {
  id: string;
  name: string;
  /** Clave del ícono de Lucide, resuelta en noteCategoryIcons.ts */
  iconKey: string;
  /** Color del círculo del ícono. Es dato del usuario, no un token */
  color: string;
  /** Las fijas no se pueden eliminar y siempre van primero */
  isFixed?: boolean;
}

export const FIXED_NOTE_CATEGORIES: NoteCategory[] = [
  { id: 'all', name: 'Todas', iconKey: 'file-text', color: '#6025d2', isFixed: true },
  { id: 'protected', name: 'Protegidas', iconKey: 'lock', color: '#6C757D', isFixed: true },
];

export const MOCK_NOTE_CATEGORIES: NoteCategory[] = [
  { id: 'documento', name: 'Documento', iconKey: 'file-text', color: '#7C3AED' },
  { id: 'proyecto', name: 'Proyecto', iconKey: 'briefcase', color: '#F57C00' },
  { id: 'reunion', name: 'Reunión', iconKey: 'users', color: '#A78BFA' },
  { id: 'presupuesto', name: 'Presupuesto', iconKey: 'calculator', color: '#2E9E5B' },
  { id: 'viaje', name: 'Viaje', iconKey: 'plane', color: '#6025d2' },
  { id: 'receta', name: 'Receta', iconKey: 'utensils-crossed', color: '#34D399' },
  { id: 'idea', name: 'Idea', iconKey: 'lightbulb', color: '#4C1D95' },
  { id: 'hogar', name: 'Hogar', iconKey: 'home', color: '#1E88E5' },
  { id: 'estudio', name: 'Estudio', iconKey: 'graduation-cap', color: '#8B5CF6' },
  { id: 'personal', name: 'Personal', iconKey: 'heart', color: '#EC4899' },
];

/** Íconos disponibles al crear una categoría nueva */
export const NOTE_CATEGORY_ICON_KEYS = [
  'file-text',
  'briefcase',
  'users',
  'calculator',
  'plane',
  'utensils-crossed',
  'lightbulb',
  'home',
  'graduation-cap',
  'heart',
  'star',
  'coffee',
  'music',
  'camera',
  'shopping-bag',
];

/** Colores disponibles al crear una categoría nueva */
export const NOTE_CATEGORY_COLORS = [
  '#6025d2',
  '#7C3AED',
  '#A78BFA',
  '#1E88E5',
  '#2E9E5B',
  '#34D399',
  '#F57C00',
  '#EC4899',
];
