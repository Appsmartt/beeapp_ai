import type {
  CommercialModality,
  CommercialOfferType,
} from '@beeapp/shared-types';

export const COMMERCIAL_OFFER_TYPE_OPTIONS: Array<{
  value: CommercialOfferType;
  label: string;
}> = [
  {
    value: 'products',
    label: 'Productos',
  },
  {
    value: 'services',
    label: 'Servicios',
  },
  {
    value: 'mixed',
    label: 'Productos y servicios',
  },
];

export const COMMERCIAL_MODALITY_OPTIONS: Array<{
  value: CommercialModality;
  label: string;
}> = [
  {
    value: 'at_establishment',
    label: 'En establecimiento',
  },
  {
    value: 'in_person',
    label: 'Presencial',
  },
  {
    value: 'virtual',
    label: 'Virtual',
  },
  {
    value: 'home_visit',
    label: 'Visita a domicilio',
  },
  {
    value: 'delivery',
    label: 'Entrega a domicilio',
  },
  {
    value: 'pickup',
    label: 'Recoger en negocio',
  },
  {
    value: 'phone_call',
    label: 'Llamada telefónica',
  },
  {
    value: 'buddy_chat',
    label: 'Chat Buddy',
  },
];

export const COMMERCIAL_ORDERING_OPTIONS = [
  {
    value: 'recent',
    label: 'Más recientes',
  },
  {
    value: 'name',
    label: 'Nombre',
  },
] as const;

export function getCommercialOfferTypeLabel(
  value: CommercialOfferType,
): string {
  return (
    COMMERCIAL_OFFER_TYPE_OPTIONS.find(
      (item) => item.value === value,
    )?.label
    || value
  );
}

export function getCommercialModalityLabel(
  value: CommercialModality,
): string {
  return (
    COMMERCIAL_MODALITY_OPTIONS.find(
      (item) => item.value === value,
    )?.label
    || value
  );
}
