import type { ElementType } from 'react';
import {
  AlertOctagon,
  Archive,
  FileEdit,
  Inbox,
  Mail,
  Send,
  Star,
  Trash2,
} from 'lucide-react';

import type {
  MailListItemModel,
  MailViewFolder,
} from './mailTypes';

export const MAIL_FOLDERS: {
  key: MailViewFolder;
  label: string;
  icon: ElementType;
}[] = [
  {
    key: 'inbox',
    label: 'Recibidos',
    icon: Inbox,
  },
  {
    key: 'unread',
    label: 'No leídos',
    icon: Mail,
  },
  {
    key: 'sent',
    label: 'Enviados',
    icon: Send,
  },
  {
    key: 'drafts',
    label: 'Borradores',
    icon: FileEdit,
  },
  {
    key: 'archived',
    label: 'Archivados',
    icon: Archive,
  },
  {
    key: 'starred',
    label: 'Importantes',
    icon: Star,
  },
  {
    key: 'spam',
    label: 'Spam',
    icon: AlertOctagon,
  },
  {
    key: 'trash',
    label: 'Papelera',
    icon: Trash2,
  },
];

export function getMailFolderLabel(
  folder: MailViewFolder,
): string {
  return MAIL_FOLDERS.find(
    (item) => item.key === folder,
  )?.label || 'Correo';
}

export function getEmptyStateCopy(
  activeFolder: MailViewFolder,
  hasAccountFilter: boolean,
): {
  title: string;
  description: string;
} {
  if (hasAccountFilter) {
    return {
      title: 'Sin correos en esta cuenta',
      description: (
        'No hay correos que coincidan con los filtros '
        + 'seleccionados para esta cuenta.'
      ),
    };
  }

  switch (activeFolder) {
    case 'unread':
      return {
        title: 'No tienes correos sin leer',
        description: (
          'Cuando recibas un correo nuevo aparecerá '
          + 'en esta sección.'
        ),
      };

    case 'starred':
      return {
        title: 'No tienes correos importantes',
        description: (
          'Marca correos como importantes para '
          + 'encontrarlos rápidamente aquí.'
        ),
      };

    case 'sent':
      return {
        title: 'No tienes correos enviados',
        description: (
          'Los correos enviados desde tus cuentas '
          + 'conectadas aparecerán aquí.'
        ),
      };

    case 'drafts':
      return {
        title: 'No tienes borradores',
        description: (
          'Los correos que guardes como borrador '
          + 'aparecerán aquí.'
        ),
      };

    case 'archived':
      return {
        title: 'No tienes correos archivados',
        description: (
          'Los correos que archives aparecerán '
          + 'en esta carpeta.'
        ),
      };

    case 'spam':
      return {
        title: 'No tienes correos en spam',
        description: (
          'Los mensajes marcados como spam por Google '
          + 'u Outlook aparecerán aquí.'
        ),
      };

    case 'trash':
      return {
        title: 'La papelera está vacía',
        description: (
          'Los correos que elimines aparecerán '
          + 'temporalmente aquí.'
        ),
      };

    default:
      return {
        title: 'Bandeja vacía',
        description: (
          'No hay correos en esta carpeta que coincidan '
          + 'con los filtros activos.'
        ),
      };
  }
}

export function getVisibleUnreadCount(
  messages: MailListItemModel[],
  folder: MailViewFolder,
): number {
  if (folder === 'unread') {
    return messages.filter(
      (message) => !message.isRead,
    ).length;
  }

  if (folder === 'inbox') {
    return messages.filter(
      (message) => !message.isRead,
    ).length;
  }

  return 0;
}