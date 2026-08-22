'use client';

import type {
  MailListItemModel,
  MailViewFolder,
} from './mailTypes';
import IconRailButton from '../IconRailButton';
import ModuleNotificationBell from '../ModuleNotificationBell';
import {
  getVisibleUnreadCount,
  MAIL_FOLDERS,
} from './mailFolders';

interface MailFolderRailProps {
  folder: MailViewFolder;
  onSelectFolder: (folder: MailViewFolder) => void;
  messages: MailListItemModel[];
}

export default function MailFolderRail({
  folder,
  onSelectFolder,
  messages,
}: MailFolderRailProps) {
  return (
    <nav className="hidden w-14 shrink-0 flex-col items-center justify-between border-r border-neutral-200 bg-white py-3 lg:flex">
      <div className="flex w-full flex-col items-center gap-1">
        {MAIL_FOLDERS.map((option) => (
          <IconRailButton
            key={option.key}
            label={option.label}
            icon={option.icon}
            tooltipSide="right"
            isActive={folder === option.key}
            badge={
              option.key === 'inbox'
              || option.key === 'unread'
                ? getVisibleUnreadCount(
                  messages,
                  option.key,
                )
                : undefined
            }
            onClick={() => onSelectFolder(option.key)}
          />
        ))}
      </div>

      <div className="mt-auto pt-2">
        <ModuleNotificationBell moduleId="mail" />
      </div>
    </nav>
  );
}