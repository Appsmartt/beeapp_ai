export type BeeServicesQuickActionId =
    | 'requests'
    | 'orders'
    | 'reservations';

export type BeeServicesCategoryIcon =
    | 'briefcase'
    | 'utensils'
    | 'scissors'
    | 'gavel';

export interface BeeServicesQuickAction {
    id: BeeServicesQuickActionId;
    label: string;
}

export interface BeeServicesCategory {
    id: string;
    title: string;
    subtitle: string;
    icon: BeeServicesCategoryIcon;
}

export const BEE_SERVICES_QUICK_ACTIONS: BeeServicesQuickAction[] = [
    {
        id: 'requests',
        label: 'Solicitudes',
    },
    {
        id: 'orders',
        label: 'Órdenes',
    },
    {
        id: 'reservations',
        label: 'Reservas',
    },
];

export const BEE_SERVICES_POPULAR_CATEGORIES: BeeServicesCategory[] = [
    {
        id: 'technicians',
        title: 'Técnicos',
        subtitle: 'Arreglos del hogar',
        icon: 'briefcase',
    },
    {
        id: 'food',
        title: 'Comida',
        subtitle: 'Delivery y locales',
        icon: 'utensils',
    },
    {
        id: 'beauty',
        title: 'Belleza',
        subtitle: 'Estética y uñas',
        icon: 'scissors',
    },
    {
        id: 'legal',
        title: 'Legal',
        subtitle: 'Asesoría jurídica',
        icon: 'gavel',
    },
];