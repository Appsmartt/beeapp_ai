'use client';

import './admin.css';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  Settings,
  ShieldCheck,
  CircleDollarSign,
  FileDown,
  Flag,
  Sparkles,
  Tags,
  UserCog,
  ScrollText,
} from 'lucide-react';
import { getAdminActivityFeed, listAdminStaff } from '@beeapp/api-client';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useExitTransition } from '@/components/motion/useExitTransition';
import AuthGuard from '@/lib/auth/AuthGuard';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatRelativeTime } from '@/lib/admin/format';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: '' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, permission: 'usuarios' },
  { href: '/admin/verificaciones', label: 'Verificaciones', icon: ShieldCheck, permission: 'verificaciones' },
  { href: '/admin/suscripciones', label: 'Suscripciones', icon: CreditCard, permission: 'suscripciones' },
  { href: '/admin/notificaciones', label: 'Notificaciones', icon: Bell, permission: 'notificaciones' },
  { href: '/admin/costos', label: 'Costos', icon: CircleDollarSign, permission: 'costos' },
  { href: '/admin/reportes', label: 'Reportes', icon: FileDown, permission: 'reportes' },
  { href: '/admin/moderacion', label: 'Moderación', icon: Flag, permission: 'moderacion' },
  { href: '/admin/promocionados', label: 'Promocionados', icon: Sparkles, permission: 'promocionados' },
  { href: '/admin/categorias', label: 'Categorías', icon: Tags, permission: 'categorias' },
  { href: '/admin/equipo', label: 'Equipo', icon: UserCog, permission: 'equipo' },
  { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText, permission: 'auditoria' },
  { href: '/admin/configuracion', label: 'Configuraciones', icon: Settings, permission: 'configuracion' },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Resumen del Panel';
  if (/^\/admin\/usuarios\/[^/]+$/.test(pathname)) return 'Detalle de Usuario';
  if (pathname.startsWith('/admin/usuarios')) return 'Usuarios Registrados';
  if (pathname.startsWith('/admin/verificaciones')) return 'Verificación de negocios';
  if (pathname.startsWith('/admin/suscripciones')) return 'Control de Suscripciones';
  if (pathname.startsWith('/admin/notificaciones')) return 'Notificaciones Push';
  if (pathname.startsWith('/admin/costos')) return 'Costos y simulador';
  if (pathname.startsWith('/admin/reportes')) return 'Reportes';
  if (pathname.startsWith('/admin/moderacion')) return 'Moderación';
  if (pathname.startsWith('/admin/promocionados')) return 'Espacios promocionados';
  if (pathname.startsWith('/admin/categorias')) return 'Categorías';
  if (pathname.startsWith('/admin/equipo')) return 'Equipo';
  if (pathname.startsWith('/admin/auditoria')) return 'Auditoría';
  if (pathname.startsWith('/admin/configuracion')) return 'Configuraciones Generales';
  if (pathname.startsWith('/admin/perfil')) return 'Perfil del Administrador';
  return 'Panel de Control';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { profile, signOut } = useAuth();
  const displayName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(' ') || 'Administrador';
  const shortName = profile?.lastName
    ? `${(profile.firstName || 'A').charAt(0)}. ${profile.lastName}`
    : displayName;
  const initials = `${(profile?.firstName || 'A').charAt(0)}${(profile?.lastName || '').charAt(0)}`.toUpperCase();
  const roleLabel = profile?.role === 'SUPERADMIN'
    ? 'Superadministrador'
    : 'Administrador';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarMotion = useExitTransition(sidebarOpen);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ id: string; text: string; time: string }>>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    listAdminStaff()
      .then((rows) => {
        const mine = rows.find((row) => row.id === profile.id);
        setPermissions(mine?.permissions || []);
      })
      .catch(() => setPermissions([]));
  }, [profile?.id]);

  const limited = profile?.role !== 'SUPERADMIN' && permissions.length > 0;
  const visibleItems = NAV_ITEMS.filter((item) => (
    !limited || item.permission === '' || item.permission === 'equipo' || permissions.includes(item.permission)
  ));
  const currentItem = NAV_ITEMS.find((item) => (
    item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
  ));
  const blocked = Boolean(
    limited
    && currentItem?.permission
    && currentItem.permission !== 'equipo'
    && !permissions.includes(currentItem.permission),
  );

  useEffect(() => {
    getAdminActivityFeed()
      .then((rows) => {
        setAlerts(rows.slice(0, 8).map((row) => ({
          id: String(row.id),
          text: row.descripcion,
          time: row.fecha ? formatRelativeTime(row.fecha) : '',
        })));
      })
      .catch(() => setAlerts([]));
  }, []);

  const handleLogoutClick = () => {
    setProfileDropdownOpen(false);
    setConfirmLogoutOpen(true);
  };

  const handleConfirmLogout = () => {
    setConfirmLogoutOpen(false);
    void signOut().finally(() => {
      router.replace('/login');
    });
  };

  return (
    <AuthGuard area="admin">
    <div className="admin-layout-container">
      {/* Sidebar Navigation - Fixed on desktop, collapsible on mobile/tablet */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo-container">
          <Image
            src="/logo.png"
            alt="Buddy Logo"
            width={48}
            height={48}
            className="sidebar-brand-logo"
            priority
          />
          <div className="sidebar-logo-text-col">
            <span className="sidebar-brand-title">Buddy</span>
            <span className="sidebar-brand-subtitle">Panel de Control</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="close-sidebar-mobile-btn">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const isActive = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-footer-profile">
            <div className="admin-footer-avatar">{initials}</div>
            <div className="admin-footer-meta">
              <span className="admin-footer-name">{shortName}</span>
              <span className="admin-footer-role">{roleLabel}</span>
            </div>
          </div>
          <button onClick={handleLogoutClick} className="sidebar-logout-btn">
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {sidebarMotion.mounted ? (
        <div
          className={`sidebar-overlay ${sidebarMotion.visible ? 'is-visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Main Workspace Frame */}
      <div className="admin-main-viewport">
        <header className="admin-topbar">
          <button onClick={() => setSidebarOpen(true)} className="hamburger-menu-btn">
            <Menu size={22} />
          </button>

          <div className="topbar-title-section">
            <h1 className="topbar-section-title">{getPageTitle(pathname)}</h1>
          </div>

          <div className="topbar-actions-section">
            <div className="topbar-search-box">
              <Search size={16} className="search-box-icon" />
              <input
                type="text"
                placeholder="Buscar usuarios, facturas..."
                className="topbar-search-input"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="topbar-action-icon-btn"
              >
                <Bell size={18} />
                {alerts.length > 0 ? <span className="notification-red-dot" /> : null}
              </button>

              {notificationsOpen && (
                <div className="notifications-popover-panel">
                  <div className="popover-panel-header">
                    <span className="popover-panel-title">Notificaciones</span>
                    <span className="popover-panel-mark-read">Marcar como leídas</span>
                  </div>
                  <div className="popover-notifications-list">
                    {alerts.length === 0 ? (
                      <p className="notification-row-text">No hay actividad reciente.</p>
                    ) : alerts.map((notif) => (
                      <div key={notif.id} className="notification-list-row">
                        <div className="notification-row-dot unread" />
                        <div className="notification-row-text-col">
                          <p className="notification-row-text">{notif.text}</p>
                          <span className="notification-row-time">{notif.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="topbar-profile-trigger"
              >
                <div className="topbar-profile-avatar">{initials}</div>
                <span className="topbar-profile-name">{displayName}</span>
                <ChevronDown size={14} className="topbar-profile-chevron" />
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown-popover">
                  <div className="dropdown-popover-header">
                    <span className="dropdown-popover-name">{displayName}</span>
                    <span className="dropdown-popover-email">{profile?.email || ''}</span>
                  </div>
                  <Link href="/admin/perfil" onClick={() => setProfileDropdownOpen(false)} className="dropdown-popover-row">
                    <User size={14} />
                    <span>Mi Perfil</span>
                  </Link>
                  <button onClick={handleLogoutClick} className="dropdown-popover-row text-red">
                    <LogOut size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content-canvas">
          {blocked ? (
            <div className="panel-card">
              <span className="panel-card-title">Sin permiso para esta sección</span>
            </div>
          ) : children}
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="¿Cerrar sesión de administrador?"
        description="Estás a punto de cerrar tu sesión de control y salir del panel de administración seguro."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </div>
    </AuthGuard>
  );
}
