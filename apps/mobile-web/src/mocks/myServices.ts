export interface BusinessProduct {
  id: string;
  name: string;
  price: string;
  description: string;
  type: 'product';
  deliveryMethods: string[];
  features: { key: string; value: string }[];
}

export interface BusinessService {
  id: string;
  name: string;
  price: string;
  description: string;
  type: 'service';
  serviceModalities: string[];
  features: { key: string; value: string }[];
}

export interface BusinessItem {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  offersProducts: boolean;
  offersServices: boolean;
  deliveryMethods: string[];
  serviceModalities: string[];
  products: BusinessProduct[];
  services: BusinessService[];
}

export const MOCK_BUSINESSES: BusinessItem[] = [
  {
    id: 'biz-1',
    name: 'Studio Creative & Co.',
    category: 'Diseño & Publicidad',
    address: 'Calle 93 # 12-45, Bogotá',
    description: 'Agencia de branding, diseño digital y producción de material publicitario para empresas.',
    offersProducts: true,
    offersServices: true,
    deliveryMethods: ['Domicilio', 'Recoger en local'],
    serviceModalities: ['Virtual', 'Presencial'],
    products: [
      {
        id: 'prod-1',
        name: 'Pack Banners Publicitarios PNG/SVG',
        price: '$45.00',
        description: 'Set de 10 piezas gráficas editables para redes sociales.',
        type: 'product',
        deliveryMethods: ['Envío digital'],
        features: [
          { key: 'Formato', value: 'PNG, SVG, PSD' },
          { key: 'Entrega', value: 'Inmediata' },
        ],
      },
    ],
    services: [
      {
        id: 'serv-1',
        name: 'Diseño de Identidad Visual Completa',
        price: '$350.00',
        description: 'Creación de logo, manual de marca, paleta de colores y tipografía institucional.',
        type: 'service',
        serviceModalities: ['Virtual'],
        features: [
          { key: 'Duración', value: '5 días hábiles' },
          { key: 'Revisiones', value: 'Hasta 3 rondas' },
        ],
      },
      {
        id: 'serv-2',
        name: 'Consultoría de Marketing Digital',
        price: '$120.00 / hr',
        description: 'Asesoría personalizada sobre estrategias de posicionamiento web.',
        type: 'service',
        serviceModalities: ['Virtual', 'Presencial'],
        features: [
          { key: 'Modalidad', value: 'Sesión 1 a 1' },
        ],
      },
    ],
  },
  {
    id: 'biz-2',
    name: 'Innovatech Solutions',
    category: 'Desarrollo de Software',
    address: 'Av. El Poblado # 5A-110, Medellín',
    description: 'Desarrollo de aplicaciones web, móviles e integraciones de IA para optimizar procesos.',
    offersProducts: false,
    offersServices: true,
    deliveryMethods: [],
    serviceModalities: ['Virtual'],
    products: [],
    services: [
      {
        id: 'serv-3',
        name: 'Desarrollo de Landing Page Next.js',
        price: '$500.00',
        description: 'Sitio web corporativo de alta velocidad con SEO y diseño moderno.',
        type: 'service',
        serviceModalities: ['Virtual'],
        features: [
          { key: 'Stack', value: 'Next.js 14, Tailwind' },
          { key: 'Soporte', value: '30 días incluidos' },
        ],
      },
    ],
  },
];

export function formatPrice(price: string | number): string {
  if (typeof price === 'number') return `$${price.toFixed(2)}`;
  return price.startsWith('$') ? price : `$${price}`;
}

export function getMyItems(): (BusinessProduct | BusinessService)[] {
  const items: (BusinessProduct | BusinessService)[] = [];
  for (const biz of MOCK_BUSINESSES) {
    if (biz.products) items.push(...biz.products);
    if (biz.services) items.push(...biz.services);
  }
  return items;
}
