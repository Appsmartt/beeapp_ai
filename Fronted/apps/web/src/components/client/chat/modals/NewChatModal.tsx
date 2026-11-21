'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, Search, X } from 'lucide-react';
import { searchChatRecipients } from '@beeapp/api-client';
import { contactColor, contactInitials, ContactItem } from '@/lib/client/contacts';
import { getWebAuth, loadContacts } from '@/lib/client/liveData';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: ContactItem & { recipientIdentityId?: string }) => void;
}

export default function NewChatModal({
  isOpen,
  onClose,
  onSelectContact,
}: NewChatModalProps) {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Array<ContactItem & { recipientIdentityId?: string }>>([]);
  const [remoteResults, setRemoteResults] = useState<Array<ContactItem & { recipientIdentityId?: string }>>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    loadContacts()
      .then((list) => setContacts(list))
      .catch(() => setContacts([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      setSearchingRemote(true);
      getWebAuth()
        .then((auth) => searchChatRecipients(auth, trimmed, 20))
        .then((res) => {
          if (!active) return;
          const mapped = (res.users ?? []).map((u) => {
            const name = u.display_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Usuario Buddy';
            return {
              id: u.user_id || u.id,
              recipientIdentityId: u.id,
              name,
              profession: u.occupation || u.email || 'Usuario en Buddy',
              activity: '',
              interests: [],
              initials: contactInitials(name),
              color: contactColor(u.id),
              phone: u.phone || '',
              email: u.email || '',
              company: '',
              location: '',
              verified: Boolean(u.is_verified),
            };
          });
          setRemoteResults(mapped);
        })
        .catch(() => {
          if (active) setRemoteResults([]);
        })
        .finally(() => {
          if (active) setSearchingRemote(false);
        });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  const text = query.trim().toLowerCase();
  const localMatches = contacts.filter(
    (contact) => text === '' || contact.name.toLowerCase().includes(text) || contact.profession.toLowerCase().includes(text),
  );
  const seenNames = new Set(localMatches.map((item) => item.name.toLowerCase()));
  const merged = [
    ...localMatches,
    ...remoteResults.filter((item) => !seenNames.has(item.name.toLowerCase())),
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pb-28 pt-[8vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-8vh-8rem)] w-full max-w-md flex-col space-y-4 rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-base font-semibold text-neutral-900">Nuevo chat</h2>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contacto o persona en Buddy..."
            className="flex-1 bg-transparent text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-500"
          />
          {searchingRemote ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" /> : null}
        </div>

        <div className="flex-1 divide-y divide-neutral-100 overflow-y-auto">
          {merged.length === 0 ? (
            <p className="py-8 text-center text-xs font-normal text-neutral-500">
              {searchingRemote ? 'Buscando personas…' : 'No se encontraron contactos.'}
            </p>
          ) : (
            merged.map((contact) => {
              const initials = contact.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={`${contact.id}-${contact.recipientIdentityId || ''}`}
                  onClick={() => {
                    onSelectContact(contact);
                    onClose();
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-neutral-50"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-brand-primary"
                    style={{ backgroundColor: contact.color || '#F3E8FF' }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-semibold text-neutral-900">{contact.name}</p>
                      {contact.verified ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-primary" /> : null}
                    </div>
                    <p className="truncate text-xs font-normal text-neutral-500">
                      {contact.company ? `${contact.profession} · ${contact.company}` : contact.profession}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
