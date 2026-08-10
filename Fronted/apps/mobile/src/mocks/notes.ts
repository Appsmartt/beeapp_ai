/**
 * Datos mock del módulo de Notas para las vistas que necesitan un resumen
 * (p. ej. la vista "Todas" del Home). Los ids coinciden con las notas del
 * propio módulo para que abrirlas lleve a la nota real.
 */

export interface NoteSummary {
  id: string;
  title: string;
  preview: string;
  date: string;
  isProtected: boolean;
}

export const MOCK_NOTES: NoteSummary[] = [
  {
    id: 'n1',
    title: 'Ideas campaña de Marketing',
    preview: 'Usar videos de formato corto en TikTok sobre BeeApp y contactar micro-influencers del sector Pymes.',
    date: '23 Jul',
    isProtected: false,
  },
  {
    id: 'n2',
    title: 'Lista de compras corporativas',
    preview: 'Insumos para la oficina de Bogotá: resmas de papel carta, cafetera de filtro y teclados ergonómicos.',
    date: '22 Jul',
    isProtected: false,
  },
  {
    id: 'n3',
    title: 'Estrategia de Ventas Q4',
    preview: 'Definir metas de equipo e individuales, implementar el nuevo CRM y mejorar los tiempos de soporte.',
    date: '21 Jul',
    isProtected: false,
  },
  {
    id: 'n4',
    title: 'Claves del Servidor Temp',
    preview: 'Claves temporales de base de datos local y puertos habilitados en el router corporativo.',
    date: '19 Jul',
    isProtected: true,
  },
];
