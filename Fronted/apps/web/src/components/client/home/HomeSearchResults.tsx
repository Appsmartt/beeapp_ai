'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  FileText,
  FolderOpen,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  UserRound,
} from 'lucide-react';
import {
  getCurrentWebCalendarEvents,
  getCurrentWebNotes,
  getCurrentWebStorageFiles,
  getMailMessages,
} from '@beeapp/api-client';
import type {
  CalendarEvent,
  MailMessage,
  Note,
  StorageFile,
} from '@beeapp/shared-types';

import type { ChatItem } from '@/lib/client/chats';
import type { ContactItem } from '@/lib/client/contacts';
import {
  HOME_FILTER_TO_LABEL,
  type HomeContentFilter,
} from './homeSearchFilters';
import {
  homeSearchEmptyCopy,
  normalizeHomeSearchText,
  useHomeSearch,
  type HomeSearchHit,
} from './HomeSearchContext';

type RemoteKind = 'correo' | 'nota' | 'archivo' | 'evento';

function includesKind(
  filter: HomeContentFilter,
  kind: Exclude<HomeContentFilter, 'todos'>,
): boolean {
  return filter === 'todos' || filter === kind;
}

function matchesText(
  query: string,
  ...parts: Array<string | null | undefined>
): boolean {
  const needle = normalizeHomeSearchText(query);
  if (!needle) return true;
  return parts.some((part) => normalizeHomeSearchText(part || '').includes(needle));
}

function senderLabel(message: MailMessage): string {
  return message.sender?.display_name || message.sender?.email || 'Sin remitente';
}

function eventWhen(event: CalendarEvent): string {
  const raw = event.starts_at || event.starts_on;
  if (!raw) return 'Sin fecha';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: event.starts_at ? 'numeric' : undefined,
    minute: event.starts_at ? '2-digit' : undefined,
  });
}

