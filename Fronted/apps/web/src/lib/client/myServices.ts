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

export function formatPrice(price: string | number): string {
  const amount = typeof price === 'number' ? price : Number(String(price).replace(/[^\d.-]/g, ''));

  if (!Number.isFinite(amount)) {
    return String(price);
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
