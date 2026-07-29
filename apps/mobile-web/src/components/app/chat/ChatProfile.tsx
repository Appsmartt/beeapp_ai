'use client';

import { useState } from 'react';
import { ArrowLeft, Timer, BellOff, Search, UserPlus, LogOut, ShieldCheck } from 'lucide-react';
import { ChatItem } from '@/mocks/chats';

interface ChatProfileProps {
  chat: ChatItem;
  onBack: () => void;
}

export default function ChatProfile({ chat, onBack }: ChatProfileProps) {
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const [muted, setMuted] = useState(false);

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-2">Perfil</h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* User / Group Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xl flex items-center justify-center mx-auto shadow-sm">
            {chat.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex items-center justify-center gap-1.5 font-semibold text-base text-neutral-900">
            <span>{chat.name}</span>
            {chat.verified && <ShieldCheck className="w-4 h-4 text-brand-primary" />}
          </div>
          <p className="text-xs text-neutral-500 font-normal">{chat.isGroup ? 'Grupo • 5 miembros' : 'Contacto de BeeApp'}</p>
        </div>

        {/* Settings Options */}
        <div className="space-y-1 divide-y divide-neutral-100 border-t border-b border-neutral-100 py-2">
          
          {/* Disappearing messages */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-xs font-semibold text-neutral-800">Mensajes temporales</p>
                <p className="text-[10px] text-neutral-400 font-normal">{disappearingMessages ? 'Cada 24 horas' : 'Desactivado'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDisappearingMessages(!disappearingMessages)}
              className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                disappearingMessages ? 'bg-brand-primary' : 'bg-neutral-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${disappearingMessages ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Mute notifications */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-neutral-500" />
              <p className="text-xs font-semibold text-neutral-800">Silenciar notificaciones</p>
            </div>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                muted ? 'bg-brand-primary' : 'bg-neutral-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${muted ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Search in chat */}
          <div className="flex items-center gap-3 py-3 cursor-pointer hover:bg-neutral-50">
            <Search className="w-5 h-5 text-neutral-500" />
            <p className="text-xs font-semibold text-neutral-800">Buscar en la conversación</p>
          </div>

        </div>

        {/* Group members list if group */}
        {chat.isGroup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Miembros (5)</span>
              <button className="text-xs text-brand-primary font-semibold flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            <div className="divide-y divide-neutral-100">
              {['Santiago Morales (Tú - Admin)', 'Diego Ramírez', 'Laura Restrepo', 'Carlos Mendoza'].map((m) => (
                <div key={m} className="py-2 flex items-center gap-2.5 text-xs text-neutral-800 font-normal">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 font-bold text-[10px] flex items-center justify-center">
                    {m.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Action */}
        <div className="pt-4">
          <button className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-100">
            <LogOut className="w-4 h-4" />
            <span>{chat.isGroup ? 'Salir del grupo' : 'Eliminar chat'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
