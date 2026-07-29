'use client';

import { ArrowLeft, Users, Shield, LogOut } from 'lucide-react';
import { CommunityItem } from '@/mocks/communities';

interface CommunityProfileProps {
  community: CommunityItem;
  onBack: () => void;
}

export default function CommunityProfile({ community, onBack }: CommunityProfileProps) {
  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-2">Perfil de la Comunidad</h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-2xl bg-brand-primary/10 text-brand-primary font-bold text-xl flex items-center justify-center mx-auto shadow-sm">
            <Users className="w-10 h-10" />
          </div>
          <h2 className="font-semibold text-base text-neutral-900">{community.name}</h2>
          <p className="text-xs text-neutral-500 font-normal">{community.membersCount} miembros • Categoría: {community.category}</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
          <h3 className="text-xs font-semibold text-neutral-700">Descripción</h3>
          <p className="text-xs text-neutral-600 font-normal leading-relaxed">{community.description}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-700">Reglas de publicación</h3>
          <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/20 flex items-start gap-2.5 text-xs text-brand-primary font-normal">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Solo el administrador de la comunidad puede realizar publicaciones. Los miembros interactúan mediante reacciones.</span>
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-100">
          <button className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-100">
            <LogOut className="w-4 h-4" />
            <span>Salir de la comunidad</span>
          </button>
        </div>
      </div>
    </div>
  );
}
