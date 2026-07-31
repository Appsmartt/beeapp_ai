'use client';

import { useState, useMemo } from 'react';
import { Search, X, CheckCircle2 } from 'lucide-react';
import { MOCK_CONTACTS, ContactItem } from '@/mocks/contacts';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: ContactItem) => void;
}

export default function NewChatModal({
  isOpen,
  onClose,
  onSelectContact,
}: NewChatModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return MOCK_CONTACTS.filter(
      (c) => text === '' || c.name.toLowerCase().includes(text) || c.profession.toLowerCase().includes(text)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="font-semibold text-base text-neutral-900">Nuevo chat</h2>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-neutral-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contacto..."
            className="flex-1 bg-transparent text-xs font-normal outline-none text-neutral-900 placeholder:text-neutral-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {filtered.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-8 font-normal">
              No se encontraron contactos.
            </p>
          ) : (
            filtered.map((contact) => {
              const initials = contact.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={contact.id}
                  onClick={() => {
                    onSelectContact(contact);
                    onClose();
                  }}
                  className="py-3 px-2 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 rounded-xl transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                    style={{ backgroundColor: contact.color || '#F3E8FF' }}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{contact.name}</p>
                      {contact.verified && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-neutral-500 font-normal truncate">
                      {contact.company ? `${contact.profession} · ${contact.company}` : contact.profession}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
