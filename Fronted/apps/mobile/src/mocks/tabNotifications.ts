/**
 * Mock notifications for the floating tab bar.
 * "general" = everything that is NOT chat/calls (Notificaciones button).
 * "chat" = chat messages and calls only (Chats y llamadas button).
 *
 * Each item carries a target so tapping it in the popover opens the
 * corresponding element inside the embedded module (never a route change
 * from Home). Ids match the existing mock data.
 */

export type TickerKind =
  | 'mail'
  | 'event'
  | 'storage'
  | 'note'
  | 'doc'
  | 'message'
  | 'call'
  | 'group';

export interface TickerTarget {
  /** Module id from MODULES_POOL ('mail' | 'notes' | 'contacts' | 'files' | 'calendar' | 'chat') */
  module: string;
  /** Embedded registry path of the screen to open */
  path: string;
  params?: Record<string, string>;
}

export interface TickerItem {
  id: string;
  kind: TickerKind;
  text: string;
  time: string;
  target: TickerTarget;
}

export const GENERAL_NOTIFICATIONS: TickerItem[] = [
  {
    id: 'g1',
    kind: 'mail',
    text: 'Nuevo correo de Eduardo Torres',
    time: '09:15',
    target: { module: 'mail', path: '/(main)/mail/detail', params: { id: 'm1' } },
  },
  {
    id: 'g2',
    kind: 'event',
    text: '"Sincronización semanal" en 30 min',
    time: '13:30',
    target: { module: 'calendar', path: '/(main)/calendar/detail', params: { id: 'e1' } },
  },
  {
    id: 'g3',
    kind: 'storage',
    text: 'Te quedan 6.8 GB de almacenamiento',
    time: 'Hoy',
    target: { module: 'files', path: '/(main)/storage' },
  },
  {
    id: 'g4',
    kind: 'note',
    text: 'Nota "Ideas campaña de Marketing" actualizada',
    time: 'Ayer',
    target: { module: 'notes', path: '/(main)/notes/edit', params: { id: 'n1' } },
  },
  {
    id: 'g5',
    kind: 'doc',
    text: 'Documento "Contrato_2026" firmado',
    time: 'Ayer',
    target: { module: 'files', path: '/(main)/storage' },
  },
];

export const CHAT_NOTIFICATIONS: TickerItem[] = [
  {
    id: 'c1',
    kind: 'message',
    text: 'Nuevo mensaje de Mariana Gómez',
    time: '13:40',
    target: {
      module: 'chat',
      path: '/(main)/chat/conversation',
      params: { id: '3', name: 'Mariana Gómez', isGroup: 'false', online: 'false' },
    },
  },
  {
    id: 'c2',
    kind: 'call',
    text: 'Llamada perdida de Carlos Mendoza',
    time: '14:32',
    target: {
      module: 'chat',
      path: '/(main)/chat/conversation',
      params: { id: '1', name: 'Carlos Mendoza', isGroup: 'false', online: 'true' },
    },
  },
  {
    id: 'c3',
    kind: 'group',
    text: '2 mensajes en Equipo de Desarrollo',
    time: '12:15',
    target: {
      module: 'chat',
      path: '/(main)/chat/conversation',
      params: { id: '2', name: 'Equipo de Desarrollo', isGroup: 'true', online: 'false' },
    },
  },
];
