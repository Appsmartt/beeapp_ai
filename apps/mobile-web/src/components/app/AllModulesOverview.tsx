'use client';

import {
  Mail,
  FileText,
  MessageCircle,
  Users,
  FolderOpen,
  Calendar,
  ChevronRight,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { ModuleKey } from './ModuleChipRow';
import { MOCK_EMAILS } from '@/mocks/emails';
import { MOCK_NOTES } from '@/mocks/notes';
import { MOCK_CHATS } from '@/mocks/chats';
import { MOCK_CONTACTS } from '@/mocks/contacts';
import { MOCK_STORAGE_ITEMS } from '@/mocks/storageItems';
import { MOCK_CALENDAR_EVENTS } from '@/mocks/calendarEvents';

interface AllModulesOverviewProps {
  onSelectModule: (moduleKey: ModuleKey) => void;
}

export default function AllModulesOverview({ onSelectModule }: AllModulesOverviewProps) {
  return (
    <div className="p-4 space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 md:gap-4 pb-24">
      
      {/* SECTION: CORREOS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <Mail className="w-5 h-5" />
            <h2 className="font-semibold text-sm text-neutral-900">Correos</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectModule('mail')}
            className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {MOCK_EMAILS.slice(0, 5).map((email) => (
            <div key={email.id} className="py-3 flex items-start gap-3 hover:bg-neutral-50/60 px-1 transition-colors">
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                {email.sender.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {email.sender}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                    {email.timestamp}
                  </span>
                </div>
                <p className="text-xs text-neutral-800 font-normal truncate mt-0.5">
                  {email.subject}
                </p>
                <p className="text-[11px] text-neutral-500 font-normal truncate">
                  {email.preview}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: CHATS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <MessageCircle className="w-5 h-5" />
            <h2 className="font-semibold text-sm text-neutral-900">Chats</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectModule('chat')}
            className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {MOCK_CHATS.slice(0, 5).map((chat) => (
            <div key={chat.id} className="py-3 flex items-center gap-3 hover:bg-neutral-50/60 px-1 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                chat.isAi ? 'bg-brand-primary text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {chat.isAi ? 'IA' : chat.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-xs text-neutral-900 truncate">
                      {chat.name}
                    </span>
                    {chat.verified && <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                    {chat.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                  {chat.isProtected ? (
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Lock className="w-3 h-3" /> Chat protegido
                    </span>
                  ) : (
                    chat.preview
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: NOTAS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <FileText className="w-5 h-5" />
            <h2 className="font-semibold text-sm text-neutral-900">Notas</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectModule('notes')}
            className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {MOCK_NOTES.slice(0, 5).map((note) => (
            <div key={note.id} className="py-3 flex items-start gap-3 hover:bg-neutral-50/60 px-1 transition-colors">
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                {note.isProtected ? <Lock className="w-4 h-4 text-brand-primary" /> : <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {note.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                    {note.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                  {note.preview}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: CONTACTOS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <Users className="w-5 h-5" />
            <h2 className="font-semibold text-sm text-neutral-900">Contactos</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectModule('contacts')}
            className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {MOCK_CONTACTS.slice(0, 5).map((contact) => (
            <div key={contact.id} className="py-3 flex items-center gap-3 hover:bg-neutral-50/60 px-1 transition-colors">
              <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center shrink-0">
                {contact.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {contact.name}
                  </span>
                  {contact.verified && <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                  {contact.role} — {contact.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: ALMACENAMIENTO */}
      <section className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <FolderOpen className="w-5 h-5" />
            <h2 className="font-semibold text-sm text-neutral-900">Almacenamiento</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectModule('storage')}
            className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {MOCK_STORAGE_ITEMS.slice(0, 5).map((item) => (
            <div key={item.id} className="py-3 flex items-center gap-3 hover:bg-neutral-50/60 px-1 transition-colors">
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                    {item.date}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                  {item.size}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: AGENDA */}
      <section className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <Calendar className="w-5 h-5" />
            <h2 className="font-semibold text-sm text-neutral-900">Agenda</h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectModule('calendar')}
            className="text-xs text-brand-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {MOCK_CALENDAR_EVENTS.slice(0, 5).map((event) => (
            <div key={event.id} className="py-3 flex items-center gap-3 hover:bg-neutral-50/60 px-1 transition-colors">
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {event.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                    {event.time}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                  {event.meetUrl ? 'Videollamada en línea' : 'Tarea programada'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
