'use client';

import type { EmailItem, MailFolder } from '@/mocks/emails';
import IconRailButton from '../IconRailButton';
import { MAIL_FOLDERS, unreadIn } from './mailFolders';

interface MailFolderRailProps {
  folder: MailFolder;
  onSelectFolder: (folder: MailFolder) => void;
  emails: EmailItem[];
  /** Cuenta activa, o null si están todas */
  account: string | null;
}

/**
 * Barra vertical de 56px pegada al borde izquierdo del módulo de Correo,
 * con la misma anatomía que la de Chat. Solo en desktop.
 */
export default function MailFolderRail({
  folder,
  onSelectFolder,
  emails,
  account,
}: MailFolderRailProps) {
  return (
    <nav className="hidden lg:flex w-14 shrink-0 bg-white border-r border-neutral-200 flex-col items-center py-3 gap-1">
      {MAIL_FOLDERS.map((option) => (
        <IconRailButton
          key={option.key}
          label={option.label}
          icon={option.icon}
          tooltipSide="right"
          isActive={folder === option.key}
          badge={
            option.key === 'inbox' || option.key === 'unread'
              ? unreadIn(emails, option.key, account)
              : undefined
          }
          onClick={() => onSelectFolder(option.key)}
        />
      ))}
    </nav>
  );
}
