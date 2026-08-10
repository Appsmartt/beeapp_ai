'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldAlert, MessageSquare, Phone, HardDrive, Clock, Check, X } from 'lucide-react';
import KpiGrid, { type KpiItem } from '@/components/KpiGrid';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import PlanBadge from '@/components/PlanBadge';
import ModerationSection from './ModerationSection';
import NetworkSection from './NetworkSection';
import { MOCK_USERS } from '@/mocks/users';
import { MOCK_PLANS } from '@/mocks/plans';
import { MOCK_TRANSACTIONS } from '@/mocks/transactions';
import { MOCK_REPORTS, MOCK_SANCTIONS } from '@/mocks/moderation';
import type {
  NetworkVisibility,
  ReportStatus,
  SanctionType,
  Transaction,
  UserSanction,
  UserStatus,
  VerificationStatus,
} from '@/mocks/types';
import { formatCurrencyCOP, formatDate, formatRelativeTime } from '@/utils/format';
import { VISIBILITY_LABELS } from '@/utils/labels';

const SANCTION_TO_ESTADO: Record<SanctionType, UserStatus | null> = {
  bloqueo: 'bloqueado',
  suspension: 'suspendido',
  reactivacion: 'activo',
  advertencia: null,
};

const TRANSACTION_COLUMNS: DataTableColumn<Transaction>[] = [
  { key: 'fecha', header: 'Fecha', render: (row) => formatDate(row.fecha) },
  { key: 'plan', header: 'Plan', render: (row) => <PlanBadge planId={row.planId} /> },
  { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
  { key: 'monto', header: 'Monto', align: 'right', render: (row) => formatCurrencyCOP(row.monto) },
];

export default function UsuarioDetallePage({ params }: { params: { id: string } }) {
  const user = MOCK_USERS.find((item) => item.id === params.id);
  if (!user) notFound();

  const plan = MOCK_PLANS.find((item) => item.id === user.planId);
  const history = MOCK_TRANSACTIONS.filter((txn) => txn.usuarioId === user.id);

  const [estado, setEstado] = useState<UserStatus>(user.estado);
  const [visibilidadRed, setVisibilidadRed] = useState<NetworkVisibility>(user.visibilidadRed);
  const [verificacionRed, setVerificacionRed] = useState<VerificationStatus>(user.verificacionRed);
  const [reports, setReports] = useState(() => MOCK_REPORTS.filter((report) => report.usuarioReportadoId === user.id));
  const [sanctions, setSanctions] = useState<UserSanction[]>(() => MOCK_SANCTIONS.filter((sanction) => sanction.usuarioId === user.id));

  const handleReportStatusChange = (id: string, nuevoEstado: ReportStatus) => {
    setReports((prev) => prev.map((report) => (report.id === id ? { ...report, estado: nuevoEstado } : report)));
  };

  const handleSanction = (tipo: SanctionType, motivo: string) => {
    const nuevoEstado = SANCTION_TO_ESTADO[tipo];
    if (nuevoEstado) setEstado(nuevoEstado);
    setSanctions((prev) => [
      { id: `san_${Date.now()}`, usuarioId: user.id, tipo, motivo, fecha: new Date().toISOString(), adminResponsable: 'Tú (sesión actual)' },
      ...prev,
    ]);
  };

  const usageItems: KpiItem[] = [
    { id: 'mensajes', icon: MessageSquare, label: 'Mensajes enviados', value: String(user.metricasUso.mensajesEnviados) },
    { id: 'llamadas', icon: Phone, label: 'Llamadas realizadas', value: String(user.metricasUso.llamadasRealizadas) },
    { id: 'storage', icon: HardDrive, label: 'Almacenamiento usado', value: `${user.metricasUso.almacenamientoUsadoGB.toFixed(1)} GB` },
    { id: 'ultima', icon: Clock, label: 'Última conexión', value: formatRelativeTime(user.metricasUso.ultimaConexion) },
  ];

  return (
    <div>
      <Link href="/dashboard/usuarios" className="back-link">
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
            <span className="user-detail-verification-label">Bee Verify</span>
            <StatusBadge status={verificacionRed} />
          </span>
        </div>
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
                style={{ width: `${(user.onboarding.pasoActual / user.onboarding.totalPasos) * 100}%` }}
              />
            </div>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Estado</span>
                <span className="detail-row-value">
                  {user.onboarding.completado ? 'Completado' : `Paso ${user.onboarding.pasoActual} de ${user.onboarding.totalPasos}`}
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
                      {integration.conectado && integration.fechaConexion
                        ? `Conectada desde ${formatDate(integration.fechaConexion)}`
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
            onSetVisibility={setVisibilidadRed}
            onSetVerification={setVerificacionRed}
          />
        </div>
      </div>
    </div>
  );
}
