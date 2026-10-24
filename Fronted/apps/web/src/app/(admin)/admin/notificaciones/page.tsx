'use client';

import { useEffect, useState } from 'react';
import { Send, History } from 'lucide-react';
import { listAdminCampaigns } from '@beeapp/api-client';
import type { NotificationCampaign, NotificationStatus } from '@/lib/admin/types';
import SendSection from './SendSection';
import HistorySection from './HistorySection';

type Tab = 'enviar' | 'historial';

export default function NotificacionesPage() {
  const [tab, setTab] = useState<Tab>('enviar');
  const [notifications, setNotifications] = useState<NotificationCampaign[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<NotificationCampaign | null>(null);
  const [error, setError] = useState('');

  const loadCampaigns = async () => {
    const rows = await listAdminCampaigns();
    setNotifications(rows.map((row) => ({
      id: String(row.id || ''),
      titulo: String(row.titulo || ''),
      mensaje: String(row.mensaje || ''),
      modoDestinatario: (row.modoDestinatario || 'todos') as NotificationCampaign['modoDestinatario'],
      cantidadDestinatarios: Number(row.cantidadDestinatarios || 0),
      fechaEnvio: String(row.fechaEnvio || ''),
      estado: String(row.estado || 'enviada') as NotificationStatus,
      entregados: Number(row.entregados || 0),
      abiertos: Number(row.abiertos || 0),
    })));
  };

  useEffect(() => {
    loadCampaigns().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el historial.');
    });
  }, []);

  const handleSend = () => {
    setTab('historial');
    loadCampaigns().catch(() => undefined);
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
          <span className="page-toolbar-subtitle">Envía y monitorea comunicaciones a los usuarios de Buddy</span>
        </div>
      </div>

      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}

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
