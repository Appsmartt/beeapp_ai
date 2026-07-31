import { FileText, Folder, FileImage, FileVideo, File, Calendar, Video, Lock, Bot } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { OverviewEntry } from './OverviewSection';
import { MOCK_EMAILS } from '../../mocks/emails';
import { MOCK_CHATS } from '../../mocks/chats';
import { MOCK_NOTES } from '../../mocks/notes';
import { getItems, StorageItem } from '../../stores/storageStore';
import { getEvents, TODAY_STR, TOMORROW_STR } from '../../stores/calendarStore';
import { isProtected } from '../../stores/pinStore';

/** Where an overview item opens when tapped */
export interface OverviewTarget {
  pathname: string;
  params?: Record<string, string>;
}

export interface OverviewRow {
  entry: OverviewEntry;
  target: OverviewTarget;
}

const PREVIEW_COUNT = 5;

const initialsOf = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

const FILE_ICONS: Record<StorageItem['type'], typeof File> = {
  folder: Folder,
  pdf: FileText,
  image: FileImage,
  video: FileVideo,
  doc: File,
};

const FILE_LABELS: Record<StorageItem['type'], string> = {
  folder: 'Carpeta',
  pdf: 'Documento PDF',
  image: 'Imagen',
  video: 'Video',
  doc: 'Documento',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "Hoy" / "Mañana" / "28 Jul" from a YYYY-MM-DD mock date */
const eventDayLabel = (date: string) => {
  if (date === TODAY_STR) return 'Hoy';
  if (date === TOMORROW_STR) return 'Mañana';
  const [, month, day] = date.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ''}`.trim();
};

const mailRows = (): OverviewRow[] =>
  MOCK_EMAILS.slice(0, PREVIEW_COUNT).map((email) => ({
    entry: {
      key: email.id,
      initials: initialsOf(email.senderName),
      avatarColor: email.initialsColor,
      title: email.subject,
      subtitle: email.senderName,
      timestamp: email.isRead ? email.date : email.time,
      unread: !email.isRead,
      verified: email.senderVerified,
    },
    target: { pathname: '/(main)/mail/detail', params: { id: email.id } },
  }));

const chatRows = (): OverviewRow[] =>
  MOCK_CHATS.slice(0, PREVIEW_COUNT).map((chat) => {
    const chatLocked = isProtected(chat.id);
    return {
      entry: {
        // The assistant keeps its logo avatar here too
        initials: chat.isAI ? undefined : initialsOf(chat.name),
        icon: chat.isAI ? Bot : undefined,
        iconColor: chat.isAI ? colors.brand.primary : colors.neutral.gray600,
        key: chat.id,
        avatarColor: chat.isAI ? colors.brand.primary + '15' : colors.neutral.gray100,
        title: chat.name,
        subtitle: chatLocked ? 'Chat protegido' : chat.lastMessage,
        timestamp: chat.time,
        unread: chat.unreadCount > 0,
        verified: chat.verified,
        locked: chatLocked,
      },
      target: {
        pathname: '/(main)/chat/conversation',
        params: {
          id: chat.id,
          name: chat.name,
          isGroup: String(chat.isGroup),
          online: String(!!chat.online),
        },
      },
    };
  });

const noteRows = (): OverviewRow[] =>
  MOCK_NOTES.slice(0, PREVIEW_COUNT).map((note) => {
    // A protected note reveals nothing here either: no title, no preview
    const locked = note.isProtected || isProtected(note.id);
    return {
      entry: {
        key: note.id,
        icon: locked ? Lock : FileText,
        iconColor: colors.neutral.gray600,
        avatarColor: colors.neutral.gray100,
        title: locked ? 'Nota protegida' : note.title,
        subtitle: locked ? 'Desbloquea para ver el contenido' : note.preview,
        timestamp: note.date,
        // No inline lock: the avatar already is the padlock
      },
      target: { pathname: '/(main)/notes/edit', params: { id: note.id } },
    };
  });

const fileRows = (): OverviewRow[] =>
  getItems()
    .slice(0, PREVIEW_COUNT)
    .map((item) => ({
      entry: {
        key: item.id,
        icon: FILE_ICONS[item.type],
        iconColor: colors.neutral.gray600,
        avatarColor: colors.neutral.gray100,
        title: item.name,
        subtitle:
          item.type === 'folder'
            ? `${FILE_LABELS.folder} · ${item.itemCount ?? 0} ${item.itemCount === 1 ? 'elemento' : 'elementos'}`
            : `${FILE_LABELS[item.type]}${item.size ? ` · ${item.size}` : ''}`,
        timestamp: item.updatedAt,
        locked: isProtected(item.id),
      },
      // Folders live inside the storage screen, so they open the module root
      target:
        item.type === 'folder'
          ? { pathname: '/(main)/storage' }
          : { pathname: '/(main)/storage/preview', params: { id: item.id } },
    }));

const calendarRows = (): OverviewRow[] =>
  getEvents()
    .filter((event) => event.date >= TODAY_STR)
    .sort((a, b) => (a.date + a.timeStart).localeCompare(b.date + b.timeStart))
    .slice(0, PREVIEW_COUNT)
    .map((event) => ({
      entry: {
        key: event.id,
        icon: event.isVirtual ? Video : Calendar,
        iconColor: colors.neutral.gray600,
        avatarColor: colors.neutral.gray100,
        title: event.title,
        subtitle: `${event.timeStart} - ${event.timeEnd} · ${event.isVirtual ? 'Virtual' : event.location ?? 'Presencial'}`,
        timestamp: eventDayLabel(event.date),
      },
      target: { pathname: '/(main)/calendar/detail', params: { id: event.id } },
    }));

const BUILDERS: Record<string, () => OverviewRow[]> = {
  mail: mailRows,
  chat: chatRows,
  notes: noteRows,
  files: fileRows,
  calendar: calendarRows,
};

/** Last items of a module, already mapped to the overview row shape */
export const getOverviewRows = (moduleId: string): OverviewRow[] => BUILDERS[moduleId]?.() ?? [];
