'use client';

import {
  Users,
  Phone,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneOff,
  Video,
  PhoneCall,
  Info,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { ContactItem, CallLogItem, DISCOVER_CONTACTS, CALL_LOGS } from '@/mocks/contacts';
import { ContactsTab } from './chatSections';

interface ContactsPanelProps {
  contacts: ContactItem[];
  /** Qué lista se muestra. La navegación vive en el sidebar vertical de Chat */
  tab: ContactsTab;
  selectedContactId?: string;
  onSelectContact: (contact: ContactItem) => void;
  onCreateContact: () => void;
}

const callIconOf = (type: CallLogItem['type']) => {
  if (type === 'incoming') return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />;
  if (type === 'outgoing') return <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />;
  return <PhoneOff className="w-3.5 h-3.5 text-red-500" />;
};

const callLabelOf = (type: CallLogItem['type']) => {
  if (type === 'incoming') return 'Entrante';
  if (type === 'outgoing') return 'Saliente';
  return 'Perdida';
};

export default function ContactsPanel({
  contacts,
  tab,
  selectedContactId,
  onSelectContact,
  onCreateContact,
}: ContactsPanelProps) {
  const currentTabKey = tab === 'calls' ? 'calls' : tab === 'discover' ? 'discover' : 'my_contacts';

  const items: (ContactItem | CallLogItem)[] =
    currentTabKey === 'calls' ? CALL_LOGS : currentTabKey === 'discover' ? DISCOVER_CONTACTS : contacts;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Discover notice */}
      {currentTabKey === 'discover' && (
        <div className="p-3 bg-brand-primary/5 border-b border-brand-primary/20 flex items-start gap-2 text-[11px] text-brand-primary font-normal">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Solo aparecen en la red empresarial los usuarios que activaron su &quot;Visibilidad en la red&quot;.
          </span>
        </div>
      )}

      {/* Add Contact Trigger row */}
      {currentTabKey === 'my_contacts' && (
        <div
          onClick={onCreateContact}
          className="p-3.5 px-5 flex items-center gap-3 cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full border border-dashed border-brand-primary text-brand-primary flex items-center justify-center shrink-0">
            <UserPlus className="w-4.5 h-4.5" />
          </div>
          <span className="font-semibold text-xs text-neutral-900">Crear nuevo contacto</span>
        </div>
      )}

      {/* List items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {items.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-neutral-300" />
            <p className="text-xs font-normal">Todavía no hay registros en esta pestaña.</p>
          </div>
        ) : currentTabKey === 'calls' ? (
          (items as CallLogItem[]).map((log) => (
            <div
              key={log.id}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                  style={{ backgroundColor: log.color }}
                >
                  {log.initials}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-neutral-900 truncate">{log.name}</span>
                    {log.verified && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-normal mt-0.5">
                    {callIconOf(log.type)}
                    <span className={log.type === 'missed' ? 'text-red-500 font-semibold' : ''}>
                      {callLabelOf(log.type)}
                    </span>
                    <span>·</span>
                    <span>{log.isVideo ? 'Video' : 'Voz'}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal">{log.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => alert(`Llamar a ${log.name}`)}
                  className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Videollamada a ${log.name}`)}
                  className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          (items as ContactItem[]).map((contact) => {
            const isSelected = selectedContactId === contact.id;
            const initials = contact.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors ${
                  isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                    style={{ backgroundColor: contact.color || '#F3E8FF' }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs text-neutral-900 truncate">
                        {contact.name}
                      </span>
                      {contact.verified && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                      {contact.isFavorite && (
                        <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 px-1 rounded">
                          Fav
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                      {contact.company ? `${contact.profession} · ${contact.company}` : contact.profession}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Llamar a ${contact.name}`);
                    }}
                    className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectContact(contact);
                    }}
                    className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
