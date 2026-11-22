'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Receipt, ShoppingBag, Sparkles, Store } from 'lucide-react';
import { beginAppNavigation } from '@/lib/client/navigationFeedback';
import VoiceAssistantModal from './VoiceAssistantModal';

const DOCK_BUTTON_BASE = 'flex h-10 w-10 items-center justify-center rounded-[14px] transition-transform hover:scale-105 sm:h-11 sm:w-11';

export default function MainQuickDock({ hidden = false }: { hidden?: boolean }) {
  const router = useRouter();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {hidden ? null : (
      <div className="pointer-events-none fixed inset-x-3 bottom-4 z-40 flex justify-center pr-[76px] sm:inset-x-0 sm:pr-0">
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-[#E7DFF5] bg-white/95 px-2.5 py-2 shadow-[0_6px_18px_rgba(141,115,201,0.22)] backdrop-blur-sm"
        aria-label="Accesos rápidos"
      >
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className={`${DOCK_BUTTON_BASE} bg-[#8D73C9] text-white shadow-[0_3px_8px_rgba(141,115,201,0.34)]`}
          aria-label="Abrir asistente de IA"
        >
          <Sparkles className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => {
            beginAppNavigation();
            router.push('/app/beeservices/my-purchases');
          }}
          className={`${DOCK_BUTTON_BASE} border border-[#E2D8F2] bg-[#F1ECFA] text-[#6B4FA0]`}
          aria-label="Abrir mis compras"
        >
          <Receipt className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => {
            beginAppNavigation();
            router.push('/app/beeservices/my-businesses');
          }}
          className={`${DOCK_BUTTON_BASE} border border-[#F5DCD1] bg-[#FBEDE7] text-[#C58B72]`}
          aria-label="Abrir Buddy Services comercial"
        >
          <ShoppingBag className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => {
            beginAppNavigation();
            router.push('/app/beeservices');
          }}
          className={`${DOCK_BUTTON_BASE} border border-[#D2EAE1] bg-[#E6F4EF] text-[#5D9D8C]`}
          aria-label="Abrir Buddy Services"
        >
          <Store className="h-[18px] w-[18px]" />
        </button>
      </div>
      </div>
      )}
      <VoiceAssistantModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </>,
    document.body,
  );
}
