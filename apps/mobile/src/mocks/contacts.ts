/**
 * Datos mock del módulo de Contactos.
 * Extraídos de app/(main)/contacts/ sin modificar su contenido.
 */

export interface ContactItem {
  id: string;
  name: string;
  profession: string;
  company?: string;
  activity: string;
  interests: string[];
  initials: string;
  color: string;
  isFavorite?: boolean;
  /** Mock: shows the verified badge next to the name (Bee Verify) */
  verified?: boolean;
}

export interface CallLogItem {
  id: string;
  contactId: string;
  name: string;
  initials: string;
  color: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  time: string;
  duration: string;
  /** Mock: shows the verified badge next to the name (Bee Verify) */
  verified?: boolean;
}

export const MY_CONTACTS: ContactItem[] = [
  {
    id: 'c1',
    verified: true,
    name: 'Carlos Mendoza',
    profession: 'Abogado Corporativo',
    company: 'Mendoza & Asociados',
    activity: 'Servicios Legales',
    interests: ['Startups', 'Finanzas', 'Propiedad Intelectual'],
    initials: 'CM',
    color: '#EBF5FF',
    isFavorite: true,
  },
  {
    id: 'c2',
    verified: false,
    name: 'Eduardo Torres',
    profession: 'Director de Ventas',
    company: 'Tech Solutions',
    activity: 'Tecnología',
    interests: ['Ventas B2B', 'SaaS', 'Negociación'],
    initials: 'ET',
    color: '#FEF3C7',
  },
  {
    id: 'c3',
    verified: true,
    name: 'María Gómez',
    profession: 'Contadora Pública',
    company: 'Gómez Consultores',
    activity: 'Contabilidad y Auditoría',
    interests: ['Impuestos', 'Finanzas Corporativas', 'Pymes'],
    initials: 'MG',
    color: '#ECFDF5',
    isFavorite: true,
  },
  {
    id: 'c4',
    verified: false,
    name: 'Sofía Castro',
    profession: 'Diseñadora UX/UI',
    company: 'Creative Studio',
    activity: 'Diseño',
    interests: ['Figma', 'Mobile Design', 'User Research'],
    initials: 'SC',
    color: '#F3E8FF',
  },
];

export const DISCOVER_CONTACTS: ContactItem[] = [
  {
    id: 'd1',
    verified: true,
    name: 'Alejandro Ruiz',
    profession: 'Desarrollador Mobile',
    company: 'BeeApp Labs',
    activity: 'Tecnología e Información (TI)',
    interests: ['React Native', 'Expo', 'Artificial Intelligence'],
    initials: 'AR',
    color: '#E0F2FE',
  },
  {
    id: 'd2',
    verified: true,
    name: 'Laura Ramos',
    profession: 'Consultora de Negocios',
    company: 'Prime Advisors',
    activity: 'Consultoría Estratégica',
    interests: ['Crecimiento', 'Inversión Ángel', 'SaaS'],
    initials: 'LR',
    color: '#FEE2E2',
  },
  {
    id: 'd3',
    verified: false,
    name: 'Felipe Ortega',
    profession: 'Asesor Financiero',
    company: 'Ortega & Co',
    activity: 'Finanzas e Inversiones',
    interests: ['Wealth Management', 'Venture Capital', 'Crypto'],
    initials: 'FO',
    color: '#EBF5FF',
  },
  {
    id: 'd4',
    verified: false,
    name: 'Valeria Soler',
    profession: 'Especialista en Marketing',
    company: 'Growth Agency',
    activity: 'Marketing y Publicidad',
    interests: ['SEO', 'Growth Hacking', 'Paid Media'],
    initials: 'VS',
    color: '#FEF3C7',
  },
];

export const CALL_LOGS: CallLogItem[] = [
  {
    id: 'l1',
    verified: true,
    contactId: 'c1',
    name: 'Carlos Mendoza',
    initials: 'CM',
    color: '#EBF5FF',
    type: 'incoming',
    isVideo: false,
    time: 'Hoy, 10:15 AM',
    duration: '5 min 23s',
  },
  {
    id: 'l2',
    verified: false,
    contactId: 'c2',
    name: 'Eduardo Torres',
    initials: 'ET',
    color: '#FEF3C7',
    type: 'missed',
    isVideo: true,
    time: 'Hoy, 08:30 AM',
    duration: '0s',
  },
  {
    id: 'l3',
    verified: true,
    contactId: 'c3',
    name: 'María Gómez',
    initials: 'MG',
    color: '#ECFDF5',
    type: 'outgoing',
    isVideo: false,
    time: 'Ayer, 03:45 PM',
    duration: '12 min 10s',
  },
  {
    id: 'l4',
    verified: true,
    contactId: 'c1',
    name: 'Carlos Mendoza',
    initials: 'CM',
    color: '#EBF5FF',
    type: 'missed',
    isVideo: false,
    time: '21 Jul, 02:10 PM',
    duration: '0s',
  },
];

