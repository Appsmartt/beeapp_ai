import {
  Laptop,
  UtensilsCrossed,
  Scissors,
  Briefcase,
  PenTool,
  Sofa,
} from 'lucide-react-native';

/**
 * Mock catalogue of BeeServices, the internal marketplace.
 * Everything lives in memory: no backend, no payments, no orders yet.
 */

export type ListingKind = 'product' | 'service';

export interface BeeCategory {
  id: string;
  name: string;
  icon: typeof Laptop;
  color: string;
  bg: string;
}

export interface BeeSeller {
  id: string;
  name: string;
  initials: string;
  headline: string;
  description: string;
  categoryId: string;
  city: string;
  rating: number;
  reviews: number;
  sales: number;
  memberSince: string;
  color: string;
}

export interface BeeVariantGroup {
  id: string;
  label: string;
  options: string[];
}

export interface BeeListing {
  id: string;
  kind: ListingKind;
  name: string;
  categoryId: string;
  sellerId: string;
  /** Only products have a closed price; services are quoted by chat */
  price?: number;
  /** Reference range shown on services instead of a fixed price */
  quoteHint?: string;
  shortDesc: string;
  description: string;
  /** Tints of the mock gallery tiles (stand-ins for real photos) */
  photoTones: string[];
  variants?: BeeVariantGroup[];
  /** Products: how it is delivered. Services: how it is provided */
  delivery: string;
  rating: number;
  reviews: number;
  featured?: boolean;
  badge?: string;
}

export const BEE_CATEGORIES: BeeCategory[] = [
  { id: 'tecnologia', name: 'Tecnología', icon: Laptop, color: '#1E88E5', bg: '#EBF5FF' },
  { id: 'alimentos', name: 'Alimentos', icon: UtensilsCrossed, color: '#D97706', bg: '#FEF3C7' },
  { id: 'belleza', name: 'Belleza', icon: Scissors, color: '#DB2777', bg: '#FCE7F3' },
  { id: 'consultoria', name: 'Consultoría', icon: Briefcase, color: '#7C3AED', bg: '#F3E8FF' },
  { id: 'diseno', name: 'Diseño', icon: PenTool, color: '#0891B2', bg: '#CFFAFE' },
  { id: 'hogar', name: 'Hogar', icon: Sofa, color: '#059669', bg: '#ECFDF5' },
];

export const BEE_SELLERS: BeeSeller[] = [
  {
    id: 's1',
    name: 'TecnoAndes S.A.S.',
    initials: 'TA',
    headline: 'Equipos y accesorios corporativos',
    description:
      'Distribuidor mayorista de portátiles, periféricos y accesorios para empresas. Garantía propia de 12 meses y soporte técnico en sitio dentro de Bogotá.',
    categoryId: 'tecnologia',
    city: 'Bogotá',
    rating: 4.8,
    reviews: 126,
    sales: 340,
    memberSince: 'Marzo 2024',
    color: '#1E88E5',
  },
  {
    id: 's2',
    name: 'Café Origen Huila',
    initials: 'CO',
    headline: 'Café de finca tostado por lote',
    description:
      'Finca familiar de tercera generación. Tostamos por lotes pequeños y despachamos a todo el país dentro de las 48 horas siguientes al pedido.',
    categoryId: 'alimentos',
    city: 'Pitalito, Huila',
    rating: 4.9,
    reviews: 208,
    sales: 512,
    memberSince: 'Enero 2024',
    color: '#D97706',
  },
  {
    id: 's3',
    name: 'Laura Restrepo',
    initials: 'LR',
    headline: 'Consultora de estrategia y finanzas',
    description:
      'Doce años acompañando pymes en planeación financiera, estructuración de precios y preparación para rondas de inversión.',
    categoryId: 'consultoria',
    city: 'Medellín',
    rating: 5.0,
    reviews: 41,
    sales: 63,
    memberSince: 'Agosto 2024',
    color: '#7C3AED',
  },
  {
    id: 's4',
    name: 'Estudio Panal',
    initials: 'EP',
    headline: 'Diseño de marca y contenido',
    description:
      'Estudio de diseño enfocado en identidad visual, empaques y piezas para redes. Entregamos archivos editables y manual de marca.',
    categoryId: 'diseno',
    city: 'Cali',
    rating: 4.7,
    reviews: 87,
    sales: 154,
    memberSince: 'Mayo 2024',
    color: '#0891B2',
  },
  {
    id: 's5',
    name: 'Bella Rutina',
    initials: 'BR',
    headline: 'Cuidado personal y servicios a domicilio',
    description:
      'Productos de cuidado facial de formulación natural y servicios de peluquería a domicilio con agenda propia.',
    categoryId: 'belleza',
    city: 'Barranquilla',
    rating: 4.6,
    reviews: 95,
    sales: 231,
    memberSince: 'Febrero 2025',
    color: '#DB2777',
  },
  {
    id: 's6',
    name: 'Maderas del Valle',
    initials: 'MV',
    headline: 'Mobiliario a medida para oficina y hogar',
    description:
      'Carpintería artesanal en madera certificada. Diseñamos, fabricamos e instalamos mobiliario a medida.',
    categoryId: 'hogar',
    city: 'Palmira',
    rating: 4.8,
    reviews: 58,
    sales: 74,
    memberSince: 'Noviembre 2024',
    color: '#059669',
  },
];

