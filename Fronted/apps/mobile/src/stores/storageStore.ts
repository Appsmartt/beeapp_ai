export interface StorageItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'video' | 'doc';
  size?: string;
  updatedAt: string;
  parentId: string | null;
  itemCount?: number;
  isSigned?: boolean;
  signerName?: string;
  signedAt?: string;
  isShared?: boolean;
  categoryIds?: string[];
}

export interface StorageCategory {
  id: string;
  name: string;
  /** Lucide icon name */
  icon: string;
  /** Chip background color */
  color: string;
}

export const MOCK_STORAGE_CATEGORIES: StorageCategory[] = [
  { id: 'scat-personal', name: 'Personal', icon: 'User', color: '#EBF5FF' },
  { id: 'scat-work', name: 'Trabajo', icon: 'Briefcase', color: '#F1F3F5' },
  { id: 'scat-important', name: 'Importante', icon: 'Star', color: '#FEF3C7' },
];

export function addStorageCategory(category: Omit<StorageCategory, 'id'>): StorageCategory {
  const created: StorageCategory = { ...category, id: 'scat_' + Date.now().toString(36) };
  MOCK_STORAGE_CATEGORIES.push(created);
  return created;
}

export function setItemCategories(itemId: string, categoryIds: string[]) {
  const item = initialItems.find((i) => i.id === itemId);
  if (item) item.categoryIds = categoryIds;
}

export let initialItems: StorageItem[] = [
  // Root Folders
  { id: 'f-contratos', name: 'Contratos Q3', type: 'folder', parentId: null, updatedAt: '20 Jul', itemCount: 3, categoryIds: ['scat-work'] },
  { id: 'f-imagenes', name: 'Imágenes Producto', type: 'folder', parentId: null, updatedAt: 'Hoy, 09:00 AM', itemCount: 2, categoryIds: ['scat-work'] },
  { id: 'f-videos', name: 'Videos Demo', type: 'folder', parentId: null, updatedAt: '12 Jul', itemCount: 1 },
  // Root Files
  { id: 'nda-pdf', name: 'NDA_Consultor_Asociado.pdf', type: 'pdf', parentId: null, size: '1.2 MB', updatedAt: 'Hoy, 11:30 AM', isSigned: true, signerName: 'Santiago Valencia', signedAt: 'Hoy, 11:31 AM', categoryIds: ['scat-work', 'scat-important'] },
  { id: 'precios-doc', name: 'Estructura_Precios_BeeApp.doc', type: 'doc', parentId: null, size: '850 KB', updatedAt: 'Ayer, 04:20 PM', isShared: true, categoryIds: ['scat-work'] },
  // Inside Contratos Q3
  { id: 'draft-doc', name: 'Acuerdo_Comercial_Draft.doc', type: 'doc', parentId: 'f-contratos', size: '450 KB', updatedAt: '21 Jul' },
  { id: 'convenio-pdf', name: 'Convenio_Marco_Final.pdf', type: 'pdf', parentId: 'f-contratos', size: '2.4 MB', updatedAt: '20 Jul', isSigned: false, categoryIds: ['scat-important'] },
  { id: 'anexo-pdf', name: 'Anexo_Seguridad.pdf', type: 'pdf', parentId: 'f-contratos', size: '1.1 MB', updatedAt: '18 Jul', isSigned: false },
  // Inside Imágenes Producto
  { id: 'mockup-img', name: 'Mockup_Home.png', type: 'image', parentId: 'f-imagenes', size: '3.4 MB', updatedAt: 'Hoy, 09:00 AM', categoryIds: ['scat-personal'] },
  { id: 'banner-img', name: 'Banner_Promocional.png', type: 'image', parentId: 'f-imagenes', size: '4.1 MB', updatedAt: '15 Jul' },
  // Inside Videos Demo
  { id: 'intro-video', name: 'Presentacion_Elevator.mp4', type: 'video', parentId: 'f-videos', size: '18.5 MB', updatedAt: '12 Jul', categoryIds: ['scat-personal'] },
];

export const getItems = () => initialItems;
export const setItems = (newItems: StorageItem[]) => {
  initialItems = newItems;
};
