'use client';

import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
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
  UserCheck,
} from 'lucide-react';
import { getCurrentWebProfile } from '@beeapp/api-client';
import type { CurrentUserProfile } from '@beeapp/shared-types';
import BuddyLogo from '@/components/shared/BuddyLogo';
import ProfileAvatar from '@/components/client/ProfileAvatar';
import { resolveProfileAvatarUrl } from '@/lib/client/profileAvatarService';
import { getWebAuth } from '@/lib/client/webAuth';
import MotionDrawer from '@/components/motion/MotionDrawer';
import MotionOverlay from '@/components/motion/MotionOverlay';
import { useExitTransition } from '@/components/motion/useExitTransition';
import { useAuth } from '@/lib/auth/AuthProvider';

type MenuUser = {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  isVerified: boolean;
};

const INITIAL_MENU_USER: MenuUser = {
  name: 'Cargando perfil...',
  email: '',
  initials: '?',
  avatarUrl: null,
  isVerified: false,
};

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

function getFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const fullName = [firstName, lastName]
    .filter(
      (name): name is string => (
        typeof name === 'string'
        && name.trim().length > 0
      ),
    )
    .join(' ');

  return fullName || 'Usuario Buddy';
}

function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const firstInitial =
    firstName?.trim().charAt(0).toUpperCase() ?? '';

  const lastInitial =
    lastName?.trim().charAt(0).toUpperCase() ?? '';

  return `${firstInitial}${lastInitial}` || '?';
}

function getMenuUser(
  profile: CurrentUserProfile,
  avatarUrl: string | null = null,
): MenuUser {
  return {
    name: getFullName(
      profile.first_name,
      profile.last_name,
    ),
    email: profile.email ?? '',
    initials: getInitials(
      profile.first_name,
      profile.last_name,
    ),
    avatarUrl,
    isVerified: profile.verification_status === 'verificado',
  };
}

export default function SideMenu({
  isOpen,
  onClose,
}: SideMenuProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const menuMotion = useExitTransition(isOpen);

  const [networkVisibility, setNetworkVisibility] =
    useState(true);

  const [toastVisible, setToastVisible] = useState(false);

  const [menuUser, setMenuUser] = useState<MenuUser>(
    INITIAL_MENU_USER,
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    setMenuUser((current) => ({
      ...current,
      name: getFullName(profile.firstName, profile.lastName),
      email: profile.email,
      initials: getInitials(profile.firstName, profile.lastName),
    }));
  }, [profile]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadMenuProfile = async () => {
      try {
        const response = await getCurrentWebProfile();
        const auth = await getWebAuth();
        const avatarUrl = await resolveProfileAvatarUrl(
          response.profile,
          auth,
        );

        if (!isMounted) {
          return;
        }

        setMenuUser(getMenuUser(response.profile, avatarUrl));
      } catch {
        if (!isMounted) {
          return;
        }

        setMenuUser((current) => ({
          ...current,
          name: 'No fue posible cargar el perfil',
          email: '',
          initials: '?',
          avatarUrl: null,
          isVerified: false,
        }));
      }
    };

    void loadMenuProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      onClose();
      router.replace('/login');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const openPage = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleShare = () => {
    setToastVisible(true);

    window.setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  };

  const handleOpenBuddyServices = () => {
    openPage('/app/beeservices');
  };

  const navItem = (href: string, icon: ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => openPage(href)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-normal text-neutral-700 transition-colors hover:bg-neutral-50"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  if (!menuMotion.mounted) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      aria-hidden={!menuMotion.visible}
    >
      <MotionOverlay
        visible={menuMotion.visible}
        onClick={handleClose}
        label="Cerrar menú"
      />

      <MotionDrawer
        visible={menuMotion.visible}
        side="right"
        className="relative z-50 flex h-full overflow-hidden rounded-l-3xl bg-white shadow-2xl"
      >
        <aside className="flex h-full w-[340px] flex-col overflow-y-auto bg-white">
          <div className="px-5 pt-5">
            <BuddyLogo height={30} />
          </div>

          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 p-5">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                initials={menuUser.initials}
                avatarUrl={menuUser.avatarUrl}
                size="sm"
              />

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  <span>{menuUser.name}</span>

                  {menuUser.isVerified ? (
                    <UserCheck className="h-4 w-4 shrink-0 text-brand-primary" />
                  ) : null}
                </div>

                {menuUser.email ? (
                  <p className="text-xs font-normal text-neutral-500">
                    {menuUser.email}
                  </p>
                ) : null}
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
                onClick={handleOpenBuddyServices}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-normal text-neutral-700 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
              >
                <Store className="h-4 w-4 text-neutral-500" />
                <span>BuddyServices</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Mi Cuenta
              </div>

              {navItem(
                '/app/profile/edit',
                <UserCheck className="h-4 w-4 text-neutral-500" />,
                'Editar Perfil',
              )}

              {navItem(
                '/app/profile/subscription',
                <CreditCard className="h-4 w-4 text-neutral-500" />,
                'Suscripción y Verificación',
              )}

              {navItem(
                '/app/profile/integrations',
                <LinkIcon className="h-4 w-4 text-neutral-500" />,
                'Integraciones Externas',
              )}

              {navItem(
                '/app/profile/security',
                <ShieldCheck className="h-4 w-4 text-neutral-500" />,
                'Seguridad y PIN',
              )}

              {navItem(
                '/app/profile/ai-settings',
                <Bot className="h-4 w-4 text-neutral-500" />,
                'Configuración del Asistente',
              )}

              {navItem(
                '/app/profile/devices',
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
                  onClick={() => {
                    setNetworkVisibility((visible) => !visible);
                  }}
                  aria-label="Cambiar visibilidad en la red"
                  className={`relative h-6 w-10 rounded-full p-0.5 transition-colors ${
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

              {navItem(
                '/app/profile/support',
                <HelpCircle className="h-4 w-4 text-neutral-500" />,
                'Contactar a Soporte',
              )}
            </div>

            <div className="space-y-1">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Legal
              </div>

              {navItem(
                '/app/profile/terms',
                <FileText className="h-4 w-4 text-neutral-500" />,
                'Términos y Condiciones',
              )}

              {navItem(
                '/app/profile/privacy',
                <Shield className="h-4 w-4 text-neutral-500" />,
                'Política de Privacidad',
              )}
            </div>
          </div>

          <div className="border-t border-neutral-100 p-4">
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      </MotionDrawer>

      {toastVisible ? (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Enlace copiado
        </div>
      ) : null}
    </div>
  );
}