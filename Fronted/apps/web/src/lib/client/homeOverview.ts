import {
  getAssistantSettings,
  listAssistantMessages,
  getCurrentWebCalendarBootstrap,
  getCurrentWebNotifications,
  getCurrentWebStorageFiles,
  getCurrentWebStorageSummary,
  getMailMessages,
} from '@beeapp/api-client';
import type {
  CalendarEvent,
  StorageFile,
  StorageSummary,
} from '@beeapp/shared-types';

import type { CalendarEventItem } from './calendarEvents';
import {
  loadInbox,
  loadOwnedBusinesses,
  loadOverviewEmails,
  loadOverviewNotes,
} from './liveData';
import { webNotesApi } from '@/components/client/notes/webNotesApi';
import { AI_ASSISTANT_NAME } from './chats';
import { getWebAuth } from './webAuth';

export type HomeOverviewBuddyServices = {
  businessCount: number;
  productCount: number;
  serviceCount: number;
};

export type HomeOverviewMail = {
  unreadCount: number;
  attachmentCount: number;
  starredCount: number;
  latestPreview: string | null;
};

export type HomeOverviewChat = {
  conversationCount: number;
  unreadCount: number;
  latestPreview: string | null;
};

export type HomeOverviewCalendar = {
  todayCount: number;
  upcomingMeetingLabel: string | null;
  footerPreview: string | null;
  footerHasVideo: boolean;
};

export type HomeOverviewNotes = {
  totalCount: number;
  latestTitle: string | null;
};

export type HomeOverviewAssistant = {
  name: string;
  statusLabel: string;
  isOnline: boolean;
  lastMessagePreview: string | null;
  unreadNotifications: number;
};

export type HomeOverviewStorage = {
  summary: StorageSummary | null;
  recentFiles: StorageFile[];
  unreadNotifications: number;
};

export type HomeOverview = {
  buddyServices: HomeOverviewBuddyServices;
  mail: HomeOverviewMail;
  chat: HomeOverviewChat;
  calendar: HomeOverviewCalendar;
  notes: HomeOverviewNotes;
  assistant: HomeOverviewAssistant;
  storage: HomeOverviewStorage;
};

function clock(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameCalendarDay(
  left: Date,
  right: Date,
): boolean {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function meetingUrlFromEvent(
  event: CalendarEvent,
): string | undefined {
  const primaryConference = event.conferences?.find(
    (conference) => conference.is_primary,
  );

  if (primaryConference?.join_url) {
    return primaryConference.join_url;
  }

  const conference = event.conferences?.find(
    (item) => Boolean(item.join_url),
  );

  if (conference?.join_url) {
    return conference.join_url;
  }

  return event.location_maps_url || undefined;
}

function formatUpcomingMeetingLabel(
  startsAt: string,
): string | null {
  const start = new Date(startsAt);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const diffMs = start.getTime() - Date.now();

  if (diffMs < 0) {
    return null;
  }

  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes <= 120) {
    return diffMinutes <= 1
      ? 'Reunión en 1 min'
      : `Reunión en ${diffMinutes} min`;
  }

  return null;
}

async function loadCalendarOverview(): Promise<HomeOverviewCalendar> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);

  try {
    const response = await getCurrentWebCalendarBootstrap({
      range_start: start.toISOString(),
      range_end: end.toISOString(),
    });

    const events = (response.events || [])
      .map((event) => ({
        rawStartsAt: event.starts_at || '',
        item: {
          id: event.id,
          title: event.title || 'Evento',
          time: clock(event.starts_at),
          type: 'meeting' as const,
          dateStr: event.starts_at || '',
          location: event.location_name || undefined,
          meetUrl: meetingUrlFromEvent(event),
        } satisfies CalendarEventItem,
      }))
      .filter((entry) => entry.rawStartsAt);

    const now = new Date();
    const todayCount = events.filter((entry) => {
      const date = new Date(entry.rawStartsAt);
      return !Number.isNaN(date.getTime()) && isSameCalendarDay(date, now);
    }).length;

    const upcoming = events
      .map((entry) => ({
        ...entry,
        startTime: new Date(entry.rawStartsAt).getTime(),
      }))
      .filter((entry) => entry.startTime >= now.getTime())
      .sort((left, right) => left.startTime - right.startTime)[0];

    if (!upcoming) {
      return {
        todayCount,
        upcomingMeetingLabel: null,
        footerPreview: null,
        footerHasVideo: false,
      };
    }

    return {
      todayCount,
      upcomingMeetingLabel: formatUpcomingMeetingLabel(
        upcoming.rawStartsAt,
      ),
      footerPreview: `${upcoming.item.time} — ${upcoming.item.title}`,
      footerHasVideo: Boolean(upcoming.item.meetUrl),
    };
  } catch {
    return {
      todayCount: 0,
      upcomingMeetingLabel: null,
      footerPreview: null,
      footerHasVideo: false,
    };
  }
}

async function loadMailOverview(): Promise<HomeOverviewMail> {
  try {
    const [emails, inboxResponse] = await Promise.all([
      loadOverviewEmails(),
      getMailMessages({ limit: 100 }),
    ]);

    const messages = inboxResponse.messages || [];
    const unreadCount = messages.filter(
      (message) => !message.is_read,
    ).length;
    const attachmentCount = messages.filter(
      (message) => message.has_attachments,
    ).length;
    const starredCount = messages.filter(
      (message) => message.is_starred,
    ).length;

    const latest = emails[0];

    return {
      unreadCount,
      attachmentCount,
      starredCount,
      latestPreview: latest
        ? `${latest.sender} — ${latest.subject}`
        : null,
    };
  } catch {
    return {
      unreadCount: 0,
      attachmentCount: 0,
      starredCount: 0,
      latestPreview: null,
    };
  }
}

