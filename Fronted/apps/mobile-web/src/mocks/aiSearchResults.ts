export interface AiSearchResult {
  id: string;
  sellerName: string;
  sellerVerified: boolean;
  productName: string;
  category: string;
  description: string;
  price: number | null;
  rating: number;
  city: string;
  image: string | null;
}

export const AI_SEARCH_RESULTS: AiSearchResult[] = [
  {
    id: 'res_1',
    sellerName: 'CreativeStudio Ltda.',
    sellerVerified: true,
    productName: 'Diseño de Logo & Identidad de Marca Premium',
    category: 'diseno',
    description:
      'Diseño conceptual de logotipo para tu negocio. Incluye manual de identidad corporativa, paleta de colores, tipografía, formatos listos para web e impresión, y 3 rondas de ajustes.',
    price: null,
    rating: 4.9,
    city: 'Medellín',
    image: null,
  },
  {
    id: 'res_2',
    sellerName: 'PixelCraft Agency',
    sellerVerified: false,
    productName: 'Pack de Logotipo Expreso para Startups',
    category: 'diseno',
    description:
      'Logotipo profesional rápido diseñado en menos de 5 días hábiles. Ideal para emprendedores y proyectos en etapas tempranas que necesitan lanzar rápido.',
    price: 450000,
    rating: 4.5,
    city: 'Bogotá',
    image: null,
  },
  {
    id: 'res_3',
    sellerName: 'Laura Diseña',
    sellerVerified: true,
    productName: 'Ilustración y Rediseño de Isotipos Corporativos',
    category: 'diseno',
    description:
      'Especialista en rediseño y modernización de isotipos existentes. Refina tu imagen de marca conservando tu esencia original y valores corporativos.',
    price: null,
    rating: 4.8,
    city: 'Cali',
    image: null,
  },
];
