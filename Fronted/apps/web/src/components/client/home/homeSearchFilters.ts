import type { ModuleKey } from '@/components/client/modules';

export type HomeContentFilter =
  | 'todos'
  | 'correo'
  | 'chat'
  | 'nota'
  | 'contacto'
  | 'archivo'
  | 'evento';

export const HOME_FILTER_LABELS = [
  'Todos',
  'Correos',
  'Chats',
  'Notas',
  'Contactos',
  'Archivos',
  'Agenda',
] as const;

export type HomeFilterLabel = (typeof HOME_FILTER_LABELS)[number];

export const LABEL_TO_HOME_FILTER: Record<HomeFilterLabel, HomeContentFilter> = {
  Todos: 'todos',
  Correos: 'correo',
  Chats: 'chat',
  Notas: 'nota',
  Contactos: 'contacto',
  Archivos: 'archivo',
  Agenda: 'evento',
};

export const HOME_FILTER_TO_LABEL: Record<HomeContentFilter, HomeFilterLabel> = {
  todos: 'Todos',
  correo: 'Correos',
  chat: 'Chats',
  nota: 'Notas',
  contacto: 'Contactos',
  archivo: 'Archivos',
  evento: 'Agenda',
};

export const HOME_FILTER_TO_MODULE: Record<
  Exclude<HomeContentFilter, 'todos'>,
  ModuleKey
> = {
  correo: 'mail',
  chat: 'chat',
  contacto: 'chat',
  nota: 'notes',
  archivo: 'storage',
  evento: 'calendar',
};