async function loadChatOverview(): Promise<HomeOverviewChat> {
  try {
    const inbox = await loadInbox();
    const unreadCount = inbox.chats.reduce(
      (total, chat) => total + (chat.unreadCount || 0),
      0,
    );
    const latest = inbox.chats[0];

    return {
      conversationCount: inbox.chats.length,
      unreadCount,
      latestPreview: latest
        ? `${latest.name}: ${latest.lastMessage || 'Sin mensajes'}`
        : null,
    };
  } catch {
    return {
      conversationCount: 0,
      unreadCount: 0,
      latestPreview: null,
    };
  }
}

async function loadAssistantOverview(): Promise<HomeOverviewAssistant> {
  try {
    const auth = await getWebAuth();
    const [settingsResponse, messagesResponse, notificationsResponse] =
      await Promise.all([
        getAssistantSettings(auth),
        listAssistantMessages(auth).catch(() => ({ messages: [] })),
        getCurrentWebNotifications({
          unread_only: true,
          limit: 50,
          offset: 0,
        }),
      ]);

    const settings = settingsResponse.settings;
    const messages = messagesResponse.messages || [];
    const last = messages[messages.length - 1];

    return {
      name: settings?.name?.trim() || AI_ASSISTANT_NAME,
      statusLabel: 'En línea',
      isOnline: true,
      lastMessagePreview: last?.content?.trim() || null,
      unreadNotifications: notificationsResponse.unread_count || 0,
    };
  } catch {
    return {
      name: AI_ASSISTANT_NAME,
      statusLabel: 'No disponible',
      isOnline: false,
      lastMessagePreview: null,
      unreadNotifications: 0,
    };
  }
}

async function loadBuddyServicesOverview(): Promise<HomeOverviewBuddyServices> {
  try {
    const businesses = await loadOwnedBusinesses();

    return {
      businessCount: businesses.length,
      productCount: businesses.reduce(
        (total, business) => total + business.products.length,
        0,
      ),
      serviceCount: businesses.reduce(
        (total, business) => total + business.services.length,
        0,
      ),
    };
  } catch {
    return {
      businessCount: 0,
      productCount: 0,
      serviceCount: 0,
    };
  }
}

async function loadNotesOverview(): Promise<HomeOverviewNotes> {
  try {
    const [countResponse, notes] = await Promise.all([
      webNotesApi.getNotes({
        deleted: false,
        is_archived: false,
        limit: 1,
        offset: 0,
      }),
      loadOverviewNotes(),
    ]);

    return {
      totalCount: countResponse.count,
      latestTitle: notes[0]?.title || null,
    };
  } catch {
    return {
      totalCount: 0,
      latestTitle: null,
    };
  }
}

async function loadStorageOverview(): Promise<HomeOverviewStorage> {
  try {
    const [
      summaryResponse,
      filesResponse,
      notificationsResponse,
    ] = await Promise.all([
      getCurrentWebStorageSummary(),
      getCurrentWebStorageFiles({
        status: 'ready',
        scope: 'recent',
        limit: 2,
        offset: 0,
      }),
      getCurrentWebNotifications({
        module: 'storage',
        unread_only: true,
        limit: 1,
        offset: 0,
      }),
    ]);

    return {
      summary: summaryResponse.storage,
      recentFiles: filesResponse.files,
      unreadNotifications: notificationsResponse.unread_count,
    };
  } catch {
    return {
      summary: null,
      recentFiles: [],
      unreadNotifications: 0,
    };
  }
}

export const EMPTY_HOME_OVERVIEW: HomeOverview = {
  buddyServices: {
    businessCount: 0,
    productCount: 0,
    serviceCount: 0,
  },
  mail: {
    unreadCount: 0,
    attachmentCount: 0,
    starredCount: 0,
    latestPreview: null,
  },
  chat: {
    conversationCount: 0,
    unreadCount: 0,
    latestPreview: null,
  },
  calendar: {
    todayCount: 0,
    upcomingMeetingLabel: null,
    footerPreview: null,
    footerHasVideo: false,
  },
  notes: {
    totalCount: 0,
    latestTitle: null,
  },
  assistant: {
    name: AI_ASSISTANT_NAME,
    statusLabel: 'No disponible',
    isOnline: false,
    lastMessagePreview: null,
    unreadNotifications: 0,
  },
  storage: {
    summary: null,
    recentFiles: [],
    unreadNotifications: 0,
  },
};

export async function loadHomeOverview(): Promise<HomeOverview> {
  const [
    buddyServices,
    mail,
    chat,
    calendar,
    notes,
    assistant,
    storage,
  ] = await Promise.all([
    loadBuddyServicesOverview(),
    loadMailOverview(),
    loadChatOverview(),
    loadCalendarOverview(),
    loadNotesOverview(),
    loadAssistantOverview(),
    loadStorageOverview(),
  ]);

  return {
    buddyServices,
    mail,
    chat,
    calendar,
    notes,
    assistant,
    storage,
  };
}
