export interface NoteItem {
  id: string;
  title: string;
  preview: string;
  content: string;
  timestamp: string;
  isProtected: boolean;
}

export const MOCK_NOTES: NoteItem[] = [
  {
    id: 'nt-1',
    title: 'Estrategia de Ventas Q3',
    preview: 'Definición de metas mensuales y expansión del catálogo de servicios...',
    content: '1. Incrementar ventas de BeeServices en un 25%.\n2. Configurar respuestas automáticas del asistente de IA.\n3. Lanzar catálogo de productos de temporada.',
    timestamp: 'Hoy, 09:15 AM',
    isProtected: false,
  },
  {
    id: 'nt-2',
    title: 'Claves de Acceso y Credenciales',
    preview: 'Nota protegida. Desbloquea para ver el contenido.',
    content: 'Credenciales del servidor de producción y llaves de acceso secretas.',
    timestamp: 'Ayer',
    isProtected: true,
  },
  {
    id: 'nt-3',
    title: 'Lista de Proveedores de Insumos',
    preview: 'Contactos clave para abastecimiento de material y precios negociados...',
    content: 'Proveedor A: Tel 310 999 8877\nProveedor B: Envío gratis a partir de $500',
    timestamp: '26 Jul',
    isProtected: false,
  },
  {
    id: 'nt-4',
    title: 'Ideas para Asistente de Voz',
    preview: 'Comandos principales: listar pedidos, responder mensajes, programar reuniones...',
    content: 'Integrar accesos rápidos por voz desde la pantalla principal.',
    timestamp: '22 Jul',
    isProtected: false,
  },
  {
    id: 'nt-5',
    title: 'Finanzas Personales y Negocio',
    preview: 'Nota protegida. Desbloquea para ver el contenido.',
    content: 'Presupuesto mensual asignado y balance general de ingresos.',
    timestamp: '18 Jul',
    isProtected: true,
  },
];
