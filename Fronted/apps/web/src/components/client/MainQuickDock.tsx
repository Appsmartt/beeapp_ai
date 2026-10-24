'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Sparkles, Store, UserRound } from 'lucide-react';
import VoiceAssistantModal from './VoiceAssistantModal';

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
      <div
        className="fixed bottom-5 left-1/2 z-[80] flex w-[min(280px,70vw)] -translate-x-1/2 items-center justify-between rounded-[28px] border border-[#E7DFF5] bg-white/95 px-3 py-3 shadow-[0_6px_18px_rgba(141,115,201,0.22)]"
        aria-label="Accesos rápidos"
      >
        <button
          type="button"
          onClick={() => router.push('/app/profile/edit')}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-[#E2D8F2] bg-[#F1ECFA] text-[#7C6AA5]"
          aria-label="Editar perfil"
        >
          <UserRound className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-[#8D73C9] text-white shadow-[0_3px_8px_rgba(141,115,201,0.34)]"
          aria-label="Abrir asistente de voz"
        >
          <Sparkles className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => router.push('/app/beeservices/my-businesses')}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-[#F5DCD1] bg-[#FBEDE7] text-[#C58B72]"
          aria-label="Mis negocios"
        >
          <ShoppingBag className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => router.push('/app/beeservices')}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-[#D5EBE3] bg-[#E7F6EF] text-[#5D9D8C]"
          aria-label="BuddyServices"
        >
          <Store className="h-5 w-5" />
        </button>
      </div>
      )}
      <VoiceAssistantModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </>,
    document.body,
  );
}
