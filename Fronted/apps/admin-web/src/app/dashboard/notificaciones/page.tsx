'use client';

import { useState } from 'react';
import { Send, History } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications';
import type { NotificationCampaign } from '@/mocks/types';
import SendSection from './SendSection';
import HistorySection from './HistorySection';

type Tab = 'enviar' | 'historial';

export default function NotificacionesPage() {
  const [tab, setTab] = useState<Tab>('enviar');
  const [notifications, setNotifications] = useState<NotificationCampaign[]>(MOCK_NOTIFICATIONS);
  const [editingCampaign, setEditingCampaign] = useState<NotificationCampaign | null>(null);

  const handleSend = (campaign: NotificationCampaign) => {
    setNotifications((prev) => {
      const exists = prev.some((item) => item.id === campaign.id);
      return exists ? prev.map((item) => (item.id === campaign.id ? campaign : item)) : [campaign, ...prev];
    });
    setTab('historial');
  };

  const handleCancel = (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, estado: 'cancelada' } : item)));
  };

  const handleEdit = (campaign: NotificationCampaign) => {
    setEditingCampaign(campaign);
    setTab('enviar');
  };

  return (
    <div>
      <div className="page-toolbar">
        <div className="page-toolbar-heading">
          <span className="page-toolbar-title">Notificaciones push</span>
          <span className="page-toolbar-subtitle">Envía y monitorea comunicaciones a los usuarios de BeeApp</span>
        </div>
      </div>

      <div className="recipient-mode-tabs" style={{ marginBottom: 20 }}>
        <button className={`recipient-mode-tab ${tab === 'enviar' ? 'active' : ''}`} onClick={() => setTab('enviar')}>
          <Send size={15} />
          <span>Enviar</span>
        </button>
        <button className={`recipient-mode-tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>
          <History size={15} />
          <span>Historial</span>
        </button>
      </div>

      {tab === 'enviar' ? (
        <SendSection onSend={handleSend} editingCampaign={editingCampaign} onDoneEditing={() => setEditingCampaign(null)} />
      ) : (
        <HistorySection notifications={notifications} onCancel={handleCancel} onEdit={handleEdit} />
      )}
    </div>
  );
}
