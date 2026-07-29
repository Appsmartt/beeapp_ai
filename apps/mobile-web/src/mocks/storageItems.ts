export interface StorageItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'doc';
  size: string;
  date: string;
  isSigned?: boolean;
  isProtected?: boolean;
}

export const MOCK_STORAGE_ITEMS: StorageItem[] = [
  {
    id: 'st-1',
    name: 'Contratos y Acuerdos Legal 2026',
    type: 'folder',
    size: '12 elementos',
    date: 'Hace 2 días',
    isProtected: true,
  },
  {
    id: 'st-2',
    name: 'Propuesta_Comercial_BeeApp.pdf',
    type: 'pdf',
    size: '2.4 MB',
    date: '27 Jul 2026',
    isSigned: true,
  },
  {
    id: 'st-3',
    name: 'Manual_de_Identidad_Marca.pdf',
    type: 'pdf',
    size: '8.1 MB',
    date: '25 Jul 2026',
  },
  {
    id: 'st-4',
    name: 'Fotos_Productos_Catalogo.zip',
    type: 'folder',
    size: '45 elementos',
    date: '20 Jul 2026',
  },
  {
    id: 'st-5',
    name: 'Registro_Financiero_Protegido.xlsx',
    type: 'doc',
    size: '1.1 MB',
    date: '15 Jul 2026',
    isProtected: true,
  },
];
