'use client';

import { useEffect, useState } from 'react';
import { listAdminCategories, saveAdminCategory, type AdminCategory } from '@beeapp/api-client';

const EMPTY = { id: '', name: '', offerType: 'mixed', sortOrder: '0', active: true };

export default function CategoriasPage() {
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = () => {
    listAdminCategories()
      .then(setRows)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las categorías.');
      });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (active = form.active) => {
    setError('');
    try {
      await saveAdminCategory({
        id: form.id || null,
        name: form.name,
        offerType: form.offerType,
        sortOrder: Number(form.sortOrder) || 0,
        active,
      });
      setForm(EMPTY);
      load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la categoría.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="panel-card-title">{form.id ? 'Renombrar categoría' : 'Nueva categoría'}</span>
        {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
        <div className="plan-limits-grid">
          <div className="form-field">
            <label className="form-field-label">Nombre</label>
            <input className="form-field-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-field-label">Tipo</label>
            <select className="form-field-input" value={form.offerType} onChange={(event) => setForm((current) => ({ ...current, offerType: event.target.value }))}>
              <option value="products">Productos</option>
              <option value="services">Servicios</option>
              <option value="mixed">Mixto</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-field-label">Orden</label>
            <input className="form-field-input" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          </div>
        </div>
        <button className="confirm-dialog-btn-confirm" type="button" onClick={() => void save()}>Guardar</button>
      </div>
      <div className="panel-card">
        {rows.map((category) => (
          <div key={category.id} className="feature-edit-row">
            <span className="feature-edit-text">
              {category.name} · {category.offerType} · {category.isActive ? 'activa' : 'archivada'}
            </span>
            <button
              type="button"
              onClick={() => setForm({
                id: category.id,
                name: category.name,
                offerType: category.offerType,
                sortOrder: String(category.sortOrder),
                active: category.isActive,
              })}
            >
              Editar
            </button>
            <button type="button" onClick={() => {
              setForm({
                id: category.id,
                name: category.name,
                offerType: category.offerType,
                sortOrder: String(category.sortOrder),
                active: false,
              });
              void saveAdminCategory({
                id: category.id,
                name: category.name,
                offerType: category.offerType,
                sortOrder: category.sortOrder,
                active: !category.isActive,
              }).then(load).catch((archiveError: unknown) => {
                setError(archiveError instanceof Error ? archiveError.message : 'No se pudo archivar.');
              });
            }}
            >
              {category.isActive ? 'Archivar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
