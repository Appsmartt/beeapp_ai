'use client';

import { useState } from 'react';
import {
  ArrowLeft, MessageSquare, Phone, Video, Mail, Briefcase, Layers, Heart,
  FileText, VolumeX, Volume2, ShieldAlert, Trash2, ArrowDownLeft, ArrowUpRight,
  PhoneOff, CheckCircle2,
} from 'lucide-react';
import { ContactItem, ALL_CONTACT_DETAILS, CONTACT_CALLS } from '@/mocks/contacts';
import SocialNetworksSection from '../SocialNetworksSection';

interface ContactDetailProps {
  contact: ContactItem;
  onBack: () => void;
  onSendMessage?: () => void;
}

export default function ContactDetail({ contact, onBack, onSendMessage }: ContactDetailProps) {
  const detail = ALL_CONTACT_DETAILS[contact.id] || {
    ...contact, phone: '+57 300 123 4567', email: `${contact.name.toLowerCase().replace(/\s+/g, '.')}@empresa.com`, online: true,
  };
  const callLogs = CONTACT_CALLS[contact.id] || [];
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const initials = contact.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderCallIcon = (type: 'incoming' | 'outgoing' | 'missed') => {
    if (type === 'incoming') return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />;
    if (type === 'outgoing') return <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />;
    return <PhoneOff className="w-3.5 h-3.5 text-red-500" />;
  };

  return (
    <div className="bg-neutral-50 min-h-full flex flex-col select-none">
      <div className="flex items-center px-4 py-3 border-b border-neutral-200 bg-white sticky top-0 z-10">
        <button type="button" onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-2">Perfil del Contacto</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 text-center shadow-xs space-y-2">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-brand-primary" style={{ backgroundColor: contact.color || '#F3E8FF' }}>{initials}</div>
            {detail.online && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-base text-neutral-900">
              <span>{contact.name}</span>
              {contact.verified && <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />}
              {contact.isFavorite && <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">Fav</span>}
            </div>
            <p className="text-xs text-neutral-500 font-normal">{contact.profession}</p>
            <p className="text-xs text-neutral-500 font-normal">{contact.company}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center justify-around shadow-xs">
          <button type="button" onClick={onSendMessage} className="flex flex-col items-center gap-1.5"><div className="w-10 h-10 rounded-full bg-neutral-100 text-brand-primary flex items-center justify-center hover:bg-brand-primary/10"><MessageSquare className="w-4.5 h-4.5" /></div><span className="text-[11px] font-normal text-neutral-800">Mensaje</span></button>
          <button type="button" onClick={() => alert(`Llamar a ${contact.name}`)} className="flex flex-col items-center gap-1.5"><div className="w-10 h-10 rounded-full bg-neutral-100 text-brand-primary flex items-center justify-center hover:bg-brand-primary/10"><Phone className="w-4.5 h-4.5" /></div><span className="text-[11px] font-normal text-neutral-800">Llamar</span></button>
          <button type="button" onClick={() => alert(`Videollamada a ${contact.name}`)} className="flex flex-col items-center gap-1.5"><div className="w-10 h-10 rounded-full bg-neutral-100 text-brand-primary flex items-center justify-center hover:bg-brand-primary/10"><Video className="w-4.5 h-4.5" /></div><span className="text-[11px] font-normal text-neutral-800">Video</span></button>
          <button type="button" onClick={() => alert(`Correo a ${detail.email}`)} className="flex flex-col items-center gap-1.5"><div className="w-10 h-10 rounded-full bg-neutral-100 text-brand-primary flex items-center justify-center hover:bg-brand-primary/10"><Mail className="w-4.5 h-4.5" /></div><span className="text-[11px] font-normal text-neutral-800">Correo</span></button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 px-1">Información General</h3>
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 divide-y divide-neutral-100 shadow-xs">
            <div className="py-2 flex items-start gap-3"><Phone className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" /><div><p className="text-[10px] text-neutral-400 font-normal">Teléfono</p><p className="text-xs font-normal text-neutral-900">{detail.phone}</p></div></div>
            <div className="py-2 flex items-start gap-3"><Mail className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" /><div><p className="text-[10px] text-neutral-400 font-normal">Correo Electrónico</p><p className="text-xs font-normal text-neutral-900">{detail.email}</p></div></div>
            <div className="py-2 flex items-start gap-3"><Briefcase className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" /><div><p className="text-[10px] text-neutral-400 font-normal">Empresa y Cargo</p><p className="text-xs font-normal text-neutral-900">{contact.profession} — {contact.company || 'Independiente'}</p></div></div>
            <div className="py-2 flex items-start gap-3"><Layers className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" /><div><p className="text-[10px] text-neutral-400 font-normal">Actividad Económica</p><p className="text-xs font-normal text-neutral-900">{detail.activity}</p></div></div>
            <div className="py-2 flex items-start gap-3"><Heart className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" /><div><p className="text-[10px] text-neutral-400 font-normal mb-1">Intereses</p><div className="flex flex-wrap gap-1">{(detail.interests || ['Tecnología', 'Consultoría']).map((item, idx) => (<span key={idx} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-normal">{item}</span>))}</div></div></div>
          </div>
        </div>

        {/* Redes sociales */}
        <SocialNetworksSection socialLinks={detail.socialLinks} />

        <div className="space-y-1.5">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 px-1">Historial de Llamadas</h3>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="grid grid-cols-3 border-b border-neutral-100 p-3 text-center">
              <div><p className="text-sm font-semibold text-brand-primary">{callLogs.length}</p><p className="text-[10px] font-normal text-neutral-500">Total Llamadas</p></div>
              <div className="border-x border-neutral-100"><p className="text-sm font-semibold text-brand-primary">{callLogs.filter((l) => l.type !== 'missed').length > 0 ? '18m 10s' : '0s'}</p><p className="text-[10px] font-normal text-neutral-500">Tiempo Hablado</p></div>
              <div><p className="text-sm font-semibold text-brand-primary">{callLogs[0]?.time.split(',')[0] || 'N/A'}</p><p className="text-[10px] font-normal text-neutral-500">Última Llamada</p></div>
            </div>
            <div className="p-3 divide-y divide-neutral-100">
              {callLogs.map((log, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">{renderCallIcon(log.type)}<span className={`font-normal ${log.type === 'missed' ? 'text-red-500' : 'text-neutral-800'}`}>Llamada {log.type === 'incoming' ? 'Entrante' : log.type === 'outgoing' ? 'Saliente' : 'Perdida'}</span></div>
                  <div className="text-right"><p className="text-[11px] text-neutral-500 font-normal">{log.time}</p>{log.type !== 'missed' && <p className="text-[9px] text-neutral-400 font-normal">{log.duration}</p>}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 px-1">Archivos Compartidos</h3>
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 space-y-2 shadow-xs">
            <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-red-500 shrink-0" /><div className="min-w-0"><p className="text-xs font-normal text-neutral-900 truncate">NDA_Firmado_BeeApp.pdf</p><p className="text-[10px] text-neutral-500 font-normal">1.2 MB • Hace 2 días</p></div></div>
            <div className="flex items-center gap-3 pt-2 border-t border-neutral-100"><FileText className="w-4 h-4 text-neutral-500 shrink-0" /><div className="min-w-0"><p className="text-xs font-normal text-neutral-900 truncate">Propuesta_Comercial.docx</p><p className="text-[10px] text-neutral-500 font-normal">850 KB • Hace 5 días</p></div></div>
          </div>
        </div>

        <div className="space-y-1.5 pb-6">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 px-1">Opciones</h3>
          <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 shadow-xs">
            <div onClick={() => setIsMuted(!isMuted)} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 text-xs font-normal text-neutral-800">{isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}<span>{isMuted ? 'Activar notificaciones' : 'Silenciar notificaciones'}</span></div>
            <div onClick={() => setIsBlocked(!isBlocked)} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 text-xs font-normal text-red-600"><ShieldAlert className="w-4 h-4" /><span>{isBlocked ? 'Desbloquear contacto' : 'Bloquear contacto'}</span></div>
            <div onClick={() => { if (confirm(`¿Eliminar a ${contact.name} de tus contactos?`)) { alert('Contacto eliminado'); onBack(); } }} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-red-50 text-xs font-normal text-red-600"><Trash2 className="w-4 h-4" /><span>Eliminar contacto</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
