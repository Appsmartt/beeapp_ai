'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  UserCheck,
  Store,
  CreditCard,
  Link as LinkIcon,
  ShieldCheck,
  Eye,
  Share2,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  User,
  LayoutGrid,
} from 'lucide-react';
import { CURRENT_USER } from '@/mocks/currentUser';

export default function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [networkVisibility, setNetworkVisibility] = useState(CURRENT_USER.networkVisibility);

  const handleLogout = () => {
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="hidden lg:flex w-72 h-screen bg-white border-r border-neutral-200 flex-col shrink-0 overflow-y-auto selection:bg-brand-primary/20">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-2 text-brand-primary font-bold text-xl tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Bot className="w-6 h-6" />
          </div>
          <span className="text-neutral-900 font-semibold">BeeApp <span className="text-brand-primary">AI</span></span>
        </Link>
      </div>

      {/* User Profile Card */}
      <div className="p-4 mx-4 my-3 rounded-2xl bg-neutral-50 border border-neutral-200/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-bold text-xs flex items-center justify-center shrink-0">
          {CURRENT_USER.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 font-semibold text-xs text-neutral-900">
            <span className="truncate">{CURRENT_USER.name}</span>
            {CURRENT_USER.verified && <UserCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
          </div>
          <p className="text-[11px] text-neutral-500 font-normal truncate">{CURRENT_USER.email}</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-4 py-2 space-y-5 text-xs">
        
        {/* Section: PRINCIPAL */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Principal
          </div>
          <button
            onClick={() => router.push('/app')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Inicio & Módulos</span>
          </button>
        </div>

        {/* Section: MIS NEGOCIOS */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Mis Negocios
          </div>
          <button
            onClick={() => router.push('/app/beeservices')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/beeservices') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <Store className="w-4 h-4 text-neutral-500" />
            <span>BeeServices</span>
          </button>
        </div>

        {/* Section: MI CUENTA */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Mi Cuenta
          </div>
          <button
            onClick={() => router.push('/app/profile/edit')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/profile/edit') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <User className="w-4 h-4 text-neutral-500" />
            <span>Editar Perfil</span>
          </button>
          <button
            onClick={() => router.push('/app/profile/subscription')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/profile/subscription') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <CreditCard className="w-4 h-4 text-neutral-500" />
            <span>Suscripción y Verificación</span>
          </button>
          <button
            onClick={() => router.push('/app/profile/integrations')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/profile/integrations') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-neutral-500" />
            <span>Integraciones Externas</span>
          </button>
          <button
            onClick={() => router.push('/app/profile/security')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/profile/security') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Seguridad y PIN</span>
          </button>
          <button
            onClick={() => router.push('/app/profile/ai-settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/profile/ai-settings') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <Bot className="w-4 h-4 text-neutral-500" />
            <span>Configuración del Asistente</span>
          </button>
          
          <div className="flex items-center justify-between px-3 py-2.5 text-neutral-700 font-normal">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-neutral-500" />
              <span>Visibilidad en la red</span>
            </div>
            <button
              type="button"
              onClick={() => setNetworkVisibility(!networkVisibility)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                networkVisibility ? 'bg-brand-primary' : 'bg-neutral-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  networkVisibility ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section: APLICACIÓN */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Aplicación
          </div>
          <button
            onClick={() => router.push('/app/notifications')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-left ${
              isActive('/app/notifications') ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <Share2 className="w-4 h-4 text-neutral-500" />
            <span>Notificaciones</span>
          </button>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
          >
            <HelpCircle className="w-4 h-4 text-neutral-500" />
            <span>Contactar a Soporte</span>
          </button>
        </div>

        {/* Section: LEGAL */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Legal
          </div>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-neutral-500" />
            <span>Términos y Condiciones</span>
          </button>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
          >
            <Shield className="w-4 h-4 text-neutral-500" />
            <span>Política de Privacidad</span>
          </button>
        </div>

      </div>

      {/* Footer Logout Button */}
      <div className="p-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

    </aside>
  );
}
