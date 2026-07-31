/** Sesión de BeeApp Web vinculada a la cuenta (mock en memoria) */
export interface LinkedDevice {
  id: string;
  /** Navegador y sistema operativo, tal como se muestran en la lista */
  name: string;
  lastSeen: string;
}

export const LINKED_DEVICES: LinkedDevice[] = [
  { id: 'dev-1', name: 'Chrome - Windows', lastSeen: 'Última conexión: hoy a las 10:30 AM' },
  { id: 'dev-2', name: 'Safari - macOS', lastSeen: 'Última conexión: ayer' },
];
