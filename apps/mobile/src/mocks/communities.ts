/**
 * Comunidades: grupos grandes y **siempre privados** (se entra por invitación)
 * donde **solo el administrador publica** y el resto de miembros únicamente
 * reacciona. Todo es mock en memoria.
 */

/** Id del usuario logueado dentro de las comunidades mock */
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
  /** Reacciones que ya marcó el usuario actual */
  myReactions: ReactionType[];
}

/** Temáticas que puede tener una comunidad */
export const COMMUNITY_CATEGORIES = [
  'Negocios',
  'Tecnología',
  'Diseño',
  'Finanzas',
  'Educación',
  'Comunidad',
];

export interface Community {
  id: string;
  name: string;
  description: string;
  /** Una de COMMUNITY_CATEGORIES */
  category: string;
  initials: string;
  color: string;
  creatorId: string;
  members: CommunityMember[];
  posts: CommunityPost[];
  unreadCount: number;
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

export const MOCK_COMMUNITIES: Community[] = [
  {
    id: 'com1',
    name: 'Emprendedores Bogotá',
    description: 'Novedades, convocatorias y eventos para emprendedores de la ciudad.',
    initials: 'EB',
    color: '#F3E8FF',
    category: 'Negocios',
    creatorId: CURRENT_USER_ID,
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
    unreadCount: 3,
  },
  {
    id: 'com2',
    name: 'Clientes BeeApp',
    description: 'Canal de anuncios para los clientes de la consultora.',
    initials: 'CB',
    color: '#EBF5FF',
    category: 'Negocios',
    creatorId: CURRENT_USER_ID,
    members: [me(), member('c2', 'Eduardo Torres', 'ET', '#FEF3C7'), member('c4', 'Sofía Castro', 'SC', '#F3E8FF')],
    posts: [
      post('p4', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'La nueva versión del tablero de reportes ya está disponible para todos los planes.', 'hace 5 h', { like: 6, love: 1, laugh: 0 }),
      post('p5', CURRENT_USER_ID, 'Santiago Valencia', 'SV', '#F3E8FF', 'Este mes las sesiones de acompañamiento pasan a los martes en la mañana.', 'hace 2 días', { like: 4, love: 0, laugh: 0 }),
    ],
    unreadCount: 0,
  },
  {
    id: 'com3',
    name: 'Diseño y Producto',
    description: 'Referencias, recursos y buenas prácticas de diseño de producto.',
    initials: 'DP',
    color: '#ECFDF5',
    category: 'Diseño',
    creatorId: 'c4',
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

export const getCommunity = (id: string) => MOCK_COMMUNITIES.find((c) => c.id === id);

/** True cuando el usuario logueado creó la comunidad: solo él puede publicar */
export const isCommunityAdmin = (community: Community) => community.creatorId === CURRENT_USER_ID;

/** Crea una comunidad con el usuario como administrador (mock) */
export function addCommunity(data: Pick<Community, 'name' | 'description' | 'category'>): Community {
  const initials = data.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  const created: Community = {
    ...data,
    id: 'com_' + Date.now().toString(36),
    initials,
    color: '#F3E8FF',
    creatorId: CURRENT_USER_ID,
    members: [me()],
    posts: [],
    unreadCount: 0,
  };
  MOCK_COMMUNITIES.unshift(created);
  return created;
}
