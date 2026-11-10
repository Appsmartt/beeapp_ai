'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, MessageSquare, Phone, HardDrive, Clock, Check, X } from 'lucide-react';
import {
  applyAdminSanction,
  getAdminUserDetail,
  listAdminPlans,
  setAdminReportStatus,
  setAdminSubscription,
  setAdminUserStatus,
} from '@beeapp/api-client';
import KpiGrid, { type KpiItem } from '@/components/admin/KpiGrid';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import VerifiedBadge from '@/components/admin/VerifiedBadge';
import PlanBadge from '@/components/admin/PlanBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import ModerationSection from './ModerationSection';
import NetworkSection from './NetworkSection';
import type {
  AdminUser,
  NetworkVisibility,
  Plan,
  ReportStatus,
  SanctionType,
  Transaction,
  UserReport,
  UserSanction,
  UserStatus,
  VerificationStatus,
} from '@/lib/admin/types';
import { detailCollections, toPlan } from '@/lib/admin/mapRecords';
import { formatCurrencyCOP, formatDate, formatRelativeTime } from '@/lib/admin/format';
import { VISIBILITY_LABELS } from '@/lib/admin/labels';

function localDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TRANSACTION_COLUMNS: DataTableColumn<Transaction>[] = [
  { key: 'fecha', header: 'Fecha', render: (row) => (row.fecha ? formatDate(row.fecha) : '—') },
  { key: 'plan', header: 'Plan', render: (row) => <PlanBadge planId={row.planId} /> },
  { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
  { key: 'monto', header: 'Monto', align: 'right', render: (row) => formatCurrencyCOP(row.monto) },
];

export default function UsuarioDetallePage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('free');
  const [planReason, setPlanReason] = useState('Cambio manual');
  const [planNotice, setPlanNotice] = useState('');
  const [planEndsAt, setPlanEndsAt] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return localDateTimeInput(date);
  });
  const [busy, setBusy] = useState(false);
  const [confirmInactive, setConfirmInactive] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [estado, setEstado] = useState<UserStatus>('activo');
  const [visibilidadRed, setVisibilidadRed] = useState<NetworkVisibility>('publico');
  const [verificacionRed, setVerificacionRed] = useState<VerificationStatus>('no_solicitado');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [sanctions, setSanctions] = useState<UserSanction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const applyDetail = (row: Record<string, unknown>, plans: Plan[]) => {
    const detail = detailCollections(row);
    setUser(detail.user);
    setHistory(detail.transactions);
    setReports(detail.reports);
    setSanctions(detail.sanctions);
    setEstado(detail.user.estado);
    setVisibilidadRed(detail.user.visibilidadRed);
    setVerificacionRed(detail.user.verificacionRed);
    setPlan(plans.find((item) => item.id === detail.user.planId) ?? null);
    setSelectedPlanId(detail.user.planId);
  };

  useEffect(() => {
    let active = true;
    Promise.all([getAdminUserDetail(params.id), listAdminPlans()])
      .then(([detail, planRows]) => {
        if (!active) return;
        applyDetail(detail, planRows.map(toPlan));
        setPlans(planRows.map(toPlan));
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el usuario.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  const reload = async () => {
    const [detail, planRows] = await Promise.all([getAdminUserDetail(params.id), listAdminPlans()]);
    const mapped = planRows.map(toPlan);
    setPlans(mapped);
    applyDetail(detail, mapped);
  };

  const changeAccount = async (status: 'activo' | 'inactivo') => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      await setAdminUserStatus({ userId: user.id, status });
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible cambiar el estado de la cuenta.');
    } finally {
      setBusy(false);
      setConfirmInactive(false);
    }
  };

  const changePlan = async () => {
    if (!user) return;
    const reason = planReason.trim() || 'Cambio manual';
    if (selectedPlanId !== 'free' && Number.isNaN(new Date(planEndsAt).getTime())) {
      setPlanNotice('');
      setError('Indica una fecha de fin válida.');
      return;
    }
    setBusy(true);
    setError('');
    setPlanNotice('');
    try {
      await setAdminSubscription({
        userId: user.id,
        planId: selectedPlanId,
        startsAt: new Date().toISOString(),
        endsAt: selectedPlanId === 'free' ? null : new Date(planEndsAt).toISOString(),
        reason,
      });
      const savedName = plans.find((item) => item.id === selectedPlanId)?.nombre ?? selectedPlanId;
      setPlanReason(reason);
      setPlanNotice(`Plan actualizado a ${savedName}.`);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible cambiar el plan.');
    } finally {
      setBusy(false);
    }
  };

  const handleReportStatusChange = (id: string, nuevoEstado: ReportStatus) => {
    setAdminReportStatus(id, nuevoEstado)
      .then((detail) => applyDetail(detail, plan ? [plan] : []))
      .catch((actionError: unknown) => {
        setError(actionError instanceof Error ? actionError.message : 'No fue posible actualizar el reporte.');
      });
  };

  const handleSanction = (tipo: SanctionType, motivo: string) => {
    if (!user) return;
    applyAdminSanction({ userId: user.id, type: tipo, reason: motivo })
      .then((detail) => applyDetail(detail, plan ? [plan] : []))
      .catch((actionError: unknown) => {
        setError(actionError instanceof Error ? actionError.message : 'No fue posible aplicar la sanción.');
      });
  };

  if (loading) {
    return <p className="page-toolbar-subtitle">Cargando usuario...</p>;
  }

  if (!user) {
    return <p className="page-toolbar-subtitle">{error || 'Usuario no encontrado.'}</p>;
  }

  const usageItems: KpiItem[] = [
    { id: 'mensajes', icon: MessageSquare, label: 'Mensajes enviados', value: String(user.metricasUso.mensajesEnviados) },
    { id: 'llamadas', icon: Phone, label: 'Llamadas realizadas', value: String(user.metricasUso.llamadasRealizadas) },
    { id: 'storage', icon: HardDrive, label: 'Almacenamiento usado', value: `${user.metricasUso.almacenamientoUsadoGB.toFixed(1)} GB` },
    { id: 'ultima', icon: Clock, label: 'Última conexión', value: user.metricasUso.ultimaConexion ? formatRelativeTime(user.metricasUso.ultimaConexion) : 'Sin registro' },
  ];

  return (
    <div>
      <Link href="/admin/usuarios" className="back-link">
        <ArrowLeft size={15} />
        <span>Volver al listado</span>
      </Link>

      <div className="privacy-banner">
        <ShieldAlert size={18} />
        <span>
          Por privacidad, el equipo administrativo <strong>nunca</strong> tiene acceso al contenido de mensajes,
          correos, notas ni archivos de los usuarios. Esta vista solo muestra métricas agregadas de uso.
        </span>
      </div>

      <div className="user-detail-header">
        <div className="table-user-avatar user-detail-avatar">{user.iniciales}</div>
        <div className="table-user-name-col">
          <div className="table-user-name-row">
            <span className="user-detail-name">{user.nombreCompleto}</span>
            {verificacionRed === 'verificado' && <VerifiedBadge size={17} />}
          </div>
          <span className="table-user-email">{user.email}</span>
        </div>
        <div className="user-detail-badges">
          <StatusBadge status={estado} />
          <PlanBadge planId={user.planId} />
          {/* Bee Verify state, live with the actions of the network section */}
          <span className="user-detail-verification">
            <span className="user-detail-verification-label">Buddy Verify</span>
            <StatusBadge status={verificacionRed} />
          </span>
        </div>
      </div>

      {error ? <p className="form-alert" role="alert">{error}</p> : null}

      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <span className="panel-card-title">Cuenta y plan</span>
        <div className="account-actions-row">
          {estado === 'activo' ? (
            <button className="confirm-dialog-btn-cancel" type="button" disabled={busy} onClick={() => setConfirmInactive(true)}>
              Desactivar cuenta
            </button>
          ) : (
            <button className="confirm-dialog-btn-confirm" type="button" disabled={busy} onClick={() => void changeAccount('activo')}>
              Activar cuenta
            </button>
          )}
        </div>
        <div className="plan-limits-grid">
          <div className="form-field">
            <label className="form-field-label">Plan</label>
            <select className="form-field-input" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              {(plans.length > 0 ? plans : [{ id: user.planId, nombre: user.planId, precioMensual: 0 } as Plan]).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.precioMensual > 0
                    ? `${item.nombre} · ${formatCurrencyCOP(item.precioMensual)} / mes`
                    : item.nombre}
                </option>
              ))}
            </select>
          </div>
          {selectedPlanId !== 'free' ? (
            <div className="form-field">
              <label className="form-field-label">Fin del periodo</label>
              <input className="form-field-input" type="datetime-local" value={planEndsAt} onChange={(event) => setPlanEndsAt(event.target.value)} />
            </div>
          ) : null}
          <div className="form-field">
            <label className="form-field-label">Motivo del cambio</label>
            <input className="form-field-input" value={planReason} onChange={(event) => setPlanReason(event.target.value)} placeholder="Cortesía, corrección o cambio manual" />
          </div>
        </div>
        {planNotice ? <p className="form-alert form-alert-success" role="status">{planNotice}</p> : null}
        <button className="confirm-dialog-btn-confirm" type="button" disabled={busy} onClick={() => void changePlan()}>
          {busy ? 'Guardando…' : 'Cambiar plan'}
        </button>
        {plans.length > 0 ? (
          <div className="plans-grid">
            {plans.map((item) => (
              <div key={item.id} className="plan-manage-card">
                <div className="plan-manage-card-top">
                  <span className="plan-manage-name">{item.nombre}</span>
                  <span className="plan-manage-dot" style={{ backgroundColor: item.color }} />
                </div>
                <div>
                  <span className="plan-manage-price">
                    {item.precioMensual === 0 ? 'Gratis' : formatCurrencyCOP(item.precioMensual)}
                  </span>
                  {item.precioMensual > 0 ? <span className="plan-manage-price-period"> / mes</span> : null}
                </div>
                {item.descripcion ? <p className="plan-manage-description">{item.descripcion}</p> : null}
                <div className="plan-manage-features">
                  {item.caracteristicas.map((feature) => (
                    <div key={feature} className="plan-manage-feature-row">
                      <Check size={14} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="user-detail-grid">
        <div className="user-detail-column">
          <div className="panel-card">
            <span className="panel-card-title">Datos de registro</span>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Fecha de registro</span>
                <span className="detail-row-value">{formatDate(user.fechaRegistro)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Último acceso</span>
                <span className="detail-row-value">{formatRelativeTime(user.ultimoAcceso)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Departamento</span>
                <span className="detail-row-value">{user.departamento ?? 'No especificado'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Cargo</span>
                <span className="detail-row-value">{user.cargo ?? 'No especificado'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Teléfono</span>
                <span className="detail-row-value">{user.telefono ?? 'No registrado'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Visibilidad en la red</span>
                <span className="detail-row-value">{VISIBILITY_LABELS[visibilidadRed]}</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <span className="panel-card-title">Onboarding</span>
            <div className="onboarding-progress-track">
              <div
                className="onboarding-progress-fill"
                style={{ width: user.onboarding.totalPasos > 0 ? `${(user.onboarding.pasoActual / user.onboarding.totalPasos) * 100}%` : '0%' }}
              />
            </div>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Estado</span>
                <span className="detail-row-value">
                  {user.onboarding.totalPasos === 0
                    ? 'Sin registro de onboarding'
                    : user.onboarding.completado
                      ? 'Completado'
                      : `Paso ${user.onboarding.pasoActual} de ${user.onboarding.totalPasos}`}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Inicio</span>
                <span className="detail-row-value">{formatDate(user.onboarding.fechaInicio)}</span>
              </div>
              {user.onboarding.fechaFinalizacion && (
                <div className="detail-row">
                  <span className="detail-row-label">Finalización</span>
                  <span className="detail-row-value">{formatDate(user.onboarding.fechaFinalizacion)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel-card">
            <span className="panel-card-title">Plan e historial de transacciones</span>
            {plan && (
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-row-label">Plan actual</span>
                  <span className="detail-row-value">{plan.nombre} — {plan.precioMensual === 0 ? 'Gratis' : `${formatCurrencyCOP(plan.precioMensual)}/mes`}</span>
                </div>
              </div>
            )}
            <DataTable
              columns={TRANSACTION_COLUMNS}
              data={history}
              keyExtractor={(row) => row.id}
              emptyMessage="Este usuario no tiene transacciones registradas."
            />
          </div>

          <ModerationSection
            estado={estado}
            reports={reports}
            sanctions={sanctions}
            onReportStatusChange={handleReportStatusChange}
            onSanction={handleSanction}
          />
        </div>

        <div className="user-detail-column">
          <div className="panel-card">
            <span className="panel-card-title">Métricas de uso agregadas</span>
            <KpiGrid items={usageItems} />
          </div>

          <div className="panel-card">
            <span className="panel-card-title">Integraciones conectadas</span>
            <div className="integrations-list">
              {user.integraciones.length === 0 && <p className="activity-feed-empty">Sin integraciones configuradas.</p>}
              {user.integraciones.map((integration) => (
                <div key={integration.id} className="integration-row">
                  <span className={`integration-status-icon ${integration.conectado ? 'connected' : 'disconnected'}`}>
                    {integration.conectado ? <Check size={13} /> : <X size={13} />}
                  </span>
                  <div className="table-user-name-col">
                    <span className="table-user-name">{integration.nombre}</span>
                    <span className="table-user-email">
                      {integration.conectado
                        ? [integration.correo, integration.fechaConexion ? `conectada desde ${formatDate(integration.fechaConexion)}` : 'Conectada']
                          .filter(Boolean)
                          .join(' · ')
                        : 'No conectada'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <span className="panel-card-title">Mis Productos y Servicios / Actividad comercial</span>
            {user.actividadComercial && user.actividadComercial.tipo !== 'ninguno' ? (
              <div className="detail-rows" style={{ marginTop: '12px' }}>
                <div className="detail-row">
                  <span className="detail-row-label">Tipo de Oferta</span>
                  <span className="detail-row-value" style={{ textTransform: 'capitalize', fontWeight: '400', color: '#6025d2' }}>
                    {user.actividadComercial.tipo}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Rubro comercial</span>
                  <span className="detail-row-value" style={{ fontWeight: '400' }}>
                    {user.actividadComercial.rubro ?? 'No especificado'}
                  </span>
                </div>
                <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className="detail-row-label">Descripción de actividad</span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#495057', lineHeight: '1.5' }}>
                    {user.actividadComercial.descripcion ?? 'Sin descripción'}
                  </p>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Publicaciones en catálogo</span>
                  <span className="detail-row-value">
                    {user.actividadComercial.cantidadPublicaciones ?? 0} registrados
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Estado comercial</span>
                  <span className="detail-row-value">
                    <span style={{ textTransform: 'capitalize', display: 'inline-block' }}>
                      <StatusBadge status={user.actividadComercial.estadoPerfil === 'verificado' ? 'activo' : user.actividadComercial.estadoPerfil === 'inactivo' ? 'inactivo' : 'pendiente'} />
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="activity-feed-empty" style={{ margin: '12px 0 0 0' }}>
                El usuario no registra actividad comercial en la plataforma.
              </p>
            )}
          </div>

          <NetworkSection
            cargo={user.cargo}
            departamento={user.departamento}
            visibilidadRed={visibilidadRed}
            verificacionRed={verificacionRed}
            onSetVisibility={(value) => {
              setVisibilidadRed(value);
              void setAdminUserStatus({ userId: user.id, visibility: value }).catch((actionError: unknown) => {
                setError(actionError instanceof Error ? actionError.message : 'No fue posible actualizar la visibilidad.');
              });
            }}
            onSetVerification={(value) => {
              setBusy(true);
              setError('');
              void setAdminUserStatus({ userId: user.id, verification: value })
                .then(() => reload())
                .catch((actionError: unknown) => {
                  setError(actionError instanceof Error ? actionError.message : 'No fue posible actualizar Buddy Verify.');
                })
                .finally(() => setBusy(false));
            }}
          />
        </div>
      </div>
      <ConfirmDialog
        open={confirmInactive}
        title="¿Desactivar esta cuenta?"
        description="La persona no podrá iniciar sesión hasta que la vuelvas a activar."
        tone="danger"
        confirmLabel="Desactivar"
        onConfirm={() => void changeAccount('inactivo')}
        onCancel={() => setConfirmInactive(false)}
      />
    </div>
  );
}
