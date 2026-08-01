export interface StorageItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'video' | 'doc' | 'zip' | 'sheet';
  size?: string;
  itemCount?: number;
  date: string;
  updatedAt?: string;
  parentId: string | null;
  isSigned?: boolean;
  signerName?: string;
  signedAt?: string;
  isProtected?: boolean;
  categoryIds?: string[];
}

export interface StorageCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const MOCK_STORAGE_CATEGORIES: StorageCategory[] = [
  { id: 'scat-personal', name: 'Personal', icon: 'User', color: '#EBF5FF' },
  { id: 'scat-work', name: 'Trabajo', icon: 'Briefcase', color: '#F1F3F5' },
  { id: 'scat-important', name: 'Importante', icon: 'Star', color: '#FEF3C7' },
];

export const MOCK_STORAGE_ITEMS: StorageItem[] = [
  // Carpetas Principales (Root)
  {
    id: 'f-contratos',
    name: 'Contratos y Acuerdos Q3',
    type: 'folder',
    itemCount: 3,
    date: '20 Jul',
    parentId: null,
    isProtected: false,
    categoryIds: ['scat-work'],
  },
  {
    id: 'f-imagenes',
    name: 'Imágenes de Producto',
    type: 'folder',
    itemCount: 2,
    date: 'Hoy, 09:00 AM',
    parentId: null,
    isProtected: false,
    categoryIds: ['scat-work'],
  },
  {
    id: 'f-videos',
    name: 'Videos Promocionales',
    type: 'folder',
    itemCount: 1,
    date: '12 Jul',
    parentId: null,
    isProtected: false,
  },
  {
    id: 'f-confidencial',
    name: 'Carpeta Confidencial',
    type: 'folder',
    itemCount: 2,
    date: 'Hace 3 días',
    parentId: null,
    isProtected: true,
  },

  // Archivos en Root
  {
    id: 'nda-pdf',
    name: 'NDA_Consultor_Asociado.pdf',
    type: 'pdf',
    size: '1.2 MB',
    date: 'Hoy, 11:30 AM',
    parentId: null,
    isSigned: true,
    signerName: 'Santiago Valencia',
    signedAt: 'Hoy, 11:31 AM',
    categoryIds: ['scat-work', 'scat-important'],
  },
  {
    id: 'precios-doc',
    name: 'Estructura_Precios_BeeApp.doc',
    type: 'doc',
    size: '850 KB',
    date: 'Ayer, 04:20 PM',
    parentId: null,
    categoryIds: ['scat-work'],
  },
  {
    id: 'finanzas-sheet',
    name: 'Balance_Financiero_2026.sheet',
    type: 'sheet',
    size: '2.1 MB',
    date: '18 Jul',
    parentId: null,
    isProtected: true,
  },
  {
    id: 'backup-zip',
    name: 'Respaldo_Base_Datos.zip',
    type: 'zip',
    size: '45.8 MB',
    date: '10 Jul',
    parentId: null,
    isProtected: true,
  },

  // Dentro de Contratos Q3
  {
    id: 'draft-doc',
    name: 'Acuerdo_Comercial_Draft.doc',
    type: 'doc',
    size: '450 KB',
    date: '21 Jul',
    parentId: 'f-contratos',
  },
  {
    id: 'convenio-pdf',
    name: 'Convenio_Marco_Final.pdf',
    type: 'pdf',
    size: '2.4 MB',
    date: '20 Jul',
    parentId: 'f-contratos',
    isSigned: false,
  },
  {
    id: 'anexo-pdf',
    name: 'Anexo_Seguridad_Servidor.pdf',
    type: 'pdf',
    size: '1.1 MB',
    date: '18 Jul',
    parentId: 'f-contratos',
    isSigned: false,
  },

  // Dentro de Imágenes de Producto
  {
    id: 'mockup-img',
    name: 'Mockup_Home_Dashboard.png',
    type: 'image',
    size: '3.4 MB',
    date: 'Hoy, 09:00 AM',
    parentId: 'f-imagenes',
  },
  {
    id: 'banner-img',
    name: 'Banner_Promocional_BeeAI.png',
    type: 'image',
    size: '4.1 MB',
    date: '15 Jul',
    parentId: 'f-imagenes',
  },

  // Dentro de Videos Promocionales
  {
    id: 'intro-video',
    name: 'Presentacion_Elevator_Pitch.mp4',
    type: 'video',
    size: '18.5 MB',
    date: '12 Jul',
    parentId: 'f-videos',
  },

  // Dentro de Carpeta Confidencial
  {
    id: 'secret-pdf',
    name: 'Estrategia_Patentes_IA.pdf',
    type: 'pdf',
    size: '5.6 MB',
    date: 'Hace 3 días',
    parentId: 'f-confidencial',
    isProtected: true,
  },
];
