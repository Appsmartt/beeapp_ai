'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  UserCheck,
  Store,
  CreditCard,
  Link as LinkIcon,
  ShieldCheck,
  Bot,
  Eye,
  Share2,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
} from 'lucide-react';
import { CURRENT_USER } from '@/mocks/currentUser';
import BeeAppLogo from '@/components/BeeAppLogo';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const router = useRouter();
  const [networkVisibility, setNetworkVisibility] = useState(CURRENT_USER.networkVisibility);

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Content — se abre desde la derecha, del lado del sidebar de módulos */}
      <aside className="relative w-full max-w-[340px] bg-white h-full shadow-2xl flex flex-col z-50 overflow-y-auto">
        
        {/* Marca */}
        <div className="px-5 pt-5">
          <BeeAppLogo height={30} />
        </div>

        {/* Header User Area */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-primary text-white font-bold text-base flex items-center justify-center shadow-sm">
              {CURRENT_USER.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-sm text-neutral-900">
                <span>{CURRENT_USER.name}</span>
                {CURRENT_USER.verified && (
                  <UserCheck className="w-4 h-4 text-brand-primary shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-500 font-normal">{CURRENT_USER.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 p-4 space-y-6">
          
          {/* Section: MIS NEGOCIOS */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Mis Negocios
            </div>
            <button
              onClick={() => { onClose(); router.push('/app/beeservices'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <Store className="w-4 h-4 text-neutral-500" />
              <span>BeeServices</span>
            </button>
          </div>

          {/* Section: MI CUENTA */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Mi Cuenta
            </div>
            <button
              onClick={() => { onClose(); router.push('/app/profile/edit'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <UserCheck className="w-4 h-4 text-neutral-500" />
              <span>Editar Perfil</span>
            </button>
            <button
              onClick={() => { onClose(); router.push('/app/profile/subscription'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <CreditCard className="w-4 h-4 text-neutral-500" />
              <span>Suscripción y Verificación</span>
            </button>
            <button
              onClick={() => { onClose(); router.push('/app/profile/integrations'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <LinkIcon className="w-4 h-4 text-neutral-500" />
              <span>Integraciones Externas</span>
            </button>
            <button
              onClick={() => { onClose(); router.push('/app/profile/security'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
              <span>Seguridad y PIN</span>
            </button>
            <button
              onClick={() => { onClose(); router.push('/app/profile/ai-settings'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <Bot className="w-4 h-4 text-neutral-500" />
              <span>Configuración del Asistente</span>
            </button>
            
            {/* Toggle Switch */}
            <div className="flex items-center justify-between px-3 py-2.5 text-sm font-normal text-neutral-700">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-neutral-500" />
                <span>Visibilidad en la red</span>
              </div>
              <button
                type="button"
                onClick={() => setNetworkVisibility(!networkVisibility)}
                className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                  networkVisibility ? 'bg-brand-primary' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    networkVisibility ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: APLICACIÓN */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Aplicación
            </div>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <Share2 className="w-4 h-4 text-neutral-500" />
              <span>Compartir</span>
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <HelpCircle className="w-4 h-4 text-neutral-500" />
              <span>Contactar a Soporte</span>
            </button>
          </div>

          {/* Section: LEGAL */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Legal
            </div>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>Términos y Condiciones</span>
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

      </aside>
    </div>
  );
}
