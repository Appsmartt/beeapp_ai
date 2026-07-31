import type { ElementType } from 'react';
import { Inbox, MailWarning, Send, FileEdit, Star, Trash2, Archive } from 'lucide-react';
import type { EmailItem, MailFolder } from '@/mocks/emails';

/** Carpetas del sidebar izquierdo del módulo de Correo, en orden */
export const MAIL_FOLDERS: { key: MailFolder; label: string; icon: ElementType }[] = [
  { key: 'inbox', label: 'Recibidos', icon: Inbox },
  { key: 'unread', label: 'No leídos', icon: MailWarning },
  { key: 'sent', label: 'Enviados', icon: Send },
  { key: 'drafts', label: 'Borradores', icon: FileEdit },
  { key: 'starred', label: 'Favoritos', icon: Star },
  { key: 'trash', label: 'Eliminados', icon: Trash2 },
  { key: 'archive', label: 'Archivados', icon: Archive },
];

/**
 * Un correo pertenece a la vista si coincide la carpeta real; `unread` y
 * `starred` son vistas transversales sobre lo que no está en la papelera.
 */
export const matchesFolder = (email: EmailItem, folder: MailFolder) => {
  if (folder === 'unread') return email.unread && email.folder === 'inbox';
  if (folder === 'starred') return email.starred && email.folder !== 'trash';
  return email.folder === folder;
};

/** Correos sin leer de una carpeta, respetando el filtro de cuenta */
export const unreadIn = (emails: EmailItem[], folder: MailFolder, account: string | null) =>
  emails.filter(
    (email) =>
      (!account || email.account === account) && matchesFolder(email, folder) && email.unread
  ).length;
