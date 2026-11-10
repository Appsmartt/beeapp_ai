'use client';

import { useEffect, useState } from 'react';
import { listAdminStaff, listAdminUsers, setAdminStaff, type AdminStaffMember } from '@beeapp/api-client';
import { toAdminUser } from '@/lib/admin/mapRecords';

const PERMISSIONS = [
  ['usuarios', 'Usuarios'],
  ['verificaciones', 'Verificaciones'],
  ['suscripciones', 'Suscripciones'],
  ['notificaciones', 'Notificaciones'],
  ['configuracion', 'Configuración'],
  ['costos', 'Costos'],
  ['reportes', 'Reportes'],
  ['moderacion', 'Moderación'],
  ['promocionados', 'Promocionados'],
  ['categorias', 'Categorías'],
  ['auditoria', 'Auditoría'],
] as const;

export default function EquipoPage() {
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedId, setSelectedId] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    listAdminStaff()
      .then(setStaff)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el equipo.');
      });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!selectedId) {
      setError('Elige una persona.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await setAdminStaff({ userId: selectedId, role, permissions });
      setMessage('El rol quedó actualizado.');
      load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo cambiar el rol.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-card">
        <span className="panel-card-title">Administradores</span>
        {staff.map((member) => (
          <button
            key={member.id}
            type="button"
            className="feature-edit-row"
            onClick={() => {
              setSelectedId(member.id);
              setRole(member.role === 'SUPER_ADMIN' ? 'SUPERADMIN' : member.role);
              setPermissions(member.permissions);
            }}
          >
            <span className="feature-edit-text">{member.name} · {member.email} · {member.role}</span>
          </button>
        ))}
      </div>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="panel-card-title">Cambiar rol</span>
        <p className="form-hint">Solo un superadministrador puede cambiar roles. Si todavía no hay uno, el administrador actual puede hacerlo.</p>
        {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
        {message ? <p className="form-hint">{message}</p> : null}
        <div className="feature-add-row">
          <input
            className="form-field-input"
            value={search}
            placeholder="Buscar por nombre o correo"
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            className="confirm-dialog-btn-confirm"
            type="button"
            onClick={() => {
              void listAdminUsers({ search, page: 1, pageSize: 8 }).then((result) => {
                setFound(result.items.map(toAdminUser).map((user) => ({
                  id: user.id,
                  name: user.nombreCompleto,
                  email: user.email,
                })));
              });
            }}
          >
            Buscar
          </button>
        </div>
        {found.map((user) => (
          <button key={user.id} type="button" className="feature-edit-row" onClick={() => setSelectedId(user.id)}>
            <span className="feature-edit-text">{user.name} · {user.email}</span>
          </button>
        ))}
        <div className="form-field">
          <label className="form-field-label">Rol</label>
          <select className="form-field-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="USER">Usuario</option>
            <option value="ADMIN">Administrador</option>
            <option value="SUPERADMIN">Superadministrador</option>
          </select>
        </div>
        <div className="feature-toggle-list">
          {PERMISSIONS.map(([key, label]) => (
            <label key={key} className="feature-edit-row">
              <input
                type="checkbox"
                checked={permissions.includes(key)}
                onChange={(event) => {
                  setPermissions((current) => (
                    event.target.checked ? [...current, key] : current.filter((item) => item !== key)
                  ));
                }}
              />
              <span className="feature-edit-text">{label}</span>
            </label>
          ))}
        </div>
        <button className="confirm-dialog-btn-confirm" type="button" onClick={() => void save()}>Guardar rol</button>
      </div>
    </div>
  );
}