export default function HomeSearchResults({
  chats,
  contacts,
  onOpenChat,
  onOpenContact,
  onOpenRemoteHit,
}: {
  chats: ChatItem[];
  contacts: ContactItem[];
  onOpenChat: (chat: ChatItem) => void;
  onOpenContact: (contact: ContactItem) => void;
  onOpenRemoteHit: (hit: HomeSearchHit) => void;
}) {
  const { filter, query } = useHomeSearch();
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [loading, setLoading] = useState(false);
  const [mails, setMails] = useState<MailMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), 280);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const needle = debouncedQuery.trim();
  const showChats = includesKind(filter, 'chat');
  const showContacts = includesKind(filter, 'contacto');
  const showMail = includesKind(filter, 'correo');
  const showNotes = includesKind(filter, 'nota');
  const showFiles = includesKind(filter, 'archivo');
  const showEvents = includesKind(filter, 'evento');

  useEffect(() => {
    let cancelled = false;
    const remote: RemoteKind[] = [];
    if (showMail) remote.push('correo');
    if (showNotes) remote.push('nota');
    if (showFiles) remote.push('archivo');
    if (showEvents) remote.push('evento');

    if (remote.length === 0) {
      setMails([]);
      setNotes([]);
      setFiles([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const search = needle || undefined;
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 6);
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 6);

    void Promise.all([
      showMail
        ? getMailMessages({ search, folder: 'inbox', limit: 25 }).then((response) => response.messages)
        : Promise.resolve([] as MailMessage[]),
      showNotes
        ? getCurrentWebNotes({ search, limit: 25, deleted: false }).then((response) => response.notes)
        : Promise.resolve([] as Note[]),
      showFiles
        ? getCurrentWebStorageFiles({ search, status: 'ready', limit: 25 }).then((response) => response.files)
        : Promise.resolve([] as StorageFile[]),
      showEvents
        ? getCurrentWebCalendarEvents({
          search,
          range_start: rangeStart.toISOString(),
          range_end: rangeEnd.toISOString(),
          limit: 25,
        }).then((response) => response.events)
        : Promise.resolve([] as CalendarEvent[]),
    ]).then(([nextMails, nextNotes, nextFiles, nextEvents]) => {
      if (cancelled) return;
      setMails(nextMails);
      setNotes(nextNotes);
      setFiles(nextFiles);
      setEvents(nextEvents);
    }).catch(() => {
      if (cancelled) return;
      setMails([]);
      setNotes([]);
      setFiles([]);
      setEvents([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [needle, showEvents, showFiles, showMail, showNotes]);

  const chatHits = useMemo(() => (
    showChats
      ? chats.filter((chat) => (
        !chat.isArchived
        && matchesText(query, chat.name, chat.lastMessage)
      ))
      : []
  ), [chats, query, showChats]);

  const contactHits = useMemo(() => (
    showContacts
      ? contacts.filter((contact) => (
        matchesText(query, contact.name, contact.profession, contact.phone, contact.email)
      ))
      : []
  ), [contacts, query, showContacts]);

  const total = chatHits.length + contactHits.length + mails.length + notes.length + files.length + events.length;
  const emptyCopy = needle ? homeSearchEmptyCopy(needle) : null;
  const scopeLabel = filter === 'todos'
    ? 'Todo Buddy'
    : HOME_FILTER_TO_LABEL[filter];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F4FB]">
      <header className="shrink-0 border-b border-[#E7DDF2] bg-white px-6 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7427D5]">
          Resultados · {scopeLabel}
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#261743]">
          {needle ? `“${needle.trim()}”` : `Explorar ${scopeLabel.toLowerCase()}`}
        </h2>
        <p className="mt-1 text-sm text-[#786593]">
          {loading
            ? 'Buscando en tu espacio…'
            : total === 1
              ? '1 coincidencia'
              : `${total} coincidencias`}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 pb-28">
        {loading ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#E7D9F0] bg-white px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#7427D5]" />
            <p className="text-sm font-semibold text-[#5C4A78]">Cargando coincidencias…</p>
          </div>
        ) : null}

        {!loading && total === 0 && emptyCopy ? (
          <div className="rounded-2xl border border-[#E7D9F0] bg-white px-6 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-[#7427D5]" />
            <h3 className="mt-3 text-base font-extrabold text-[#432064]">{emptyCopy.title}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#786593]">{emptyCopy.description}</p>
          </div>
        ) : null}

        <div className="space-y-6">
          {showChats && (filter !== 'todos' || chatHits.length > 0) ? (
            <ResultSection
              icon={<MessageCircle className="h-4 w-4" />}
              title="Chats"
              count={chatHits.length}
              empty="No hay chats con ese texto."
            >
              {chatHits.map((chat) => (
                <ResultButton
                  key={chat.id}
                  title={chat.name}
                  subtitle={chat.lastMessage || 'Sin mensajes'}
                  meta={chat.time}
                  onClick={() => onOpenChat(chat)}
                />
              ))}
            </ResultSection>
          ) : null}

          {showContacts && (filter !== 'todos' || contactHits.length > 0) ? (
            <ResultSection
              icon={<UserRound className="h-4 w-4" />}
              title="Contactos"
              count={contactHits.length}
              empty="No hay contactos con ese texto."
            >
              {contactHits.map((contact) => (
                <ResultButton
                  key={contact.id}
                  title={contact.name}
                  subtitle={contact.profession || contact.email || contact.phone || 'Contacto'}
                  onClick={() => onOpenContact(contact)}
                />
              ))}
            </ResultSection>
          ) : null}

          {showMail && (filter !== 'todos' || mails.length > 0) ? (
            <ResultSection
              icon={<Mail className="h-4 w-4" />}
              title="Correos"
              count={mails.length}
              empty="No hay correos con ese texto."
            >
              {mails.map((message) => (
                <ResultButton
                  key={message.id}
                  title={message.subject || '(Sin asunto)'}
                  subtitle={`${senderLabel(message)}${message.snippet ? ` · ${message.snippet}` : ''}`}
                  onClick={() => onOpenRemoteHit({ kind: 'correo', id: message.id })}
                />
              ))}
            </ResultSection>
          ) : null}

          {showNotes && (filter !== 'todos' || notes.length > 0) ? (
            <ResultSection
              icon={<FileText className="h-4 w-4" />}
              title="Notas"
              count={notes.length}
              empty="No hay notas con ese texto."
            >
              {notes.map((note) => (
                <ResultButton
                  key={note.id}
                  title={note.title || 'Nota sin título'}
                  subtitle="Nota"
                  onClick={() => onOpenRemoteHit({ kind: 'nota', id: note.id })}
                />
              ))}
            </ResultSection>
          ) : null}

          {showFiles && (filter !== 'todos' || files.length > 0) ? (
            <ResultSection
              icon={<FolderOpen className="h-4 w-4" />}
              title="Archivos"
              count={files.length}
              empty="No hay archivos con ese texto."
            >
              {files.map((file) => (
                <ResultButton
                  key={file.id}
                  title={file.display_name || file.original_name}
                  subtitle={file.extension ? file.extension.toUpperCase() : 'Archivo'}
                  onClick={() => onOpenRemoteHit({ kind: 'archivo', id: file.id })}
                />
              ))}
            </ResultSection>
          ) : null}

          {showEvents && (filter !== 'todos' || events.length > 0) ? (
            <ResultSection
              icon={<CalendarDays className="h-4 w-4" />}
              title="Agenda"
              count={events.length}
              empty="No hay eventos con ese texto."
            >
              {events.map((event) => (
                <ResultButton
                  key={event.id}
                  title={event.title}
                  subtitle={[eventWhen(event), event.location_name].filter(Boolean).join(' · ')}
                  onClick={() => onOpenRemoteHit({ kind: 'evento', id: event.id })}
                />
              ))}
            </ResultSection>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ResultSection({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-[#5E1ABF]">
        {icon}
        <h3 className="text-sm font-extrabold text-[#261743]">{title}</h3>
        <span className="text-xs font-semibold text-[#8A72B2]">{count}</span>
      </div>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#E7D9F0] bg-white/70 px-4 py-3 text-sm text-[#8A72B2]">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function ResultButton({
  title,
  subtitle,
  meta,
  onClick,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#E7D9F0] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#C9B3E6] hover:bg-[#FCFAFD]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#261743]">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#786593]">{subtitle}</span>
      </span>
      {meta ? <span className="shrink-0 text-[11px] text-[#8A72B2]">{meta}</span> : null}
    </button>
  );
}
