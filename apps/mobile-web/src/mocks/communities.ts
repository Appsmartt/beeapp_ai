export interface CommunityPost {
  id: string;
  author: string;
  avatar?: string;
  time: string;
  text: string;
  reactions: {
    thumbsUp: number;
    heart: number;
    smile: number;
  };
  userReactions: {
    thumbsUp?: boolean;
    heart?: boolean;
    smile?: boolean;
  };
}

export interface CommunityItem {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  isAdmin: boolean;
  unreadCount: number;
  category: string;
  posts: CommunityPost[];
}

export const MOCK_COMMUNITIES: CommunityItem[] = [
  {
    id: 'comm-1',
    name: 'Comunidad Empresarial BeeApp',
    description: 'Espacio de comunicación oficial para anuncios de la red de negocios.',
    membersCount: 1420,
    isAdmin: true,
    unreadCount: 3,
    category: 'Negocios',
    posts: [
      {
        id: 'p1',
        author: 'Santiago Morales (Admin)',
        time: 'Hace 2h',
        text: '¡Bienvenidos todos a la comunidad de BeeApp AI! Estaremos publicando eventos, webinars y actualizaciones exclusivas semanalmente.',
        reactions: { thumbsUp: 45, heart: 32, smile: 12 },
        userReactions: { thumbsUp: true },
      },
      {
        id: 'p2',
        author: 'Santiago Morales (Admin)',
        time: 'Ayer',
        text: 'Recordatorio: Mañana tendremos el taller en vivo sobre cómo configurar catálogos en BeeServices.',
        reactions: { thumbsUp: 28, heart: 14, smile: 5 },
        userReactions: {},
      },
    ],
  },
  {
    id: 'comm-2',
    name: 'Club de Emprendedores & Tech',
    description: 'Comunidad de tecnología e innovación aplicada a ventas y servicios.',
    membersCount: 580,
    isAdmin: false,
    unreadCount: 0,
    category: 'Tecnología',
    posts: [
      {
        id: 'p3',
        author: 'Laura Restrepo (Admin)',
        time: 'Hace 5h',
        text: 'Publicamos el reporte mensual de tendencias de mercado para Q3. Revisen la sección de recursos.',
        reactions: { thumbsUp: 19, heart: 8, smile: 2 },
        userReactions: {},
      },
    ],
  },
];
