export interface ContactItem {
  id: string;
  name: string;
  profession: string;
  company?: string;
  activity: string;
  interests: string[];
  initials: string;
  color: string;
  phone?: string;
  email?: string;
  isFavorite?: boolean;
  verified?: boolean;
  category?: 'my_contacts' | 'discover' | 'calls';
  isDiscovery?: boolean;
  isConnected?: boolean;
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
    phone: '+57 300 456 7890',
    email: 'carlos@mendoza-asociados.com',
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
    phone: '+57 312 987 6543',
    email: 'eduardo@techsolutions.com',
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
    phone: '+57 315 123 4567',
    email: 'maria@gomezconsultores.com',
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
    phone: '+57 320 888 9900',
    email: 'sofia@creativestudio.com',
  },
];

export const MOCK_CONTACTS: ContactItem[] = MY_CONTACTS;

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
    isDiscovery: true,
    phone: '+57 301 234 5678',
    email: 'alejandro@beeapp.ai',
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
    isDiscovery: true,
    phone: '+57 302 345 6789',
    email: 'laura@primeadvisors.com',
  },
  {
    id: 'd3',
    verified: true,
    name: 'Felipe Morales',
    profession: 'Gerente de Producto',
    company: 'Fintech Latam',
    activity: 'Finanzas & Tecnología',
    interests: ['Product Strategy', 'Fintech', 'Open Banking'],
    initials: 'FM',
    color: '#E0E7FF',
    isDiscovery: true,
    phone: '+57 303 456 7890',
    email: 'felipe@fintechlatam.com',
  },
  {
    id: 'd4',
    verified: false,
    name: 'Camila Osorio',
    profession: 'Especialista en Marketing',
    company: 'Digital Growth',
    activity: 'Marketing Digital',
    interests: ['Growth Hacking', 'SEO', 'Content Strategy'],
    initials: 'CO',
    color: '#FCE7F3',
    isDiscovery: true,
    phone: '+57 304 567 8901',
    email: 'camila@digitalgrowth.com',
  },
  {
    id: 'd5',
    verified: true,
    name: 'Gabriel Silva',
    profession: 'Arquitecto de Software',
    company: 'Cloud Enterprise',
    activity: 'Tecnología',
    interests: ['AWS', 'Kubernetes', 'Microservicios'],
    initials: 'GS',
    color: '#FEF3C7',
    isDiscovery: true,
    phone: '+57 305 678 9012',
    email: 'gabriel@cloudenterprise.com',
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
  verified?: boolean;
  socialLinks?: Record<string, string>;
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
      linkedin: 'https://linkedin.com/in/carlosmendozalegal',
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

export const CONTACT_CALLS: Record<string, { type: 'incoming' | 'outgoing' | 'missed'; isVideo: boolean; time: string; duration: string }[]> = {
  c1: [
    { type: 'incoming', isVideo: false, time: 'Hoy, 10:15 AM', duration: '5 min 23s' },
    { type: 'missed', isVideo: false, time: '21 Jul, 02:10 PM', duration: '0s' },
    { type: 'outgoing', isVideo: true, time: '18 Jul, 11:30 AM', duration: '15 min 45s' },
  ],
  c2: [
    { type: 'missed', isVideo: true, time: 'Hoy, 08:30 AM', duration: '0s' },
  ],
  c3: [
    { type: 'outgoing', isVideo: false, time: 'Ayer, 03:45 PM', duration: '12 min 10s' },
  ],
};
