export interface ContactItem {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  verified: boolean;
  category: 'my_contacts' | 'discover' | 'calls';
}

export const MOCK_CONTACTS: ContactItem[] = [
  {
    id: 'ct-1',
    name: 'Laura Restrepo',
    role: 'Gerente de Proyectos',
    company: 'Innovatech Ltda',
    phone: '+57 312 456 7890',
    email: 'laura.restrepo@innovatech.com',
    verified: true,
    category: 'my_contacts',
  },
  {
    id: 'ct-2',
    name: 'Carlos Mendoza',
    role: 'Director de Tecnología',
    company: 'TechCorp SA',
    phone: '+57 301 987 6543',
    email: 'carlos@techcorp.com',
    verified: true,
    category: 'my_contacts',
  },
  {
    id: 'ct-3',
    name: 'María Fernanda Gómez',
    role: 'Diseñadora Senior',
    company: 'Studio Creative',
    phone: '+57 315 222 3344',
    email: 'mfgomez@design.co',
    verified: false,
    category: 'my_contacts',
  },
  {
    id: 'ct-4',
    name: 'Diego Ramírez',
    role: 'Desarrollador FullStack',
    company: 'BeeApp AI Team',
    phone: '+57 300 555 1234',
    email: 'diego@beeapp.ai',
    verified: true,
    category: 'my_contacts',
  },
  {
    id: 'ct-5',
    name: 'Camilo Torres',
    role: 'Consultor Financiero',
    company: 'Fiduciaria Global',
    phone: '+57 318 777 8899',
    email: 'ctorres@fiduglobal.com',
    verified: false,
    category: 'my_contacts',
  },
];
