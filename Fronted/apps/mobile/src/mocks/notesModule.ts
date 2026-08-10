/**
 * Notas del módulo de Notas (mock en memoria).
 * La lista de la vista "Todas" usa el resumen de mocks/notes.ts.
 */

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  /** ISO string */
  updatedAt: string;
  /** ISO string */
  createdAt: string;
  isFavorite: boolean;
  /** Color del punto de la nota (dato del usuario, no un token) */
  colorTag: string;
  reminderDate?: string;
  folder: 'notes' | 'trash';
  /** Categoría a la que pertenece (ver mocks/noteCategories.ts) */
  categoryId: string;
}

export const MOCK_MODULE_NOTES: NoteItem[] = [
    {
      id: 'n1',
      title: 'Ideas campaña de Marketing',
      content: '1. Usar videos de formato corto en TikTok sobre BeeApp.\n2. Contactar micro-influencers del sector Pymes.\n3. Crear descuentos por recomendación directa.',
      updatedAt: '2026-07-23T10:00:00Z',
      createdAt: '2026-07-20T08:00:00Z',
      isFavorite: true,
      colorTag: '#A78BFA', // Purple
      folder: 'notes',
      categoryId: 'idea',
    },
    {
      id: 'n2',
      title: 'Lista de compras corporativas',
      content: 'Comprar los siguientes insumos para la oficina de Bogotá:\n- 3 resmas de papel carta.\n- Cafetera nueva de filtro.\n- Teclados y mouse ergonómicos.',
      updatedAt: '2026-07-22T14:30:00Z',
      createdAt: '2026-07-22T14:00:00Z',
      isFavorite: false,
      colorTag: '#F472B6', // Pink
      reminderDate: '28 Jul • 10:00 AM',
      folder: 'notes',
      categoryId: 'hogar',
    },
    {
      id: 'n3',
      title: 'Estrategia de Ventas Q4',
      content: 'Definir metas de equipo y metas individuales. Implementar el nuevo CRM. Mejorar los tiempos de respuesta del soporte BeeAI.',
      updatedAt: '2026-07-21T09:00:00Z',
      createdAt: '2026-07-15T11:00:00Z',
      isFavorite: true,
      colorTag: '#60A5FA', // Blue
      folder: 'notes',
      categoryId: 'proyecto',
    },
    {
      id: 'n4',
      title: 'Claves del Servidor Temp',
      content: 'Claves temporales para base de datos local y puertos habilitados en el router corporativo. Eliminar este archivo el lunes.',
      updatedAt: '2026-07-19T17:15:00Z',
      createdAt: '2026-07-19T17:00:00Z',
      isFavorite: false,
      colorTag: '#FB923C', // Orange
      folder: 'notes',
      categoryId: 'documento',
    },
    {
      id: 'n5',
      title: 'Nota borrada antigua',
      content: 'Esto es una prueba de papelera. Contenido viejo que ya no sirve y fue desechado por el usuario.',
      updatedAt: '2026-07-10T12:00:00Z',
      createdAt: '2026-07-10T12:00:00Z',
      isFavorite: false,
      colorTag: '#9CA3AF', // Gray
      folder: 'trash',
      categoryId: 'personal',
    },
];
