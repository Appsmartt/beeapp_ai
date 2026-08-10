'use client';

import { useMemo, useState } from 'react';
import { Users, Filter, UserSearch, X, Search } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import { MOCK_USERS } from '@/mocks/users';
import { DASHBOARD_KPIS } from '@/mocks/metrics';
import type { NotificationRecipientMode, NotificationSegmentCriteria } from '@/mocks/types';
import { formatNumber } from '@/utils/format';

export interface RecipientSelection {
  mode: NotificationRecipientMode;
  criteria: NotificationSegmentCriteria;
  userIds: string[];
  estimatedCount: number;
}

const EMPTY_CRITERIA: NotificationSegmentCriteria = { planTier: '', estado: '', registroDias: '', visibilidad: '' };

export const DEFAULT_RECIPIENT_SELECTION: RecipientSelection = {
  mode: 'todos',
  criteria: EMPTY_CRITERIA,
  userIds: [],
  estimatedCount: DASHBOARD_KPIS.usuariosTotales,
};

const MODES: { value: NotificationRecipientMode; label: string; icon: typeof Users }[] = [
  { value: 'todos', label: 'Todos los usuarios', icon: Users },
  { value: 'segmento', label: 'Segmento de usuarios', icon: Filter },
  { value: 'especificos', label: 'Usuarios específicos', icon: UserSearch },
];

function countForCriteria(criteria: NotificationSegmentCriteria): number {
  const now = Date.now();
  return MOCK_USERS.filter((user) => {
    const matchesPlan = !criteria.planTier || (criteria.planTier === 'gratuito' ? user.planId === 'free' : user.planId !== 'free');
    const matchesEstado = !criteria.estado || user.estado === criteria.estado;
    const matchesVisibilidad = !criteria.visibilidad || user.visibilidadRed === criteria.visibilidad;
    const matchesRegistro =
      !criteria.registroDias || now - new Date(user.fechaRegistro).getTime() <= Number(criteria.registroDias) * 24 * 60 * 60 * 1000;
    return matchesPlan && matchesEstado && matchesVisibilidad && matchesRegistro;
  }).length;
}

function estimateFromCount(count: number): number {
  return Math.round(DASHBOARD_KPIS.usuariosTotales * (count / MOCK_USERS.length));
}

interface RecipientPickerProps {
  value: RecipientSelection;
  onChange: (value: RecipientSelection) => void;
}

export default function RecipientPicker({ value, onChange }: RecipientPickerProps) {
  const [search, setSearch] = useState('');

  const segmentEstimate = useMemo(() => estimateFromCount(countForCriteria(value.criteria)), [value.criteria]);

  const searchResults = useMemo(() => {
    if (!search) return [];
    return MOCK_USERS.filter(
      (user) =>
        !value.userIds.includes(user.id) &&
        (user.nombreCompleto.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 5);
  }, [search, value.userIds]);

  const selectedUsers = MOCK_USERS.filter((user) => value.userIds.includes(user.id));

  const setMode = (mode: NotificationRecipientMode) => {
    if (mode === 'todos') onChange({ mode, criteria: EMPTY_CRITERIA, userIds: [], estimatedCount: DASHBOARD_KPIS.usuariosTotales });
    else if (mode === 'segmento') onChange({ mode, criteria: EMPTY_CRITERIA, userIds: [], estimatedCount: estimateFromCount(MOCK_USERS.length) });
    else onChange({ mode, criteria: EMPTY_CRITERIA, userIds: [], estimatedCount: 0 });
  };

  const setCriteria = (patch: Partial<NotificationSegmentCriteria>) => {
    const criteria = { ...value.criteria, ...patch };
    onChange({ mode: 'segmento', criteria, userIds: [], estimatedCount: estimateFromCount(countForCriteria(criteria)) });
  };

  const addUser = (id: string) => {
    const userIds = [...value.userIds, id];
    onChange({ mode: 'especificos', criteria: EMPTY_CRITERIA, userIds, estimatedCount: userIds.length });
    setSearch('');
  };

  const removeUser = (id: string) => {
    const userIds = value.userIds.filter((item) => item !== id);
    onChange({ mode: 'especificos', criteria: EMPTY_CRITERIA, userIds, estimatedCount: userIds.length });
  };

  return (
    <div className="recipient-picker">
      <div className="recipient-mode-tabs">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className={`recipient-mode-tab ${value.mode === mode.value ? 'active' : ''}`}
            onClick={() => setMode(mode.value)}
          >
            <mode.icon size={15} />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {value.mode === 'todos' && (
        <div className="recipient-count-banner">
          <Users size={16} />
          <span>
            Se enviará a <strong>{formatNumber(value.estimatedCount)} usuarios</strong> registrados en la plataforma.
          </span>
        </div>
      )}

      {value.mode === 'segmento' && (
        <div className="recipient-segment-panel">
          <div className="filter-bar">
            <select className="filter-bar-select" value={value.criteria.planTier} onChange={(e) => setCriteria({ planTier: e.target.value as NotificationSegmentCriteria['planTier'] })}>
              <option value="">Plan (todos)</option>
              <option value="gratuito">Gratuito</option>
              <option value="de_pago">De pago</option>
            </select>
            <select className="filter-bar-select" value={value.criteria.estado} onChange={(e) => setCriteria({ estado: e.target.value as NotificationSegmentCriteria['estado'] })}>
              <option value="">Estado (todos)</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <select className="filter-bar-select" value={value.criteria.registroDias} onChange={(e) => setCriteria({ registroDias: e.target.value })}>
              <option value="">Fecha de registro (todas)</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
            </select>
            <select className="filter-bar-select" value={value.criteria.visibilidad} onChange={(e) => setCriteria({ visibilidad: e.target.value as NotificationSegmentCriteria['visibilidad'] })}>
              <option value="">Visibilidad (todas)</option>
              <option value="publico">Público</option>
              <option value="privado">Privado</option>
              <option value="solo_equipo">Solo equipo</option>
            </select>
          </div>
          <div className="recipient-count-banner">
            <Filter size={16} />
            <span>
              Coinciden aproximadamente <strong>{formatNumber(segmentEstimate)} usuarios</strong> con este segmento.
            </span>
          </div>
        </div>
      )}

      {value.mode === 'especificos' && (
        <div className="recipient-segment-panel">
          <div className="filter-bar-search-box" style={{ width: '100%' }}>
            <Search size={16} className="filter-bar-search-icon" />
            <input
              className="filter-bar-search-input"
              placeholder="Buscar usuarios por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="recipient-search-results">
              {searchResults.map((user) => (
                <button key={user.id} type="button" className="recipient-search-result-row" onClick={() => addUser(user.id)}>
                  <div className="table-user-avatar">{user.iniciales}</div>
                  <div className="table-user-name-col">
                    <div className="table-user-name-row">
                      <span className="table-user-name">{user.nombreCompleto}</span>
                      {user.verificacionRed === 'verificado' && <VerifiedBadge size={13} />}
                    </div>
                    <span className="table-user-email">{user.email}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedUsers.length > 0 && (
            <div className="recipient-chips">
              {selectedUsers.map((user) => (
                <span key={user.id} className="recipient-chip">
                  {user.nombreCompleto}
                  <button type="button" onClick={() => removeUser(user.id)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="recipient-count-banner">
            <UserSearch size={16} />
            <span>
              Seleccionaste <strong>{formatNumber(value.userIds.length)} usuarios</strong> específicos.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
