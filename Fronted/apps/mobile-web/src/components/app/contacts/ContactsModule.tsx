'use client';

import { useState } from 'react';
import { UserPlus, CheckCircle, PhoneCall, Globe, Users } from 'lucide-react';
import { MOCK_CONTACTS, ContactItem } from '@/mocks/contacts';
import ContactDetail from './ContactDetail';
import CreateContactModal from './CreateContactModal';

export default function ContactsModule() {
  const [contacts, setContacts] = useState<ContactItem[]>(MOCK_CONTACTS);
  const [activeTab, setActiveTab] = useState<'my_contacts' | 'discover' | 'calls'>('my_contacts');
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateContact = (newContact: ContactItem) => {
    setContacts([newContact, ...contacts]);
    setSelectedContact(newContact);
  };

  const filteredContacts = contacts.filter((c) => {
    if (activeTab === 'discover') return !c.verified;
    return true;
  });

  return (
    <div className="bg-white min-h-full flex flex-col lg:flex-row pb-24 lg:pb-0">
      
      {/* LEFT COLUMN: Contact List */}
      <div className={`flex-1 lg:w-96 lg:flex-none lg:border-r lg:border-neutral-200 flex flex-col ${
        selectedContact ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Header & Tabs */}
      <div className="p-4 border-b border-neutral-100 space-y-3 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-base text-neutral-900">Contactos & Red</h1>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-brand-dark transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-100 pb-2">
          <button
            onClick={() => setActiveTab('my_contacts')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'my_contacts' ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mis contactos</span>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'discover' ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Descubrir red</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'calls' ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Llamadas</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-neutral-100 flex-1">
        {activeTab === 'calls' ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <PhoneCall className="w-10 h-10 mx-auto text-neutral-300" />
            <p className="text-xs font-normal">Sin llamadas recientes en el historial</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center shrink-0">
                {contact.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-neutral-900 truncate">{contact.name}</span>
                  {contact.verified && <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                  {contact.phone || contact.email || 'Contacto'}
                </p>
              </div>
              </div>
          ))
        )}
      </div>
      </div>

      {/* RIGHT COLUMN: Contact Detail */}
      <div className={`flex-1 flex-col ${selectedContact ? 'flex' : 'hidden lg:flex'}`}>
        {selectedContact ? (
          <ContactDetail contact={selectedContact} onBack={() => setSelectedContact(null)} />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <Users className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún contacto seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona un contacto de la lista de la izquierda para ver su información detallada.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateContactModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateContact}
      />

    </div>
  );
}