export interface ContactDetail {
  id: string;
  name: string;
  profession: string;
  company: string;
  activity: string;
  phone: string;
  email: string;
  interests: string[];
  initials: string;
  color: string;
  online: boolean;
  socialLinks?: Record<string, string>;
  /** Mock: shows the verified badge next to the name (Bee Verify) */
  verified?: boolean;
}

export const ALL_CONTACT_DETAILS: Record<string, ContactDetail> = {
  c1: {
    id: 'c1',
    verified: true,
    name: 'Carlos Mendoza',
    profession: 'Abogado Corporativo',
    company: 'Mendoza & Asociados',
    activity: 'Servicios Legales',
    phone: '+57 300 456 7890',
    email: 'carlos@mendoza-asociados.com',
    interests: ['Startups', 'Finanzas', 'Propiedad Intelectual'],
    initials: 'CM',
    color: '#EBF5FF',
    online: true,
    socialLinks: {
      instagram: 'https://instagram.com/carlosmendoza_legal',
      linkedin: 'https://linkedin.com/in/carlosmendoza-abogado',
    },
  },
  c2: {
    id: 'c2',
    verified: false,
    name: 'Eduardo Torres',
    profession: 'Director de Ventas',
    company: 'Tech Solutions Ltd.',
    activity: 'Tecnología e Información',
    phone: '+57 312 987 6543',
    email: 'eduardo.torres@techsolutions.com',
    interests: ['Ventas B2B', 'SaaS', 'Negociación'],
    initials: 'ET',
    color: '#FEF3C7',
    online: false,
  },
  c3: {
    id: 'c3',
    verified: true,
    name: 'María Gómez',
    profession: 'Contadora Pública',
    company: 'Gómez Consultores',
    activity: 'Contabilidad y Auditoría',
    phone: '+57 315 123 4567',
    email: 'maria.gomez@gomez-consultores.co',
    interests: ['Impuestos', 'Finanzas Corporativas', 'Pymes'],
    initials: 'MG',
    color: '#ECFDF5',
    online: true,
    socialLinks: {
      instagram: 'https://instagram.com/mariagomez_finanzas',
      linkedin: 'https://linkedin.com/in/mariagomezconsultora',
      tiktok: 'https://tiktok.com/@mariagomez',
    },
  },
  c4: {
    id: 'c4',
    verified: false,
    name: 'Sofía Castro',
    profession: 'Diseñadora UX/UI',
    company: 'Creative Studio',
    activity: 'Diseño e Interfaces',
    phone: '+57 320 888 9900',
    email: 'sofia.castro@creativestudio.design',
    interests: ['Figma', 'Mobile Design', 'User Research'],
    initials: 'SC',
    color: '#F3E8FF',
    online: false,
    socialLinks: {
      instagram: 'https://instagram.com/sofiacastro_ux',
      youtube: 'https://youtube.com/@sofiacastro',
    },
  },
};

// Call history mock for c1
export const CONTACT_CALLS: Record<string, { type: 'incoming' | 'outgoing' | 'missed'; isVideo: boolean; time: string; duration: string }[]> = {
  c1: [
    { type: 'incoming', isVideo: false, time: 'Hoy, 10:15 AM', duration: '5 min 23s' },
    { type: 'missed', isVideo: false, time: '21 Jul, 02:10 PM', duration: '0s' },
    { type: 'outgoing', isVideo: true, time: '18 Jul, 11:30 AM', duration: '15 min 45s' },
  ],
  c2: [
    { type: 'missed', isVideo: true, time: 'Hoy, 08:30 AM', duration: '0s' },
    { type: 'incoming', isVideo: false, time: '19 Jul, 04:20 PM', duration: '3 min 12s' },
  ],
  c3: [
    { type: 'outgoing', isVideo: false, time: 'Ayer, 03:45 PM', duration: '12 min 10s' },
  ],
  c4: [
    { type: 'incoming', isVideo: true, time: '15 Jul, 01:15 PM', duration: '8 min 05s' },
  ],
};
