export interface NoteCategory {
  id: string;
  name: string;
  iconKey: string;
  color: string;
  isFixed?: boolean;
}

export { loadNoteCategoryPalette } from '@/lib/client/publicAppSettings';
