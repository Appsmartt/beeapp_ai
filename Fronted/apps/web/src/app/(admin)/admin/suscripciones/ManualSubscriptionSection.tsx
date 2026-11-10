'use client';

import { useState } from 'react';
import { listAdminSubscriptionEvents, listAdminUsers, setAdminSubscription } from '@beeapp/api-client';
import { toAdminUser } from '@/lib/admin/mapRecords';

type EventRow = {
  id: string;
  action: string;
  source: string;
  planId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  activated: 'Pago activado',
  renewed: 'Periodo extendido',
  expired: 'Periodo vencido',
  manual_grant: 'Asignación manual',
  revoked: 'Plan cortado',
  cancel_scheduled: 'Cancelación al final del periodo',
  reactivated: 'Cancelación retirada',
};

const QUOTA_FIELDS: Array<[string, string]> = [
  ['groups', 'Grupos'],
  ['groupMembers', 'Integrantes por grupo'],
  ['callMinutes', 'Minutos de llamadas al mes'],
  ['mailAccounts', 'Cuentas de correo'],
  ['calendars', 'Calendarios'],
  ['filesGb', 'Archivos (GB)'],
  ['mailStorageGb', 'Correo (GB)'],
  ['catalogOffers', 'Productos del catálogo'],
  ['aiCredits', 'Créditos de IA al mes'],
  ['signatures', 'Firmas al mes'],
  ['documentJobs', 'Trabajos de documentos'],
  ['transcriptionMinutes', 'Minutos de transcripción'],
];

const EXTRA_FIELDS: Array<[string, string]> = [
  ['aiCredits', 'Créditos extra de IA'],
  ['filesGb', 'Almacenamiento extra (GB)'],
];

function localInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ManualSubscriptionSection() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [userId, setUserId] = useState('');
  const [planId, setPlanId] = useState('plus');
  const [startsAt, setStartsAt] = useState(localInput(new Date()));
  const [endsAt, setEndsAt] = useState(localInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [reason, setReason] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadEvents = async (id: string) => {
    const rows = await listAdminSubscriptionEvents(id);
    setEvents(rows.map((row) => ({
      id: String(row.id || ''),
      action: String(row.action || ''),
      source: String(row.source || ''),
      planId: String(row.planId || ''),
      startsAt: row.startsAt ? new Date(String(row.startsAt)).toLocaleString('es-CO') : '',
      endsAt: row.endsAt ? new Date(String(row.endsAt)).toLocaleString('es-CO') : '',
      reason: String(row.reason || ''),
      createdAt: row.createdAt ? new Date(String(row.createdAt)).toLocaleString('es-CO') : '',
    })));
  };

  const searchUsers = async () => {
    setError('');
    const result = await listAdminUsers({ search, page: 1, pageSize: 8 });
    setUsers(result.items.map(toAdminUser).map((user) => ({
      id: user.id,
      name: user.nombreCompleto,
      email: user.email,
    })));
  };

  const save = async () => {
    if (!userId) {
      setError('Elige un usuario.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const customQuotas: Record<string, number> = {};
      const quotaFields = planId === 'enterprise' ? QUOTA_FIELDS : EXTRA_FIELDS;
      for (const [key, label] of quotaFields) {
        const raw = (overrides[key] || '').trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
          setError(`El cupo de ${label} debe ser un número mayor o igual a cero.`);
          setBusy(false);
          return;
        }
        customQuotas[key] = value;
      }
      await setAdminSubscription({
        userId,
        planId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: planId === 'free' ? null : new Date(endsAt).toISOString(),
        reason,
        overrides: customQuotas,
      });
      setMessage('La suscripción quedó registrada.');
      await loadEvents(userId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la suscripción.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span className="panel-card-title">Activar o cortar una suscripción</span>
      <p className="form-hint">
        El cambio queda con fecha de inicio, fecha de fin, motivo y la persona que lo hizo. Enterprise no se compra: se asigna aquí. Al llegar la fecha de fin, la cuenta vuelve a Free.
      </p>
      <div className="feature-add-row">
        <input
          className="form-field-input"
          value={search}
          placeholder="Buscar por nombre o correo"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void searchUsers();
          }}
        />
        <button className="confirm-dialog-btn-confirm" type="button" onClick={() => void searchUsers()}>
          Buscar
        </button>
      </div>
      {users.length > 0 ? (
        <div className="feature-edit-list">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="feature-edit-row"
              onClick={() => {
                setUserId(user.id);
                void loadEvents(user.id).catch(() => setEvents([]));
              }}
              style={{ textAlign: 'left', background: user.id === userId ? '#F3E8FF' : 'transparent' }}
            >
              <span className="feature-edit-text">{user.name} · {user.email}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="plan-limits-grid">
        <div className="form-field">
          <label className="form-field-label">Plan</label>
          <select className="form-field-input" value={planId} onChange={(event) => setPlanId(event.target.value)}>
            <option value="free">Free</option>
            <option value="plus">Plus</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-field-label">Inicio</label>
          <input className="form-field-input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        </div>
        {planId !== 'free' ? (
          <div className="form-field">
            <label className="form-field-label">Fin</label>
            <input className="form-field-input" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </div>
        ) : null}
      </div>
      <div className="form-field">
        <label className="form-field-label">Motivo</label>
        <textarea className="form-field-textarea" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
      <div className="plan-limits-grid">
        {(planId === 'enterprise' ? QUOTA_FIELDS : EXTRA_FIELDS).map(([key, label]) => (
            <div className="form-field" key={key}>
              <label className="form-field-label">{label}</label>
              <input
                className="form-field-input"
                inputMode="numeric"
                placeholder="Vacío = sin límite"
                value={overrides[key] || ''}
                onChange={(event) => setOverrides((current) => ({ ...current, [key]: event.target.value }))}
              />
            </div>
          ))}
      </div>
      <p className="form-hint">
        Los créditos extra de IA y de almacenamiento se pueden asignar en cualquier plan. El resto de cupos personalizados queda en Enterprise.
      </p>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      {message ? <p className="form-hint">{message}</p> : null}
      <button className="confirm-dialog-btn-confirm" type="button" disabled={busy} onClick={() => void save()}>
        {busy ? 'Guardando…' : 'Guardar suscripción'}
      </button>
      {events.length > 0 ? (
        <div className="feature-edit-list">
          {events.map((event) => (
            <div key={event.id} className="feature-edit-row">
              <span className="feature-edit-text">
                {event.createdAt} · {ACTION_LABELS[event.action] || event.action} · {event.planId}
                {event.endsAt ? ` · hasta ${event.endsAt}` : ''}
                {event.reason ? ` · ${event.reason}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
