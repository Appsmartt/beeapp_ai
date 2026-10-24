export interface NoteItem {
  id: string;
  title: string;
  preview: string;
  content: string;
  timestamp: string;
  isProtected: boolean;
  isFavorite?: boolean;
  reminderDate?: string;
  folder?: 'notes' | 'trash';
  createdAt?: string;
  colorTag?: string;
  categoryId: string;
}
