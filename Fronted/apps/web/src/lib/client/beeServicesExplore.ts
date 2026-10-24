export type BeeServicesQuickActionId = 'requests' | 'orders' | 'reservations';

export interface BeeServicesQuickAction {
  id: BeeServicesQuickActionId;
  label: string;
}

export const BEE_SERVICES_QUICK_ACTIONS: BeeServicesQuickAction[] = [
  { id: 'requests', label: 'Solicitudes' },
  { id: 'orders', label: 'Órdenes' },
  { id: 'reservations', label: 'Reservas' },
];
