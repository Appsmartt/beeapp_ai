'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
  Smartphone,
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

export type MenuOption =
  | 'edit'
  | 'subscription'
  | 'integrations'
  | 'security'
  | 'ai-settings'
  | 'devices'
  | 'terms'
  | 'privacy'
  | 'support'
  | null;

type PanelOption = Exclude<MenuOption, null>;

const PANEL_TITLES: Record<PanelOption, string> = {
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

export default function SideMenu({
  isOpen,
  onClose,
  initialOption,
}: SideMenuProps) {
  const router = useRouter();

  const [networkVisibility, setNetworkVisibility] = useState(
    CURRENT_USER.networkVisibility,
  );
  const [selectedOption, setSelectedOption] =
    useState<MenuOption>(initialOption ?? null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (isOpen && initialOption !== undefined) {
      setSelectedOption(initialOption);
    }
  }, [isOpen, initialOption]);

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    router.push('/login');
  };

  const handleClose = () => {
    setSelectedOption(null);
    onClose();
  };

  const handleShare = () => {
    setToastVisible(true);

    window.setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  };

  const handleOpenBeeServices = () => {
    setSelectedOption(null);
    onClose();
    router.push('/app/beeservices');
  };

  const menuBtn = (
    option: PanelOption,
    icon: ReactNode,
    label: string,
  ) => (
    <button
      type="button"
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
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />

      <div className="relative z-50 flex h-full overflow-hidden rounded-l-3xl bg-white shadow-2xl">
        {selectedOption && (
          <div
            className="h-full w-[480px] max-w-[calc(100vw-340px)] flex flex-col overflow-hidden border-r border-neutral-100/50 bg-white"
            style={{
              animation: 'sideMenuSlideIn 200ms ease forwards',
            }}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 shrink-0">
              <h2 className="text-base font-semibold text-neutral-900">
                {PANEL_TITLES[selectedOption]}
              </h2>

              <button
                type="button"
                onClick={() => setSelectedOption(null)}
                className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                title="Cerrar panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedOption === 'edit' && <EditProfilePanel />}
              {selectedOption === 'subscription' && (
                <SubscriptionPanel />
              )}
              {selectedOption === 'integrations' && (
                <IntegrationsPanel />
              )}
              {selectedOption === 'security' && <SecurityPanel />}
              {selectedOption === 'ai-settings' && (
                <AiSettingsPanel />
              )}
              {selectedOption === 'devices' && <DevicesPanel />}
              {selectedOption === 'terms' && <TermsPanel />}
              {selectedOption === 'privacy' && <PrivacyPanel />}
              {selectedOption === 'support' && <SupportPanel />}
            </div>
          </div>
        )}

        <aside className="h-full w-[340px] flex flex-col overflow-y-auto bg-white">
          <div className="px-5 pt-5">
            <BeeAppLogo height={30} />
          </div>

          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-base font-bold text-white shadow-sm">
                {CURRENT_USER.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  <span>{CURRENT_USER.name}</span>

                  {CURRENT_USER.verified && (
                    <UserCheck className="h-4 w-4 shrink-0 text-brand-primary" />
                  )}
                </div>

                <p className="text-xs font-normal text-neutral-500">
                  {CURRENT_USER.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200/50 hover:text-neutral-900"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-6 p-4">
            <div className="space-y-1">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Mis Negocios
              </div>

              <button
                type="button"
                onClick={handleOpenBeeServices}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-normal text-neutral-700 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
              >
                <Store className="h-4 w-4 text-neutral-500" />
                <span>BeeServices</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Mi Cuenta
              </div>

              {menuBtn(
                'edit',
                <UserCheck className="h-4 w-4 text-neutral-500" />,
                'Editar Perfil',
              )}

              {menuBtn(
                'subscription',
                <CreditCard className="h-4 w-4 text-neutral-500" />,
                'Suscripción y Verificación',
              )}

              {menuBtn(
                'integrations',
                <LinkIcon className="h-4 w-4 text-neutral-500" />,
                'Integraciones Externas',
              )}

              {menuBtn(
                'security',
                <ShieldCheck className="h-4 w-4 text-neutral-500" />,
                'Seguridad y PIN',
              )}

              {menuBtn(
                'ai-settings',
                <Bot className="h-4 w-4 text-neutral-500" />,
                'Configuración del Asistente',
              )}

              {menuBtn(
                'devices',
                <Smartphone className="h-4 w-4 text-neutral-500" />,
                'Dispositivos',
              )}

              <div className="flex items-center justify-between px-3 py-2.5 text-sm font-normal text-neutral-700">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-neutral-500" />
                  <span>Visibilidad en la red</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNetworkVisibility((visible) => !visible)
                  }
                  aria-label="Cambiar visibilidad en la red"
                  className={`relative w-10 h-6 rounded-full p-0.5 transition-colors ${
                    networkVisibility
                      ? 'bg-brand-primary'
                      : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      networkVisibility
                        ? 'translate-x-4'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Aplicación
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-normal text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Share2 className="h-4 w-4 text-neutral-500" />
                <span>Compartir</span>
              </button>

              {menuBtn(
                'support',
                <HelpCircle className="h-4 w-4 text-neutral-500" />,
                'Contactar a Soporte',
              )}
            </div>

            <div className="space-y-1">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Legal
              </div>

              {menuBtn(
                'terms',
                <FileText className="h-4 w-4 text-neutral-500" />,
                'Términos y Condiciones',
              )}

              {menuBtn(
                'privacy',
                <Shield className="h-4 w-4 text-neutral-500" />,
                'Política de Privacidad',
              )}
            </div>
          </div>

          <div className="border-t border-neutral-100 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      </div>

      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Enlace copiado
        </div>
      )}

      <style jsx>{`
        @keyframes sideMenuSlideIn {
          from {
            transform: translateX(60px);
            opacity: 0;
          }

          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}