export const BEE_LISTINGS: BeeListing[] = [
  {
    id: 'p1',
    kind: 'product',
    name: 'Portátil corporativo 14" i7',
    categoryId: 'tecnologia',
    sellerId: 's1',
    price: 3890000,
    shortDesc: '16 GB RAM, 512 GB SSD, garantía de 12 meses.',
    description:
      'Portátil de 14 pulgadas pensado para trabajo de oficina exigente: procesador i7 de última generación, 16 GB de memoria, disco sólido de 512 GB y lector de huella. Incluye maletín y garantía directa del distribuidor por 12 meses.',
    photoTones: ['#EBF5FF', '#DBEAFE', '#E0E7FF'],
    variants: [
      { id: 'ram', label: 'Memoria', options: ['16 GB', '32 GB'] },
      { id: 'color', label: 'Color', options: ['Gris grafito', 'Plata'] },
    ],
    delivery: 'Envío nacional en 3 a 5 días',
    rating: 4.8,
    reviews: 42,
    featured: true,
    badge: 'Más vendido',
  },
  {
    id: 'p2',
    kind: 'product',
    name: 'Café especial tostado, 500 g',
    categoryId: 'alimentos',
    sellerId: 's2',
    price: 46000,
    shortDesc: 'Origen Huila, tueste medio, molido o en grano.',
    description:
      'Café de origen cultivado a 1.700 metros y tostado por lotes pequeños. Notas de panela, naranja y cacao. Empaque con válvula desgasificadora para conservar el aroma hasta seis meses.',
    photoTones: ['#FEF3C7', '#FDE68A', '#FFEDD5'],
    variants: [
      { id: 'molienda', label: 'Presentación', options: ['En grano', 'Molido'] },
      { id: 'tamano', label: 'Tamaño', options: ['500 g', '1 kg'] },
    ],
    delivery: 'Despacho en 48 horas a todo el país',
    rating: 4.9,
    reviews: 118,
    featured: true,
    badge: 'Envío gratis',
  },
  {
    id: 'p3',
    kind: 'product',
    name: 'Sérum facial de vitamina C',
    categoryId: 'belleza',
    sellerId: 's5',
    price: 89000,
    shortDesc: 'Formulación natural, frasco de 30 ml.',
    description:
      'Sérum concentrado de vitamina C estabilizada con ácido hialurónico. Textura ligera de rápida absorción, apto para piel sensible. Producción por lotes con fecha de elaboración impresa.',
    photoTones: ['#FCE7F3', '#FBCFE8', '#FDE7F3'],
    variants: [{ id: 'tamano', label: 'Contenido', options: ['30 ml', '50 ml'] }],
    delivery: 'Envío nacional en 2 a 4 días',
    rating: 4.6,
    reviews: 73,
  },
  {
    id: 'p4',
    kind: 'product',
    name: 'Escritorio ejecutivo en roble',
    categoryId: 'hogar',
    sellerId: 's6',
    price: 1650000,
    shortDesc: 'Madera certificada, 150 x 70 cm, a medida.',
    description:
      'Escritorio fabricado en roble macizo con acabado al aceite, pasacables integrado y cajonera lateral. Se fabrica a medida y se instala en el sitio dentro del Valle del Cauca.',
    photoTones: ['#ECFDF5', '#D1FAE5', '#F0FDF4'],
    variants: [
      { id: 'medida', label: 'Medida', options: ['150 x 70 cm', '180 x 80 cm'] },
      { id: 'acabado', label: 'Acabado', options: ['Roble natural', 'Nogal oscuro'] },
    ],
    delivery: 'Entrega e instalación coordinada',
    rating: 4.8,
    reviews: 21,
    badge: 'A medida',
  },
  {
    id: 'p5',
    kind: 'product',
    name: 'Plantillas de marca editables',
    categoryId: 'diseno',
    sellerId: 's4',
    price: 120000,
    shortDesc: 'Producto digital: 40 piezas para redes.',
    description:
      'Paquete descargable con 40 plantillas editables para publicaciones e historias, más una guía de uso de color y tipografía. Entrega inmediata por enlace tras confirmar el pedido.',
    photoTones: ['#CFFAFE', '#A5F3FC', '#E0F2FE'],
    delivery: 'Producto digital: enlace de descarga',
    rating: 4.7,
    reviews: 64,
    badge: 'Digital',
  },
  {
    id: 'p6',
    kind: 'product',
    name: 'Base de carga USB-C de 100 W',
    categoryId: 'tecnologia',
    sellerId: 's1',
    price: 320000,
    shortDesc: 'Seis puertos, protección contra sobrecarga.',
    description:
      'Estación de carga con seis puertos USB-C y USB-A, reparto inteligente de potencia hasta 100 W y protección térmica. Ideal para salas de reuniones y puestos compartidos.',
    photoTones: ['#EBF5FF', '#E0E7FF', '#DBEAFE'],
    delivery: 'Envío nacional en 3 a 5 días',
    rating: 4.5,
    reviews: 29,
  },
  {
    id: 'v1',
    kind: 'service',
    name: 'Consultoría de estrategia y precios',
    categoryId: 'consultoria',
    sellerId: 's3',
    quoteHint: 'Se cotiza por alcance y duración',
    shortDesc: 'Diagnóstico, estructura de precios y plan a 90 días.',
    description:
      'Acompañamiento para revisar la estructura de costos, definir precios por línea de negocio y construir un plan de ejecución a 90 días. Incluye tres sesiones de trabajo y un informe final con las decisiones acordadas.',
    photoTones: ['#F3E8FF', '#EDE9FE', '#DDD6FE'],
    delivery: 'Sesiones virtuales o presenciales en Medellín',
    rating: 5.0,
    reviews: 18,
    featured: true,
    badge: 'Mejor calificado',
  },
  {
    id: 'v2',
    kind: 'service',
    name: 'Identidad de marca completa',
    categoryId: 'diseno',
    sellerId: 's4',
    quoteHint: 'Se cotiza según entregables',
    shortDesc: 'Logo, paleta, tipografías y manual de marca.',
    description:
      'Proceso de identidad visual en cuatro etapas: descubrimiento, propuestas, ajustes y entrega. Se entregan archivos editables, versiones para web e impresión y un manual de uso de la marca.',
    photoTones: ['#CFFAFE', '#E0F2FE', '#A5F3FC'],
    delivery: 'Trabajo remoto, entrega en 3 semanas',
    rating: 4.7,
    reviews: 31,
    featured: true,
  },
  {
    id: 'v3',
    kind: 'service',
    name: 'Soporte técnico empresarial',
    categoryId: 'tecnologia',
    sellerId: 's1',
    quoteHint: 'Se cotiza por número de equipos',
    shortDesc: 'Mantenimiento preventivo y mesa de ayuda.',
    description:
      'Plan de mantenimiento preventivo de equipos, respaldo de información y mesa de ayuda remota en horario laboral. Visitas presenciales dentro de Bogotá según el plan acordado.',
    photoTones: ['#EBF5FF', '#DBEAFE', '#E0E7FF'],
    delivery: 'Remoto y presencial en Bogotá',
    rating: 4.6,
    reviews: 24,
  },
  {
    id: 'v4',
    kind: 'service',
    name: 'Peluquería a domicilio',
    categoryId: 'belleza',
    sellerId: 's5',
    quoteHint: 'Se cotiza según servicio y zona',
    shortDesc: 'Corte, color y peinado en tu casa u oficina.',
    description:
      'Servicio a domicilio con agenda propia: corte, color, tratamiento capilar y peinado para eventos. Se lleva todo el equipo y se coordina la fecha por chat.',
    photoTones: ['#FCE7F3', '#FBCFE8', '#FDF2F8'],
    delivery: 'A domicilio en Barranquilla',
    rating: 4.6,
    reviews: 52,
  },
  {
    id: 'v5',
    kind: 'service',
    name: 'Catering para eventos corporativos',
    categoryId: 'alimentos',
    sellerId: 's2',
    quoteHint: 'Se cotiza por número de asistentes',
    shortDesc: 'Estación de café y pasabocas para reuniones.',
    description:
      'Montaje de estación de café de origen con barista, más pasabocas dulces y salados. Se define el menú y el número de asistentes por chat antes de confirmar la fecha.',
    photoTones: ['#FEF3C7', '#FFEDD5', '#FDE68A'],
    delivery: 'Montaje en el sitio del evento',
    rating: 4.9,
    reviews: 37,
  },
  {
    id: 'v6',
    kind: 'service',
    name: 'Mobiliario a medida por encargo',
    categoryId: 'hogar',
    sellerId: 's6',
    quoteHint: 'Se cotiza tras visita de medición',
    shortDesc: 'Diseño, fabricación e instalación.',
    description:
      'Proyecto de mobiliario a medida: visita de medición, propuesta de diseño en 3D, fabricación en taller e instalación. Se acuerdan materiales y tiempos antes de empezar.',
    photoTones: ['#ECFDF5', '#D1FAE5', '#DCFCE7'],
    delivery: 'Visita e instalación en el Valle del Cauca',
    rating: 4.8,
    reviews: 16,
  },
];

export const getSeller = (id: string) => BEE_SELLERS.find((s) => s.id === id);
export const getListing = (id: string) => BEE_LISTINGS.find((l) => l.id === id);
export const getCategory = (id: string) => BEE_CATEGORIES.find((c) => c.id === id);
export const getSellerListings = (sellerId: string) =>
  BEE_LISTINGS.filter((l) => l.sellerId === sellerId);
export const getFeatured = () => BEE_LISTINGS.filter((l) => l.featured);

/** Colombian peso formatting used across the marketplace */
export const formatPrice = (value: number) =>
  `$ ${value.toLocaleString('es-CO').replace(/,/g, '.')}`;
