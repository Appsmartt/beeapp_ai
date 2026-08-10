'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Check, X } from 'lucide-react';
import { MOCK_CONTACTS } from '@/mocks/contacts';
import { GroupMember } from '@/mocks/chats';

interface AddMemberModalProps {
  visible: boolean;
  memberIds: string[];
  onAdd: (members: GroupMember[]) => void;
  onClose: () => void;
}

export default function AddMemberModal({
  visible,
  memberIds,
  onAdd,
  onClose,
}: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIds([]);
    }
  }, [visible]);

  const available = useMemo(() => {
    const text = query.trim().toLowerCase();
    return MOCK_CONTACTS.filter(
      (contact) =>
        !memberIds.includes(contact.id) &&
        (text === '' || contact.name.toLowerCase().includes(text))
    );
  }, [query, memberIds]);

  if (!visible) return null;

  const toggle = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleAdd = () => {
    const newMembers: GroupMember[] = MOCK_CONTACTS.filter((c) => selectedIds.includes(c.id)).map(
      (c) => ({
        id: c.id,
        name: c.name,
        role: 'member',
        initials: c.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        color: '#EBF5FF',
      })
    );
    onAdd(newMembers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="font-semibold text-base text-neutral-900">Agregar miembro</h2>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-neutral-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contacto"
            className="flex-1 bg-transparent text-sm font-normal outline-none text-neutral-900 placeholder:text-neutral-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {available.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              No hay contactos disponibles para agregar.
            </p>
          ) : (
            available.map((contact) => {
              const isSelected = selectedIds.includes(contact.id);
              const initials = contact.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={contact.id}
                  onClick={() => toggle(contact.id)}
                  className="py-3 px-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-semibold text-xs shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-normal text-neutral-900 truncate">{contact.name}</p>
                      <p className="text-xs text-neutral-500 truncate font-normal">
                        {contact.phone || contact.email || 'Contacto'}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4.5 h-4.5 text-brand-primary shrink-0" />}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={handleAdd}
          className="w-full h-12 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {selectedIds.length > 0 ? `Agregar (${selectedIds.length})` : 'Agregar'}
        </button>
      </div>
    </div>
  );
}
