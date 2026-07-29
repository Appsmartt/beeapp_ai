'use client';

import { ArrowLeft, Phone, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { ContactItem } from '@/mocks/contacts';

interface ContactDetailProps {
  contact: ContactItem;
  onBack: () => void;
}

export default function ContactDetail({ contact, onBack }: ContactDetailProps) {
  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-2">Detalle de Contacto</h1>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Avatar & Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xl flex items-center justify-center mx-auto shadow-sm">
            {contact.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex items-center justify-center gap-1.5 font-semibold text-base text-neutral-900">
            <span>{contact.name}</span>
            {contact.verified && <ShieldCheck className="w-4.5 h-4.5 text-brand-primary" />}
          </div>
          <p className="text-xs text-neutral-500 font-normal">{contact.role} en <span className="font-semibold text-neutral-800">{contact.company}</span></p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button className="py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-white">
            <Phone className="w-4 h-4 text-brand-primary" />
            <span>Llamar</span>
          </button>
          <button className="py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-white">
            <MessageCircle className="w-4 h-4 text-brand-primary" />
            <span>Chat</span>
          </button>
          <button className="py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-white">
            <Mail className="w-4 h-4 text-brand-primary" />
            <span>Correo</span>
          </button>
        </div>

        {/* Contact Info Items */}
        <div className="space-y-4 pt-4 border-t border-neutral-100">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Teléfono</span>
            <p className="text-xs text-neutral-900 font-normal">{contact.phone}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Correo electrónico</span>
            <p className="text-xs text-neutral-900 font-normal">{contact.email}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Empresa</span>
            <p className="text-xs text-neutral-900 font-normal">{contact.company}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Cargo</span>
            <p className="text-xs text-neutral-900 font-normal">{contact.role}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
