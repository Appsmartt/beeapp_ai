'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: Users },
  { href: '/dashboard/suscripciones', label: 'Suscripciones', icon: CreditCard },
  { href: '/dashboard/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/dashboard/configuracion', label: 'Configuraciones', icon: Settings },
];

const TOPBAR_ALERTS = [
  { id: 1, text: 'Nueva suscripción Plus anual de María Gómez', time: 'Hace 5m', read: false },
  { id: 2, text: 'Renovación de cobro fallida: Laura Ramos', time: 'Hace 15m', read: false },
  { id: 3, text: 'Alerta de API: Sincronización fallida Outlook para Sofía Castro', time: 'Hace 2h', read: true },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Resumen del Panel';
  if (/^\/dashboard\/usuarios\/[^/]+$/.test(pathname)) return 'Detalle de Usuario';
  if (pathname.startsWith('/dashboard/usuarios')) return 'Usuarios Registrados';
  if (pathname.startsWith('/dashboard/suscripciones')) return 'Control de Suscripciones';
  if (pathname.startsWith('/dashboard/notificaciones')) return 'Notificaciones Push';
  if (pathname.startsWith('/dashboard/configuracion')) return 'Configuraciones Generales';
  if (pathname.startsWith('/dashboard/perfil')) return 'Perfil del Administrador';
  return 'Panel de Control';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const handleLogoutClick = () => {
    setProfileDropdownOpen(false);
    setConfirmLogoutOpen(true);
  };

  const handleConfirmLogout = () => {
    setConfirmLogoutOpen(false);
    router.replace('/login');
  };

  return (
    <div className="admin-layout-container">
      {/* Sidebar Navigation - Fixed on desktop, collapsible on mobile/tablet */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo-container">
          <Image
            src="/logo.png"
            alt="BeeApp Logo"
            width={48}
            height={48}
            className="sidebar-brand-logo"
            priority
          />
          <div className="sidebar-logo-text-col">
            <span className="sidebar-brand-title">BeeApp AI</span>
            <span className="sidebar-brand-subtitle">Panel de Control</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="close-sidebar-mobile-btn">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
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
            <div className="admin-footer-avatar">SV</div>
            <div className="admin-footer-meta">
              <span className="admin-footer-name">S. Valencia</span>
              <span className="admin-footer-role">Administrador</span>
            </div>
          </div>
          <button onClick={handleLogoutClick} className="sidebar-logout-btn">
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

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
                <span className="notification-red-dot" />
              </button>

              {notificationsOpen && (
                <div className="notifications-popover-panel">
                  <div className="popover-panel-header">
                    <span className="popover-panel-title">Notificaciones</span>
                    <span className="popover-panel-mark-read">Marcar como leídas</span>
                  </div>
                  <div className="popover-notifications-list">
                    {TOPBAR_ALERTS.map((notif) => (
                      <div key={notif.id} className="notification-list-row">
                        <div className={`notification-row-dot ${notif.read ? 'read' : 'unread'}`} />
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
                <div className="topbar-profile-avatar">SV</div>
                <span className="topbar-profile-name">Santiago Valencia</span>
                <ChevronDown size={14} className="topbar-profile-chevron" />
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown-popover">
                  <div className="dropdown-popover-header">
                    <span className="dropdown-popover-name">Santiago Valencia</span>
                    <span className="dropdown-popover-email">santiago@beeapp.ai</span>
                  </div>
                  <Link href="/dashboard/perfil" onClick={() => setProfileDropdownOpen(false)} className="dropdown-popover-row">
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

        <main className="admin-content-canvas">{children}</main>
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
  );
}
