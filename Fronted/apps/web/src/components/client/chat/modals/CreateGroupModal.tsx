'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Loader2, Search, Users, X } from 'lucide-react';
import { searchChatRecipients } from '@beeapp/api-client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { GroupMember } from '@/lib/client/chats';
import { contactColor, contactInitials, ContactItem } from '@/lib/client/contacts';
import { getWebAuth, loadContacts } from '@/lib/client/liveData';

export interface CreateGroupOptions {
  description?: string;
  postingPolicy: 'all_members' | 'admins_only';
  imageFile?: File | null;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, members: GroupMember[], options: CreateGroupOptions) => void;
}

type SelectableCandidate = ContactItem & {
  recipientIdentityId?: string;
};

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const { profile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [postingPolicy, setPostingPolicy] = useState<'all_members' | 'admins_only'>('all_members');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<SelectableCandidate[]>([]);
  const [remoteCandidates, setRemoteCandidates] = useState<SelectableCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadContacts()
      .then((list) => setContacts(list))
      .catch(() => setContacts([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      setSearching(true);
      getWebAuth()
        .then((auth) => searchChatRecipients(auth, trimmed, 20))
        .then((res) => {
          if (!active) return;
          const mapped: SelectableCandidate[] = (res.users ?? []).map((u) => {
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
          setRemoteCandidates(mapped);
        })
        .catch(() => {
          if (active) setRemoteCandidates([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  const allCandidates = useMemo(() => {
    const map = new Map<string, SelectableCandidate>();
    for (const c of contacts) {
      map.set(c.id, c);
    }
    for (const r of remoteCandidates) {
      if (!Array.from(map.values()).some((item) => item.name.toLowerCase() === r.name.toLowerCase())) {
        map.set(r.id, r);
      } else {
        const existingKey = Array.from(map.entries()).find(
          ([, val]) => val.name.toLowerCase() === r.name.toLowerCase(),
        )?.[0];
        if (existingKey) {
          const existing = map.get(existingKey)!;
          map.set(existingKey, { ...existing, recipientIdentityId: r.recipientIdentityId || r.id });
        }
      }
    }
    return Array.from(map.values());
  }, [contacts, remoteCandidates]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return allCandidates.filter(
      (c) => text === '' || c.name.toLowerCase().includes(text) || c.profession.toLowerCase().includes(text),
    );
  }, [allCandidates, query]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length < 1) return;

    const meName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú';
    const me: GroupMember = {
      id: profile?.id || 'me',
      name: meName,
      role: 'owner',
      initials: contactInitials(meName),
      color: '#F3E8FF',
      isCurrentUser: true,
    };

    const selectedMembers: GroupMember[] = allCandidates
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({
        id: c.recipientIdentityId || c.id,
        name: c.name,
        role: 'member',
        initials: contactInitials(c.name),
        color: '#EBF5FF',
      }));

    onCreateGroup(groupName.trim(), [me, ...selectedMembers], {
      description: description.trim() || undefined,
      postingPolicy,
      imageFile,
    });
    setGroupName('');
    setDescription('');
    setPostingPolicy('all_members');
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative z-50 flex max-h-[90vh] w-full max-w-md flex-col space-y-3.5 rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-primary" />
            <h2 className="text-base font-semibold text-neutral-900">Nuevo grupo</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-1 py-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-18 w-18 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-neutral-300 bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Foto del grupo" className="h-full w-full object-cover" />
            ) : (
              <>
                <Camera className="mb-0.5 h-5 w-5 text-neutral-500" />
                <span className="text-[9px] font-normal text-neutral-500">Foto</span>
              </>
            )}
          </button>
          <span className="text-[11px] font-normal text-neutral-500">
            {imageFile ? imageFile.name : 'Toca para subir foto del grupo'}
          </span>
        </div>

        <div className="grid gap-2.5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Nombre del grupo *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej. Proyecto Alfa, Marketing Buddy..."
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Propósito o reglas del grupo..."
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              ¿Quién puede enviar mensajes?
            </label>
            <select
              value={postingPolicy}
              onChange={(e) => setPostingPolicy(e.target.value as 'all_members' | 'admins_only')}
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary"
            >
              <option value="all_members">Todos los miembros</option>
              <option value="admins_only">Solo administradores</option>
            </select>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Invitar miembros
            </label>
            <span className="text-xs font-semibold text-brand-primary">
              {selectedIds.length} seleccionados
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar contacto o usuario..."
              className="flex-1 bg-transparent text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-500"
            />
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" /> : null}
          </div>

          <div className="mt-1 flex-1 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-100 p-1">
            {filtered.map((contact) => {
              const isSelected = selectedIds.includes(contact.id);
              const initials = contactInitials(contact.name);

              return (
                <div
                  key={contact.id}
                  onClick={() => toggle(contact.id)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-brand-primary"
                      style={{ backgroundColor: contact.color || '#F3E8FF' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-neutral-900">{contact.name}</p>
                      <p className="truncate text-[11px] font-normal text-neutral-500">{contact.profession}</p>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!groupName.trim() || selectedIds.length < 1}
            onClick={handleCreate}
            className="h-10 flex-1 rounded-full bg-brand-primary text-xs font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Crear grupo
          </button>
        </div>
      </div>
    </div>
  );
}
