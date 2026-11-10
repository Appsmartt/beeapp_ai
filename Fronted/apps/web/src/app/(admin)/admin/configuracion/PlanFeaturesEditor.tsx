'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import type { PlanEntitlements } from '@/lib/admin/types';

interface PlanFeaturesEditorProps {
  entitlements: PlanEntitlements;
  caracteristicas: string[];
  onEntitlementsChange: (value: PlanEntitlements) => void;
  onCaracteristicasChange: (list: string[]) => void;
}

const NUMBER_FIELDS: Array<{ key: keyof PlanEntitlements; label: string }> = [
  { key: 'groups', label: 'Grupos' },
  { key: 'groupMembers', label: 'Integrantes por grupo' },
  { key: 'callMinutes', label: 'Minutos de llamadas al mes' },
  { key: 'mailAccounts', label: 'Cuentas de correo' },
  { key: 'calendars', label: 'Calendarios conectados' },
  { key: 'filesGb', label: 'Archivos (GB)' },
  { key: 'mailStorageGb', label: 'Correo (GB)' },
  { key: 'catalogOffers', label: 'Productos del catálogo' },
  { key: 'aiCredits', label: 'Créditos de IA al mes' },
  { key: 'signatures', label: 'Firmas al mes' },
  { key: 'documentJobs', label: 'Trabajos de documentos' },
  { key: 'transcriptionMinutes', label: 'Minutos de transcripción' },
];

export default function PlanFeaturesEditor({
  entitlements,
  caracteristicas,
  onEntitlementsChange,
  onCaracteristicasChange,
}: PlanFeaturesEditorProps) {
  const [nueva, setNueva] = useState('');

  const setNumber = (key: keyof PlanEntitlements, raw: string, unlimited: boolean) => {
    onEntitlementsChange({
      ...entitlements,
      [key]: unlimited || raw.trim() === '' ? null : Math.max(0, Number(raw) || 0),
    });
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= caracteristicas.length) return;
    const next = [...caracteristicas];
    [next[index], next[target]] = [next[target], next[index]];
    onCaracteristicasChange(next);
  };

  const add = () => {
    const value = nueva.trim();
    if (!value) return;
    onCaracteristicasChange([...caracteristicas, value]);
    setNueva('');
  };

  return (
    <>
      <div className="panel-card">
        <span className="panel-card-title">Cupos del plan</span>
        <p className="form-hint">Vacío o “Sin límite” significa que ese cupo no se corta. Los precios de arriba son los que cobra Wompi, en pesos.</p>
        <div className="plan-limits-grid">
          {NUMBER_FIELDS.map((field) => {
            const value = entitlements[field.key];
            const unlimited = value == null;
            return (
              <div key={field.key} className="form-field">
                <label className="form-field-label">{field.label}</label>
                <input
                  type="number"
                  min={0}
                  className="form-field-input"
                  disabled={unlimited}
                  value={unlimited ? '' : String(value)}
                  placeholder="Sin límite"
                  onChange={(event) => setNumber(field.key, event.target.value, false)}
                />
                <label className="form-hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={(event) => setNumber(field.key, unlimited ? '0' : '', event.target.checked)}
                  />
                  Sin límite
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel-card">
        <span className="panel-card-title">Funciones incluidas</span>
        <div className="form-field">
          <label className="form-field-label">Nivel del asistente</label>
          <select
            className="form-field-input"
            value={entitlements.aiLevel}
            onChange={(event) => onEntitlementsChange({ ...entitlements, aiLevel: event.target.value })}
          >
            <option value="basic">Cuota básica</option>
            <option value="expanded">Ampliada</option>
            <option value="commercial">IA comercial</option>
            <option value="custom">Personalizada</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-field-label">Automatizaciones de IA</label>
          <select
            className="form-field-input"
            value={entitlements.automations}
            onChange={(event) => onEntitlementsChange({ ...entitlements, automations: event.target.value })}
          >
            <option value="none">No incluidas</option>
            <option value="basic">Básicas</option>
            <option value="advanced">Avanzadas</option>
            <option value="custom">Personalizadas</option>
          </select>
        </div>
        <div className="feature-toggle-list">
          {([
            ['transcription', 'Transcripción y resúmenes'],
            ['documentProcessing', 'Procesamiento de documentos'],
          ] as const).map(([key, label]) => (
            <div key={key} className="feature-toggle-row">
              <span className="feature-toggle-label">{label}</span>
              <button
                type="button"
                className={`toggle-switch ${entitlements[key] ? 'on' : ''}`}
                onClick={() => onEntitlementsChange({ ...entitlements, [key]: !entitlements[key] })}
              >
                <span className="toggle-switch-knob" />
              </button>
            </div>
          ))}
        </div>
        <div className="form-field">
          <label className="form-field-label">Storage extra</label>
          <select
            className="form-field-input"
            value={String(entitlements.storageAddon)}
            onChange={(event) => onEntitlementsChange({
              ...entitlements,
              storageAddon: event.target.value === 'true' ? true : event.target.value === 'false' ? false : event.target.value,
            })}
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
            <option value="included">Incluido</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-field-label">Créditos de IA extra</label>
          <select
            className="form-field-input"
            value={String(entitlements.extraAiCredits)}
            onChange={(event) => onEntitlementsChange({
              ...entitlements,
              extraAiCredits: event.target.value === 'true' ? true : event.target.value === 'false' ? false : event.target.value,
            })}
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
            <option value="discount">Sí, con descuento</option>
            <option value="included">Incluido</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-field-label">Espacios promocionados</label>
          <select
            className="form-field-input"
            value={String(entitlements.promotedSpaces)}
            onChange={(event) => onEntitlementsChange({
              ...entitlements,
              promotedSpaces: event.target.value === 'true' ? true : event.target.value === 'false' ? false : event.target.value,
            })}
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
            <option value="identified">Sí, identificados</option>
          </select>
        </div>
      </div>

      <div className="panel-card">
        <span className="panel-card-title">Texto que ve el usuario</span>
        {caracteristicas.length === 0 && <p className="activity-feed-empty">Agrega al menos una característica.</p>}
        <div className="feature-edit-list">
          {caracteristicas.map((feature, index) => (
            <div key={`${feature}-${index}`} className="feature-edit-row">
              <span className="feature-edit-text">{feature}</span>
              <div className="feature-edit-actions">
                <button className="table-row-action-btn" title="Subir" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ChevronUp size={14} />
                </button>
                <button
                  className="table-row-action-btn"
                  title="Bajar"
                  disabled={index === caracteristicas.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown size={14} />
                </button>
                <button className="table-row-action-btn" title="Eliminar" onClick={() => onCaracteristicasChange(caracteristicas.filter((_, item) => item !== index))}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="feature-add-row">
          <input
            className="form-field-input"
            value={nueva}
            maxLength={80}
            placeholder="Nueva característica..."
            onChange={(event) => setNueva(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add();
            }}
          />
          <button className="confirm-dialog-btn-confirm" disabled={!nueva.trim()} onClick={add}>
            <Plus size={14} />
            <span>Agregar</span>
          </button>
        </div>
      </div>
    </>
  );
}
