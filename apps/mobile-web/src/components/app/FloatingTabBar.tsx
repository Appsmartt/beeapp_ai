'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, FileText, FolderOpen, Calendar, MessageCircle, Mic, Phone, X } from 'lucide-react';
import { LEFT_TAB_NOTIFICATIONS, RIGHT_TAB_NOTIFICATIONS } from '@/mocks/tabNotifications';

export default function FloatingTabBar() {
  const router = useRouter();
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLeftIndex((prev) => (prev + 1) % LEFT_TAB_NOTIFICATIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRightIndex((prev) => (prev + 1) % RIGHT_TAB_NOTIFICATIONS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const currentLeft = LEFT_TAB_NOTIFICATIONS[leftIndex];
  const currentRight = RIGHT_TAB_NOTIFICATIONS[rightIndex];

  const getLeftIcon = (type: string) => {
    switch (type) {
      case 'mail': return <Mail className="w-5 h-5" />;
      case 'notes': return <FileText className="w-5 h-5" />;
      case 'storage': return <FolderOpen className="w-5 h-5" />;
      case 'calendar': return <Calendar className="w-5 h-5" />;
      default: return <Mail className="w-5 h-5" />;
    }
  };

  const getRightIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageCircle className="w-5 h-5" />;
      default: return <Phone className="w-5 h-5" />;
    }
  };

  const unreadLeft = LEFT_TAB_NOTIFICATIONS.filter((n) => !n.read).length;
  const unreadRight = RIGHT_TAB_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 w-full max-w-[430px] mx-auto z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-4 py-2 flex items-center justify-between shadow-lg">
        
        {/* Left Notification Tab */}
        <button
          type="button"
          onClick={() => router.push('/app/notifications')}
          className="flex-1 flex items-center gap-2.5 p-2 rounded-2xl hover:bg-neutral-100/60 transition-colors text-left min-w-0"
        >
          <div className="relative shrink-0 text-brand-primary p-2 rounded-xl bg-brand-primary/10">
            {getLeftIcon(currentLeft.type)}
            {unreadLeft > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadLeft}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-neutral-900 truncate">
              {currentLeft.type.toUpperCase()}
            </span>
            <span className="text-[10px] text-neutral-500 font-normal truncate">
              {currentLeft.message}
            </span>
          </div>
        </button>

        {/* Center Voice Assistant Button */}
        <div className="shrink-0 px-2 relative -top-3">
          <button
            type="button"
            onClick={() => setVoiceAssistantOpen(true)}
            className="w-13 h-13 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/30 hover:bg-brand-dark transition-all transform hover:scale-105 active:scale-95"
            title="Asistente IA por voz"
          >
            <Mic className="w-6 h-6" />
          </button>
        </div>

        {/* Right Chat Tab */}
        <button
          type="button"
          onClick={() => router.push('/app')}
          className="flex-1 flex items-center justify-end gap-2.5 p-2 rounded-2xl hover:bg-neutral-100/60 transition-colors text-right min-w-0"
        >
          <div className="flex flex-col min-w-0 text-right">
            <span className="text-[11px] font-semibold text-neutral-900 truncate">
              CHATS
            </span>
            <span className="text-[10px] text-neutral-500 font-normal truncate">
              {currentRight.message}
            </span>
          </div>
          <div className="relative shrink-0 text-brand-primary p-2 rounded-xl bg-brand-primary/10">
            {getRightIcon(currentRight.type)}
            {unreadRight > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadRight}
              </span>
            )}
          </div>
        </button>

      </div>

      {/* Voice Assistant Modal Overlay */}
      {voiceAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/90 backdrop-blur-md flex flex-col justify-between max-w-[430px] mx-auto p-6 text-white">
          <div className="flex justify-end">
            <button
              onClick={() => setVoiceAssistantOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-brand-primary/30 border-4 border-brand-primary flex items-center justify-center mx-auto animate-pulse">
              <Mic className="w-12 h-12 text-brand-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Asistente por Voz</h2>
              <p className="text-xs text-neutral-300 font-normal">Escuchando... &quot;Busca servicios de diseño en Bogotá&quot;</p>
            </div>
          </div>

          <div className="text-center pb-6 text-xs text-neutral-400 font-normal">
            Toca la pantalla para pausar
          </div>
        </div>
      )}
    </>
  );
}
