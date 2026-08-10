'use client';

import { MY_CONTACTS, type ContactItem } from '@/mocks/contacts';

interface MentionDropdownProps {
  /** Texto escrito después de la "@". Cadena vacía = aún no filtra nada */
  query: string;
  onSelect: (contact: ContactItem) => void;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

/** Lista de contactos que aparece al escribir "@" en el campo de texto */
export default function MentionDropdown({ query, onSelect }: MentionDropdownProps) {
  const matches = MY_CONTACTS.filter((contact) =>
    contact.name.toLowerCase().includes(query.toLowerCase())
  );

  if (matches.length === 0) return null;

  return (
    <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      {matches.map((contact) => (
        <button
          key={contact.id}
          type="button"
          onClick={() => onSelect(contact)}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 transition-colors duration-200"
        >
          <span
            style={{ backgroundColor: contact.color }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-normal text-brand-primary shrink-0"
          >
            {initialsOf(contact.name)}
          </span>
          <span className="text-xs font-normal text-neutral-900 truncate">{contact.name}</span>
        </button>
      ))}
    </div>
  );
}
