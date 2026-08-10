'use client';

import { useState } from 'react';
import { Eye, Globe, UserCheck, Tag, Check, X } from 'lucide-react';
import { MOCK_CONTACTS } from '@/mocks/contacts';
import { MOCK_CATEGORIES } from '@/mocks/chats';

export type StatusVisibility = 'all' | 'selected' | 'category';

interface StatusPrivacySectionProps {
  visibility: StatusVisibility;
  onChangeVisibility: (v: StatusVisibility) => void;
  selectedContactIds: string[];
  onChangeSelectedContacts: (ids: string[]) => void;
  selectedCategoryId: string | null;
  onChangeSelectedCategory: (id: string) => void;
}

export default function StatusPrivacySection({
  visibility,
  onChangeVisibility,
  selectedContactIds,
  onChangeSelectedContacts,
  selectedCategoryId,
  onChangeSelectedCategory,
}: StatusPrivacySectionProps) {
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      onChangeSelectedContacts(selectedContactIds.filter((cId) => cId !== id));
    } else {
      onChangeSelectedContacts([...selectedContactIds, id]);
    }
  };

  const selectedCategoryName = MOCK_CATEGORIES.find((c) => c.id === selectedCategoryId)?.name;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
        <Eye className="w-4 h-4 text-brand-primary" />
        <span>¿Quién puede ver tu estado?</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChangeVisibility('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal transition-colors ${
            visibility === 'all'
              ? 'bg-brand-primary text-white font-semibold'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Todos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeVisibility('selected');
            setContactsModalOpen(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal transition-colors ${
            visibility === 'selected'
              ? 'bg-brand-primary text-white font-semibold'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>
            {selectedContactIds.length > 0
              ? `${selectedContactIds.length} selec.`
              : 'Contactos'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeVisibility('category');
            setCategoryModalOpen(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal transition-colors ${
            visibility === 'category'
              ? 'bg-brand-primary text-white font-semibold'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{selectedCategoryName || 'Categoría'}</span>
        </button>
      </div>

      {/* Modal Contactos */}
      {contactsModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="font-semibold text-sm text-neutral-900">Seleccionar Contactos</h3>
              <button type="button" onClick={() => setContactsModalOpen(false)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100">
              {MOCK_CONTACTS.map((contact) => {
                const isSelected = selectedContactIds.includes(contact.id);
                return (
                  <div
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className="py-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 px-1 rounded-lg"
                  >
                    <span className="text-xs font-normal text-neutral-800">{contact.name}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-neutral-300'}`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Categoría */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="font-semibold text-sm text-neutral-900">Seleccionar Categoría</h3>
              <button type="button" onClick={() => setCategoryModalOpen(false)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {MOCK_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    onChangeSelectedCategory(cat.id);
                    setCategoryModalOpen(false);
                  }}
                  className="py-2.5 px-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-neutral-50 text-xs font-normal text-neutral-800"
                >
                  <span>{cat.name}</span>
                  {selectedCategoryId === cat.id && <Check className="w-4 h-4 text-brand-primary" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
