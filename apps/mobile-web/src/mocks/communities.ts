export const CURRENT_USER_ID = 'me';

export type ReactionType = 'like' | 'love' | 'laugh';

export interface CommunityMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  initials: string;
  color: string;
  isCurrentUser?: boolean;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  timestamp: string;
  reactions: Record<ReactionType, number>;
  myReactions: ReactionType[];
}

export const COMMUNITY_CATEGORIES = [
  'Negocios',
  'Tecnología',
  'Diseño',
  'Finanzas',
  'Educación',
  'Comunidad',
];

export interface CommunityItem {
  id: string;
  name: string;
  description: string;
  category: string;
  initials: string;
  color: string;
  creatorId: string;
  membersCount: number;
  isAdmin: boolean;
  unreadCount: number;
  members: CommunityMember[];
  posts: CommunityPost[];
}

const me = (): CommunityMember => ({
  id: CURRENT_USER_ID,
  name: 'Santiago Valencia',
  role: 'admin',
  initials: 'SV',
  color: '#F3E8FF',
  isCurrentUser: true,
});

const member = (id: string, name: string, initials: string, color: string): CommunityMember => ({
  id,
  name,
  role: 'member',
  initials,
  color,
});

const post = (
  id: string,
  authorId: string,
  authorName: string,
  authorInitials: string,
  authorColor: string,
  text: string,
  timestamp: string,
  reactions: Record<ReactionType, number>
): CommunityPost => ({
  id,
  authorId,
  authorName,
  authorInitials,
  authorColor,
  text,
  timestamp,
  reactions,
  myReactions: [],
});

export const MOCK_COMMUNITIES: CommunityItem[] = [
  {
    id: 'com1',
    name: 'Emprendedores Bogotá',
    description: 'Novedades, convocatorias y eventos para emprendedores de la ciudad.',
    initials: 'EB',
    color: '#F3E8FF',
    category: 'Negocios',
    creatorId: CURRENT_USER_ID,
    membersCount: 4,
    isAdmin: true,
    unreadCount: 3,
    members: [
      me(),
      member('c1', 'Carlos Mendoza', 'CM', '#EBF5FF'),
      member('c3', 'María Gómez', 'MG', '#ECFDF5'),
      member('g1', 'Laura Restrepo', 'LR', '#FFEBEE'),
    ],
    posts: [
      post('p1', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'Abrimos convocatoria para la mentoría de finanzas del próximo viernes. Quedan quince cupos.', 'hace 2 h', { like: 12, love: 4, laugh: 0 }),
      post('p2', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'Resumen del encuentro de ayer: tres alianzas nuevas y dos rondas de inversión en camino. Gracias a todos los que asistieron.', 'ayer', { like: 25, love: 9, laugh: 1 }),
      post('p3', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'Recuerden actualizar su perfil de BeeServices antes de la feria: es lo primero que ven los compradores.', 'hace 3 días', { like: 8, love: 2, laugh: 0 }),
    ],
  },
  {
    id: 'com2',
    name: 'Clientes BeeApp',
    description: 'Canal de anuncios para los clientes de la consultora.',
    initials: 'CB',
    color: '#EBF5FF',
    category: 'Negocios',
    creatorId: CURRENT_USER_ID,
    membersCount: 3,
    isAdmin: true,
    unreadCount: 0,
    members: [me(), member('c2', 'Eduardo Torres', 'ET', '#FEF3C7'), member('c4', 'Sofía Castro', 'SC', '#F3E8FF')],
    posts: [
      post('p4', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'La nueva versión del tablero de reportes ya está disponible para todos los planes.', 'hace 5 h', { like: 6, love: 1, laugh: 0 }),
      post('p5', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'Este mes las sesiones de acompañamiento pasan a los martes en la mañana.', 'hace 2 días', { like: 4, love: 0, laugh: 0 }),
    ],
  },
  {
    id: 'com3',
    name: 'Diseño y Producto',
    description: 'Referencias, recursos y buenas prácticas de diseño de producto.',
    initials: 'DP',
    color: '#ECFDF5',
    category: 'Diseño',
    creatorId: 'c4',
    membersCount: 3,
    isAdmin: false,
    members: [
      { ...me(), role: 'member' },
      member('c4', 'Sofía Castro', 'SC', '#F3E8FF'),
      member('c1', 'Carlos Mendoza', 'CM', '#EBF5FF'),
    ],
    posts: [
      post('p6', 'c4', 'Sofía Castro', 'SC', '#F3E8FF', 'Publiqué la guía de accesibilidad que usamos en los últimos tres proyectos. Está en la carpeta compartida.', 'hace 1 h', { like: 18, love: 7, laugh: 0 }),
      post('p7', 'c4', 'Sofía Castro', 'SC', '#F3E8FF', 'Recordatorio: la sesión de crítica de diseño es cada jueves a las 16:00.', 'hace 4 días', { like: 11, love: 3, laugh: 2 }),
    ],
    unreadCount: 5,
  },
];
