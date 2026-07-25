'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import type { PlanFeatureKey } from '@/mocks/types';
import { PLAN_FEATURE_LABELS } from '@/utils/labels';

interface PlanFeaturesEditorProps {
  funciones: Record<PlanFeatureKey, boolean>;
  caracteristicas: string[];
  onToggle: (key: PlanFeatureKey, value: boolean) => void;
  onCaracteristicasChange: (list: string[]) => void;
}

export default function PlanFeaturesEditor({
  funciones,
  caracteristicas,
  onToggle,
  onCaracteristicasChange,
}: PlanFeaturesEditorProps) {
  const [nueva, setNueva] = useState('');

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= caracteristicas.length) return;
    const next = [...caracteristicas];
    [next[index], next[target]] = [next[target], next[index]];
    onCaracteristicasChange(next);
  };

  const remove = (index: number) => {
    onCaracteristicasChange(caracteristicas.filter((_, i) => i !== index));
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
        <span className="panel-card-title">Funciones incluidas</span>
        <div className="feature-toggle-list">
          {(Object.keys(PLAN_FEATURE_LABELS) as PlanFeatureKey[]).map((key) => (
            <div key={key} className="feature-toggle-row">
              <span className="feature-toggle-label">{PLAN_FEATURE_LABELS[key]}</span>
              <button
                type="button"
                className={`toggle-switch ${funciones[key] ? 'on' : ''}`}
                onClick={() => onToggle(key, !funciones[key])}
                aria-label={`${funciones[key] ? 'Desactivar' : 'Activar'} ${PLAN_FEATURE_LABELS[key]}`}
              >
                <span className="toggle-switch-knob" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-card">
        <span className="panel-card-title">Características destacadas</span>
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
                <button className="table-row-action-btn" title="Eliminar" onClick={() => remove(index)}>
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
            maxLength={60}
            placeholder="Nueva característica..."
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
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
