'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { searchChatRecipients } from '@beeapp/api-client';
import { GroupMember } from '@/lib/client/chats';
import { contactColor, contactInitials, ContactItem } from '@/lib/client/contacts';
import { getWebAuth, loadContacts } from '@/lib/client/liveData';

interface AddMemberModalProps {
  visible: boolean;
  memberIds: string[];
  onAdd: (members: GroupMember[]) => void;
  onClose: () => void;
}

type Candidate = ContactItem & {
  recipientIdentityId?: string;
};

export default function AddMemberModal({
  visible,
  memberIds,
  onAdd,
  onClose,
}: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Candidate[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIds([]);
      loadContacts().then(setContacts).catch(() => setContacts([]));
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      setSearching(true);
      getWebAuth()
        .then((auth) => searchChatRecipients(auth, trimmed, 20))
        .then((res) => {
          if (!active) return;
          const mapped: Candidate[] = (res.users ?? []).map((u) => {
            const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Usuario Buddy';
            return {
              id: u.id,
              recipientIdentityId: u.id,
              name,
              profession: u.occupation || u.email || 'Usuario en Buddy',
              activity: '',
              interests: [],
              initials: contactInitials(name),
              color: contactColor(u.id),
              phone: '',
              email: u.email || '',
              company: '',
              location: u.location || '',
              verified: Boolean(u.is_verified),
            };
          });
          setRemoteUsers(mapped);
        })
        .catch(() => {
          if (active) setRemoteUsers([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, visible]);

  const available = useMemo(() => {
    const map = new Map<string, Candidate>();
    for (const c of contacts) {
      map.set(c.id, c);
    }
    for (const r of remoteUsers) {
      if (!Array.from(map.values()).some((item) => item.name.toLowerCase() === r.name.toLowerCase())) {
        map.set(r.id, r);
      } else {
        const key = Array.from(map.entries()).find(([, val]) => val.name.toLowerCase() === r.name.toLowerCase())?.[0];
        if (key) {
          map.set(key, { ...map.get(key)!, recipientIdentityId: r.recipientIdentityId || r.id });
        }
      }
    }

    const text = query.trim().toLowerCase();
    return Array.from(map.values()).filter(
      (contact) =>
        !memberIds.includes(contact.id) &&
        !memberIds.includes(contact.recipientIdentityId || '') &&
        (text === '' || contact.name.toLowerCase().includes(text) || contact.profession.toLowerCase().includes(text)),
    );
  }, [contacts, memberIds, query, remoteUsers]);

  if (!visible) return null;

  const toggle = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleAdd = () => {
    const newMembers: GroupMember[] = available
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({
        id: c.recipientIdentityId || c.id,
        name: c.name,
        role: 'member',
        initials: contactInitials(c.name),
        color: '#EBF5FF',
      }));
    onAdd(newMembers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative z-50 flex max-h-[80vh] w-full max-w-md flex-col space-y-4 rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-base font-semibold text-neutral-900">Agregar miembro</h2>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contacto o usuario en Buddy"
            className="flex-1 bg-transparent text-sm font-normal text-neutral-900 outline-none placeholder:text-neutral-500"
          />
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" /> : null}
        </div>

        <div className="flex-1 divide-y divide-neutral-100 overflow-y-auto">
          {available.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              {searching ? 'Buscando personas…' : 'No hay contactos disponibles para agregar.'}
            </p>
          ) : (
            available.map((contact) => {
              const isSelected = selectedIds.includes(contact.id);
              const initials = contactInitials(contact.name);

              return (
                <div
                  key={contact.id}
                  onClick={() => toggle(contact.id)}
                  className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-3 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-normal text-neutral-900">{contact.name}</p>
                      <p className="truncate text-xs font-normal text-neutral-500">
                        {contact.phone || contact.email || contact.profession || 'Usuario Buddy'}
                      </p>
                    </div>
                  </div>

                  {isSelected ? <Check className="h-4.5 w-4.5 shrink-0 text-brand-primary" /> : null}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={handleAdd}
          className="h-12 w-full rounded-xl bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {selectedIds.length > 0 ? `Invitar (${selectedIds.length})` : 'Invitar'}
        </button>
      </div>
    </div>
  );
}
