'use client';

import { useState, useMemo } from 'react';
import { Search, Check, X, Users, Camera, Image as ImageIcon } from 'lucide-react';
import { MOCK_CONTACTS } from '@/mocks/contacts';
import { GroupMember } from '@/mocks/chats';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, members: GroupMember[], hasPhoto?: boolean) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasPhoto, setHasPhoto] = useState(false);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return MOCK_CONTACTS.filter(
      (c) => text === '' || c.name.toLowerCase().includes(text)
    );
  }, [query]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length < 2) return;

    const me: GroupMember = {
      id: 'me',
      name: 'Santiago Valencia',
      role: 'admin',
      initials: 'SV',
      color: '#F3E8FF',
      isCurrentUser: true,
    };

    const selectedMembers: GroupMember[] = MOCK_CONTACTS.filter((c) =>
      selectedIds.includes(c.id)
    ).map((c) => ({
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
    }));

    onCreateGroup(groupName.trim(), [me, ...selectedMembers], hasPhoto);
    setGroupName('');
    setSelectedIds([]);
    setHasPhoto(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-base text-neutral-900">Nuevo grupo</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Photo Setup Section */}
        <div className="flex flex-col items-center justify-center py-2 space-y-1">
          <button
            type="button"
            onClick={() => setHasPhoto(!hasPhoto)}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-colors cursor-pointer ${
              hasPhoto
                ? 'bg-neutral-300 border-2 border-neutral-400 text-neutral-700'
                : 'bg-neutral-100 border-2 border-dashed border-neutral-300 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {hasPhoto ? (
              <>
                <ImageIcon className="w-6 h-6 text-neutral-700 mb-0.5" />
                <span className="text-[10px] font-semibold text-neutral-700">Foto</span>
              </>
            ) : (
              <>
                <Camera className="w-6 h-6 text-neutral-500 mb-0.5" />
                <span className="text-[9px] font-normal text-neutral-500">Agregar foto</span>
              </>
            )}
          </button>
          <span className="text-[11px] text-neutral-500 font-normal">
            {hasPhoto ? 'Foto seleccionada (Mock)' : 'Toca para agregar foto'}
          </span>
        </div>

        {/* Group Name input */}
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider font-semibold text-neutral-500">
            Nombre del grupo *
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ej. Proyecto Alfa, Marketing BeeApp..."
            className="w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary text-neutral-900"
          />
        </div>

        {/* Search Participants */}
        <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider font-semibold text-neutral-500">
              Selecciona miembros (mínimo 2)
            </label>
            <span className="text-xs text-brand-primary font-semibold">
              {selectedIds.length} seleccionados
            </span>
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

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 border border-neutral-100 rounded-xl p-1 mt-1">
            {filtered.map((contact) => {
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
                  className="py-2.5 px-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                      style={{ backgroundColor: contact.color || '#F3E8FF' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">{contact.name}</p>
                      <p className="text-[11px] text-neutral-500 font-normal truncate">
                        {contact.profession}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-brand-primary border-brand-primary text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Submit Button */}
        <button
          type="button"
          disabled={!groupName.trim() || selectedIds.length < 2}
          onClick={handleCreate}
          className="w-full h-12 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-sm"
        >
          Crear grupo
        </button>
      </div>
    </div>
  );
}
