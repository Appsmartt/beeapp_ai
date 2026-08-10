'use client';

import { useState } from 'react';
import { Info, CheckCircle2, Check } from 'lucide-react';
import { ContactItem, DISCOVER_CONTACTS } from '@/mocks/contacts';

interface DiscoverPanelProps {
  selectedContactId?: string;
  onSelectContact: (contact: ContactItem) => void;
}

export default function DiscoverPanel({
  selectedContactId,
  onSelectContact,
}: DiscoverPanelProps) {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  const toggleConnect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConnectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Aviso informativo */}
      <div className="p-3 px-5 bg-brand-primary/5 border-b border-brand-primary/10 flex items-start gap-2 text-[11px] text-brand-primary font-normal shrink-0">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Solo aparecen en la red empresarial los usuarios que activaron su &quot;Visibilidad en la red&quot;.
        </span>
      </div>

      {/* Lista de contactos sugeridos */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {DISCOVER_CONTACTS.map((contact) => {
          const isSelected = selectedContactId === contact.id;
          const isConnected = connectedIds.has(contact.id);
          const initials = contact.initials || contact.name.slice(0, 2).toUpperCase();

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
                    {contact.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                    {contact.company
                      ? `${contact.profession} · ${contact.company}`
                      : contact.profession}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => toggleConnect(e, contact.id)}
                className={`text-xs font-normal px-3.5 py-1.5 rounded-full transition-colors shrink-0 flex items-center gap-1 ${
                  isConnected
                    ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    : 'bg-brand-primary text-white hover:bg-brand-dark'
                }`}
              >
                {isConnected && <Check className="w-3 h-3" />}
                {isConnected ? 'Conectado' : 'Conectar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
