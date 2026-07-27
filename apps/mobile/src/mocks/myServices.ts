import {
  Laptop,
  UtensilsCrossed,
  Scissors,
  Briefcase,
  PenTool,
  Sofa,
} from 'lucide-react-native';

export type MyServiceType = 'product' | 'service';

export interface MyVariant {
  name: string;
  value: string;
}

export interface MyProductService {
  id: string;
  type: MyServiceType;
  name: string;
  description: string;
  category: string; // id of category
  price: number | null; // null for services
  variants: MyVariant[];
  image: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

export const BEE_CATEGORIES = [
  { id: 'tecnologia', name: 'Tecnología', icon: Laptop, color: '#1E88E5', bg: '#EBF5FF' },
  { id: 'alimentos', name: 'Alimentos', icon: UtensilsCrossed, color: '#D97706', bg: '#FEF3C7' },
  { id: 'belleza', name: 'Belleza', icon: Scissors, color: '#DB2777', bg: '#FCE7F3' },
  { id: 'consultoria', name: 'Consultoría', icon: Briefcase, color: '#7C3AED', bg: '#F3E8FF' },
  { id: 'diseno', name: 'Diseño', icon: PenTool, color: '#0891B2', bg: '#CFFAFE' },
  { id: 'hogar', name: 'Hogar', icon: Sofa, color: '#059669', bg: '#ECFDF5' },
];

let MY_PRODUCTS_SERVICES: MyProductService[] = [
  {
    id: 'p1',
    type: 'product',
    name: 'Teclado Mecánico Inalámbrico RGB',
    description: 'Teclado de perfil alto con switches mecánicos rojos, retroiluminación RGB, conexión Bluetooth y 2.4GHz. Batería de larga duración y switches intercambiables.',
    category: 'tecnologia',
    price: 349000,
    variants: [
      { name: 'Color', value: 'Gris Espacial' },
      { name: 'Switch', value: 'Red (Silencioso)' },
    ],
    image: null,
    status: 'active',
    createdAt: '2026-06-01',
  },
  {
    id: 'p2',
    type: 'product',
    name: 'Termo Inteligente de Acero Inoxidable',
    description: 'Termo térmico de 500ml con indicador táctil de temperatura en la tapa LED. Mantiene calor 12h y frío 24h.',
    category: 'hogar',
    price: 89000,
    variants: [
      { name: 'Capacidad', value: '500ml' },
      { name: 'Color', value: 'Negro Mate' },
    ],
    image: null,
    status: 'active',
    createdAt: '2026-06-10',
  },
  {
    id: 's1',
    type: 'service',
    name: 'Asesoría Tributaria y Contable Corporativa',
    description: 'Consultoría contable integral para PYMEs. Revisión tributaria mensual, planeación fiscal, preparación de estados financieros y reportes de rentabilidad.',
    category: 'consultoria',
    price: null,
    variants: [],
    image: null,
    status: 'active',
    createdAt: '2026-05-15',
  },
  {
    id: 's2',
    type: 'service',
    name: 'Diseño de Identidad Corporativa y Logotipos',
    description: 'Diseño profesional de logos, manual de marca, paleta de colores y tipografía para startups y empresas consolidadas.',
    category: 'diseno',
    price: null,
    variants: [],
    image: null,
    status: 'active',
    createdAt: '2026-05-20',
  },
  {
    id: 'p3',
    type: 'product',
    name: 'Soporte Ergonómico Ajustable para Laptop',
    description: 'Soporte plegable de aluminio antideslizante con 6 niveles de altura ajustable. Ideal para mejorar postura de trabajo remoto.',
    category: 'tecnologia',
    price: 120000,
    variants: [
      { name: 'Material', value: 'Aluminio' },
    ],
    image: null,
    status: 'inactive',
    createdAt: '2026-07-01',
  },
];

export function getMyItems(): MyProductService[] {
  return [...MY_PRODUCTS_SERVICES];
}

export function addItem(item: Omit<MyProductService, 'id' | 'createdAt'>): MyProductService {
  const newItem: MyProductService = {
    ...item,
    id: 'my_' + Date.now().toString(36),
    createdAt: new Date().toISOString().split('T')[0],
  };
  MY_PRODUCTS_SERVICES.unshift(newItem);
  return newItem;
}

export function updateItem(id: string, updated: Partial<MyProductService>): MyProductService | null {
  const idx = MY_PRODUCTS_SERVICES.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  MY_PRODUCTS_SERVICES[idx] = {
    ...MY_PRODUCTS_SERVICES[idx],
    ...updated,
  };
  return MY_PRODUCTS_SERVICES[idx];
}

export function removeItem(id: string): boolean {
  const initialLen = MY_PRODUCTS_SERVICES.length;
  MY_PRODUCTS_SERVICES = MY_PRODUCTS_SERVICES.filter((i) => i.id !== id);
  return MY_PRODUCTS_SERVICES.length < initialLen;
}

export const formatPrice = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
