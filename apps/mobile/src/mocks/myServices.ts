/**
 * BeeServices mock data — business-centric model.
 *
 * A user owns one or more Businesses; each Business contains a catalogue
 * of Products and/or Services.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeliveryMethod = 'domicilio' | 'recoger' | 'consumir';
export type ServiceMode = 'virtual' | 'presencial';

export interface BusinessCategory {
  id: string;
  label: string;
}

export interface ProductCharacteristic {
  name: string;
  value: string;
}

export interface BusinessProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  characteristics: ProductCharacteristic[];
  deliveryMethod: DeliveryMethod;
}

export interface BusinessService {
  id: string;
  name: string;
  description: string;
  price: number | null;
  images: string[];
  characteristics: ProductCharacteristic[];
  mode: ServiceMode;
}

export interface Business {
  id: string;
  name: string;
  logo: string | null;
  category: string;
  description: string;
  address: string;
  offersProducts: boolean;
  offersServices: boolean;
  deliveryMethods: DeliveryMethod[];
  serviceModes: ServiceMode[];
  products: BusinessProduct[];
  services: BusinessService[];
  createdAt: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: 'restaurante', label: 'Restaurante' },
  { id: 'tienda', label: 'Tienda' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'belleza', label: 'Belleza' },
  { id: 'consultoria', label: 'Consultoría' },
  { id: 'salud', label: 'Salud' },
  { id: 'educacion', label: 'Educación' },
  { id: 'hogar', label: 'Hogar' },
  { id: 'otro', label: 'Otro' },
];

// ─── Mock Businesses ─────────────────────────────────────────────────────────

let MOCK_BUSINESSES: Business[] = [
  {
    id: 'biz_1',
    name: 'Consultores Asociados S.A.S.',
    logo: null,
    category: 'consultoria',
    description:
      'Firma de consultoría integral con más de 15 años de experiencia en asesoría legal, estratégica y financiera para empresas de todos los tamaños.',
    address: 'Cra 7 #72-41, Of. 1205, Bogotá',
    offersProducts: false,
    offersServices: true,
    deliveryMethods: [],
    serviceModes: ['virtual', 'presencial'],
    products: [],
    services: [
      {
        id: 'srv_1',
        name: 'Asesoría Legal',
        description:
          'Consultoría jurídica integral para empresas: derecho corporativo, contratos, propiedad intelectual y resolución de conflictos.',
        price: null,
        images: [],
        characteristics: [
          { name: 'Duración', value: '2 horas' },
          { name: 'Incluye', value: 'Informe escrito' },
        ],
        mode: 'virtual',
      },
      {
        id: 'srv_2',
        name: 'Consultoría Estratégica',
        description:
          'Diseño e implementación de planes estratégicos corporativos, análisis de mercado y posicionamiento competitivo.',
        price: null,
        images: [],
        characteristics: [
          { name: 'Duración', value: '4 horas' },
          { name: 'Incluye', value: 'Plan de acción' },
        ],
        mode: 'presencial',
      },
      {
        id: 'srv_3',
        name: 'Auditoría Financiera',
        description:
          'Revisión completa de estados financieros, cumplimiento normativo y recomendaciones de mejora para la gestión contable.',
        price: null,
        images: [],
        characteristics: [
          { name: 'Duración', value: '8 horas' },
          { name: 'Incluye', value: 'Informe de auditoría' },
          { name: 'Normativa', value: 'NIIF / NIA' },
        ],
        mode: 'presencial',
      },
    ],
    createdAt: '2026-03-15',
  },
  {
    id: 'biz_2',
    name: 'TechStore Bogotá',
    logo: null,
    category: 'tecnologia',
    description:
      'Tienda especializada en tecnología y accesorios de computación. Venta de equipos nuevos y servicio técnico certificado.',
    address: 'Av. 19 #134-22, Local 3, Bogotá',
    offersProducts: true,
    offersServices: true,
    deliveryMethods: ['domicilio', 'recoger'],
    serviceModes: ['presencial'],
    products: [
      {
        id: 'prod_1',
        name: 'Laptop HP Pavilion 15',
        description:
          'Laptop HP Pavilion con procesador Intel Core i7, 16 GB RAM, 512 GB SSD y pantalla Full HD de 15.6".',
        price: 3200000,
        images: [],
        characteristics: [
          { name: 'Procesador', value: 'Intel Core i7-1355U' },
          { name: 'RAM', value: '16 GB DDR4' },
          { name: 'Garantía', value: '1 año' },
        ],
        deliveryMethod: 'domicilio',
      },
      {
        id: 'prod_2',
        name: 'Monitor LG 27"',
        description:
          'Monitor IPS de 27 pulgadas con resolución QHD (2560x1440), 75Hz, HDR10 y conectividad HDMI/DisplayPort.',
        price: 1450000,
        images: [],
        characteristics: [
          { name: 'Resolución', value: '2560x1440 QHD' },
          { name: 'Panel', value: 'IPS' },
          { name: 'Garantía', value: '2 años' },
        ],
        deliveryMethod: 'domicilio',
      },
      {
        id: 'prod_3',
        name: 'Teclado Mecánico RGB',
        description:
          'Teclado mecánico compacto con switches Cherry MX Red, retroiluminación RGB personalizable y construcción de aluminio.',
        price: 320000,
        images: [],
        characteristics: [
          { name: 'Color', value: 'Negro' },
          { name: 'Switch', value: 'Cherry MX Red' },
        ],
        deliveryMethod: 'recoger',
      },
      {
        id: 'prod_4',
        name: 'Mouse Inalámbrico Logitech MX',
        description:
          'Mouse ergonómico inalámbrico con sensor de alta precisión, batería recargable USB-C y conexión multi-dispositivo.',
        price: 280000,
        images: [],
        characteristics: [
          { name: 'Color', value: 'Gris grafito' },
          { name: 'Conectividad', value: 'Bluetooth / USB' },
          { name: 'Garantía', value: '1 año' },
        ],
        deliveryMethod: 'domicilio',
      },
    ],
    services: [
      {
        id: 'srv_4',
        name: 'Mantenimiento de Equipos',
        description:
          'Servicio de mantenimiento preventivo y correctivo para laptops y equipos de escritorio. Limpieza interna, cambio de pasta térmica y diagnóstico completo.',
        price: 120000,
        images: [],
        characteristics: [
          { name: 'Duración', value: '1-2 horas' },
          { name: 'Incluye', value: 'Diagnóstico + limpieza' },
        ],
        mode: 'presencial',
      },
    ],
    createdAt: '2026-05-01',
  },
];

// ─── CRUD helpers ────────────────────────────────────────────────────────────

export function getBusinesses(): Business[] {
  return [...MOCK_BUSINESSES];
}

export function getBusinessById(id: string): Business | undefined {
  return MOCK_BUSINESSES.find((b) => b.id === id);
}

export function addBusiness(
  data: Omit<Business, 'id' | 'createdAt' | 'products' | 'services'>,
): Business {
  const biz: Business = {
    ...data,
    id: 'biz_' + Date.now().toString(36),
    products: [],
    services: [],
    createdAt: new Date().toISOString().split('T')[0],
  };
  MOCK_BUSINESSES.unshift(biz);
  return biz;
}

export function updateBusiness(id: string, data: Partial<Business>): Business | null {
  const idx = MOCK_BUSINESSES.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  MOCK_BUSINESSES[idx] = { ...MOCK_BUSINESSES[idx], ...data };
  return MOCK_BUSINESSES[idx];
}

export function removeBusiness(id: string): boolean {
  const len = MOCK_BUSINESSES.length;
  MOCK_BUSINESSES = MOCK_BUSINESSES.filter((b) => b.id !== id);
  return MOCK_BUSINESSES.length < len;
}

export function addProduct(businessId: string, product: Omit<BusinessProduct, 'id'>): BusinessProduct | null {
  const biz = MOCK_BUSINESSES.find((b) => b.id === businessId);
  if (!biz) return null;
  const p: BusinessProduct = { ...product, id: 'prod_' + Date.now().toString(36) };
  biz.products.unshift(p);
  return p;
}

export function removeProduct(businessId: string, productId: string): boolean {
  const biz = MOCK_BUSINESSES.find((b) => b.id === businessId);
  if (!biz) return false;
  const len = biz.products.length;
  biz.products = biz.products.filter((p) => p.id !== productId);
  return biz.products.length < len;
}

export function addService(businessId: string, service: Omit<BusinessService, 'id'>): BusinessService | null {
  const biz = MOCK_BUSINESSES.find((b) => b.id === businessId);
  if (!biz) return null;
  const s: BusinessService = { ...service, id: 'srv_' + Date.now().toString(36) };
  biz.services.unshift(s);
  return s;
}

export function removeService(businessId: string, serviceId: string): boolean {
  const biz = MOCK_BUSINESSES.find((b) => b.id === businessId);
  if (!biz) return false;
  const len = biz.services.length;
  biz.services = biz.services.filter((s) => s.id !== serviceId);
  return biz.services.length < len;
}

// ─── Backward-compatible exports ─────────────────────────────────────────────
// StatusViewer.tsx and ProductLinkSelector.tsx import these from the old file.

export const formatPrice = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Flattened view of all products/services across businesses (legacy compat). */
export function getMyItems() {
  const items: { id: string; type: 'product' | 'service'; name: string; price: number | null }[] = [];
  for (const biz of MOCK_BUSINESSES) {
    for (const p of biz.products) {
      items.push({ id: p.id, type: 'product', name: p.name, price: p.price });
    }
    for (const s of biz.services) {
      items.push({ id: s.id, type: 'service', name: s.name, price: s.price });
    }
  }
  return items;
}

/** Category label lookup */
export function getCategoryLabel(categoryId: string): string {
  return BUSINESS_CATEGORIES.find((c) => c.id === categoryId)?.label ?? 'General';
}
