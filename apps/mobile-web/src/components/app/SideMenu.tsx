'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, UserCheck, Store, CreditCard, Link as LinkIcon, ShieldCheck, Bot,
  Eye, Share2, HelpCircle, FileText, Shield, LogOut, Smartphone,
} from 'lucide-react';
import { CURRENT_USER } from '@/mocks/currentUser';
import BeeAppLogo from '@/components/BeeAppLogo';

import { EditProfilePanel } from './EditProfilePanel';
import { SubscriptionPanel } from './SubscriptionPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { SecurityPanel } from './SecurityPanel';
import { AiSettingsPanel } from './AiSettingsPanel';
import { DevicesPanel } from './DevicesPanel';
import { TermsPanel, PrivacyPanel } from './LegalPanels';
import { SupportPanel } from './SupportPanel';
import { BeeServicesPanel } from './BeeServicesPanel';

export type MenuOption =
  | 'beeservices' | 'edit' | 'subscription' | 'integrations' | 'security'
  | 'ai-settings' | 'devices' | 'terms' | 'privacy' | 'support'
  | null;

const PANEL_TITLES: Record<Exclude<MenuOption, null>, string> = {
  beeservices: 'BeeServices',
  edit: 'Editar Perfil',
  subscription: 'Suscripción y Verificación',
  integrations: 'Integraciones Externas',
  security: 'Seguridad y PIN',
  'ai-settings': 'Configuración del Asistente',
  devices: 'Dispositivos',
  terms: 'Términos y Condiciones',
  privacy: 'Política de Privacidad',
  support: 'Contactar a Soporte',
};

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialOption?: MenuOption;
}

export default function SideMenu({ isOpen, onClose, initialOption }: SideMenuProps) {
  const router = useRouter();
  const [networkVisibility, setNetworkVisibility] = useState(CURRENT_USER.networkVisibility);
  const [selectedOption, setSelectedOption] = useState<MenuOption>(initialOption ?? null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (isOpen && initialOption !== undefined) {
      setSelectedOption(initialOption);
    }
  }, [isOpen, initialOption]);

  if (!isOpen) return null;

  const handleLogout = () => { onClose(); router.push('/login'); };
  const handleClose = () => { setSelectedOption(null); onClose(); };

  const handleShare = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const menuBtn = (option: MenuOption, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setSelectedOption(option)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal transition-colors text-left ${
        selectedOption === option
          ? 'bg-brand-primary/10 text-brand-primary font-semibold'
          : 'text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-opacity" onClick={handleClose} />

      <div className="relative z-50 flex h-full bg-white shadow-2xl rounded-l-3xl overflow-hidden">
        {selectedOption && (
          <div
            className={`${
              selectedOption === 'beeservices' ? 'w-[540px]' : 'w-[480px]'
            } bg-white h-full flex flex-col overflow-hidden border-r border-neutral-100/50`}
            style={{ animation: 'sideMenuSlideIn 200ms ease forwards' }}
          >
            {selectedOption === 'beeservices' ? (
              <BeeServicesPanel onClose={() => setSelectedOption(null)} />
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
                  <h2 className="font-semibold text-base text-neutral-900">{PANEL_TITLES[selectedOption]}</h2>
                  <button type="button" onClick={() => setSelectedOption(null)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors" title="Cerrar panel">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {selectedOption === 'edit' && <EditProfilePanel />}
                  {selectedOption === 'subscription' && <SubscriptionPanel />}
                  {selectedOption === 'integrations' && <IntegrationsPanel />}
                  {selectedOption === 'security' && <SecurityPanel />}
                  {selectedOption === 'ai-settings' && <AiSettingsPanel />}
                  {selectedOption === 'devices' && <DevicesPanel />}
                  {selectedOption === 'terms' && <TermsPanel />}
                  {selectedOption === 'privacy' && <PrivacyPanel />}
                  {selectedOption === 'support' && <SupportPanel />}
                </div>
              </>
            )}
          </div>
        )}

        <aside className="w-[340px] bg-white h-full flex flex-col overflow-y-auto">
          <div className="px-5 pt-5"><BeeAppLogo height={30} /></div>

          <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-primary text-white font-bold text-base flex items-center justify-center shadow-sm">
                {CURRENT_USER.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-sm text-neutral-900">
                  <span>{CURRENT_USER.name}</span>
                  {CURRENT_USER.verified && <UserCheck className="w-4 h-4 text-brand-primary shrink-0" />}
                </div>
                <p className="text-xs text-neutral-500 font-normal">{CURRENT_USER.email}</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-6">
            <div className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Mis Negocios</div>
              {menuBtn('beeservices', <Store className="w-4 h-4 text-neutral-500" />, 'BeeServices')}
            </div>

            <div className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Mi Cuenta</div>
              {menuBtn('edit', <UserCheck className="w-4 h-4 text-neutral-500" />, 'Editar Perfil')}
              {menuBtn('subscription', <CreditCard className="w-4 h-4 text-neutral-500" />, 'Suscripción y Verificación')}
              {menuBtn('integrations', <LinkIcon className="w-4 h-4 text-neutral-500" />, 'Integraciones Externas')}
              {menuBtn('security', <ShieldCheck className="w-4 h-4 text-neutral-500" />, 'Seguridad y PIN')}
              {menuBtn('ai-settings', <Bot className="w-4 h-4 text-neutral-500" />, 'Configuración del Asistente')}
              {menuBtn('devices', <Smartphone className="w-4 h-4 text-neutral-500" />, 'Dispositivos')}

              <div className="flex items-center justify-between px-3 py-2.5 text-sm font-normal text-neutral-700">
                <div className="flex items-center gap-3"><Eye className="w-4 h-4 text-neutral-500" /><span>Visibilidad en la red</span></div>
                <button type="button" onClick={() => setNetworkVisibility(!networkVisibility)} className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${networkVisibility ? 'bg-brand-primary' : 'bg-neutral-300'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${networkVisibility ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Aplicación</div>
              <button onClick={handleShare} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 transition-colors text-left">
                <Share2 className="w-4 h-4 text-neutral-500" /><span>Compartir</span>
              </button>
              {menuBtn('support', <HelpCircle className="w-4 h-4 text-neutral-500" />, 'Contactar a Soporte')}
            </div>

            <div className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Legal</div>
              {menuBtn('terms', <FileText className="w-4 h-4 text-neutral-500" />, 'Términos y Condiciones')}
              {menuBtn('privacy', <Shield className="w-4 h-4 text-neutral-500" />, 'Política de Privacidad')}
            </div>
          </div>

          <div className="p-4 border-t border-neutral-100">
            <button type="button" onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
              <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      </div>

      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-200">
          Enlace copiado
        </div>
      )}

      <style jsx>{`
        @keyframes sideMenuSlideIn {
          from { transform: translateX(60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
