export interface StatusItem {
  id: string;
  user: string;
  avatar?: string;
  seen: boolean;
  timestamp: string;
  text?: string;
  bgColor?: string;
  imageUrl?: string;
  productLink?: {
    title: string;
    price: string;
  };
}

export const MOCK_STATUSES: StatusItem[] = [
  {
    id: 'st-user',
    user: 'Mi Estado',
    seen: true,
    timestamp: 'Agregar estado',
  },
  {
    id: 'st-1',
    user: 'Laura Restrepo',
    seen: false,
    timestamp: 'Hace 15m',
    text: '¡Nuevo servicio de consultoría de proyectos disponible en mi catálogo!',
    bgColor: '#6025d2',
    productLink: {
      title: 'Consultoría Estratégica',
      price: '$150 / hr',
    },
  },
  {
    id: 'st-2',
    user: 'Carlos Mendoza',
    seen: false,
    timestamp: 'Hace 1h',
    text: 'Trabajando en las últimas actualizaciones del equipo tech.',
    bgColor: '#1A1A2E',
  },
  {
    id: 'st-3',
    user: 'María Fernanda Gómez',
    seen: true,
    timestamp: 'Hace 4h',
    text: 'Nuevos diseños publicados para la red empresarial.',
    bgColor: '#4CAF50',
  },
];
