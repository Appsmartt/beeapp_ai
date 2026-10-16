import type {
  AdminUser,
  CommercialActivity,
  CommercialActivityType,
  Integration,
  NetworkVisibility,
  Plan,
  PlanFeatureKey,
  PlanId,
  Transaction,
  UserReport,
  UserSanction,
  UserStatus,
  VerificationStatus,
} from './types';

function text(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function commercialType(value: unknown): CommercialActivityType {
  const raw = text(value);
  if (raw === 'productos' || raw === 'product') return 'productos';
  if (raw === 'servicios' || raw === 'service') return 'servicios';
  if (raw === 'ambos' || raw === 'mixed') return 'ambos';
  return 'ninguno';
}

function asCommercial(value: unknown): CommercialActivity | undefined {
  if (!value || typeof value !== 'object') {
    return { tipo: 'ninguno' };
  }
  const row = value as Record<string, unknown>;
  return {
    tipo: commercialType(row.tipo),
    rubro: row.rubro ? text(row.rubro) : undefined,
    descripcion: row.descripcion ? text(row.descripcion) : undefined,
    cantidadPublicaciones: number(row.cantidadPublicaciones),
    estadoPerfil: (text(row.estadoPerfil, 'activo') as CommercialActivity['estadoPerfil']),
  };
}

export function toAdminUser(row: Record<string, unknown>): AdminUser {
  const onboarding = (row.onboarding || {}) as Record<string, unknown>;
  const metrics = (row.metricasUso || {}) as Record<string, unknown>;
  const integrations = Array.isArray(row.integraciones) ? row.integraciones : [];

  return {
    id: text(row.id),
    nombreCompleto: text(row.nombreCompleto),
    email: text(row.email),
    telefono: row.telefono ? text(row.telefono) : undefined,
    iniciales: text(row.iniciales, '?'),
    estado: text(row.estado, 'activo') as UserStatus,
    planId: text(row.planId, 'free') as PlanId,
    visibilidadRed: text(row.visibilidadRed, 'publico') as NetworkVisibility,
    fechaRegistro: text(row.fechaRegistro),
    ultimoAcceso: text(row.ultimoAcceso || row.fechaRegistro),
    departamento: row.departamento ? text(row.departamento) : undefined,
    cargo: row.cargo ? text(row.cargo) : undefined,
    onboarding: {
      completado: Boolean(onboarding.completado),
      pasoActual: number(onboarding.pasoActual),
      totalPasos: number(onboarding.totalPasos),
      fechaInicio: text(onboarding.fechaInicio || row.fechaRegistro),
      fechaFinalizacion: onboarding.fechaFinalizacion
        ? text(onboarding.fechaFinalizacion)
        : undefined,
    },
    metricasUso: {
      mensajesEnviados: number(metrics.mensajesEnviados),
      llamadasRealizadas: number(metrics.llamadasRealizadas),
      almacenamientoUsadoGB: number(metrics.almacenamientoUsadoGB),
      ultimaConexion: text(metrics.ultimaConexion || row.ultimoAcceso || row.fechaRegistro),
    },
    integraciones: integrations.map((item) => {
      const integration = item as Record<string, unknown>;
      return {
        id: text(integration.id),
        nombre: text(integration.nombre),
        conectado: Boolean(integration.conectado),
        fechaConexion: integration.fechaConexion
          ? text(integration.fechaConexion)
          : undefined,
      } satisfies Integration;
    }),
    reportesCount: number(row.reportesCount),
    verificacionRed: text(row.verificacionRed, 'no_solicitado') as VerificationStatus,
    actividadComercial: asCommercial(row.actividadComercial),
  };
}

export function toTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: text(row.id),
    usuarioId: text(row.usuarioId),
    usuarioNombre: text(row.usuarioNombre),
    planId: text(row.planId, 'free') as PlanId,
    tipo: text(row.tipo, 'alta') as Transaction['tipo'],
    estado: text(row.estado, 'pendiente') as Transaction['estado'],
    monto: number(row.monto),
    fecha: text(row.fecha),
    metodoPago: text(row.metodoPago),
  };
}

export function toReport(row: Record<string, unknown>): UserReport {
  return {
    id: text(row.id),
    usuarioReportadoId: text(row.usuarioReportadoId),
    reportadoPor: text(row.reportadoPor, 'Usuario'),
    motivo: text(row.motivo, 'otro') as UserReport['motivo'],
    detalle: text(row.detalle),
    contenidoReportado: text(row.contenidoReportado),
    fecha: text(row.fecha),
    estado: text(row.estado, 'pendiente') as UserReport['estado'],
  };
}

export function toSanction(row: Record<string, unknown>): UserSanction {
  return {
    id: text(row.id),
    usuarioId: text(row.usuarioId),
    tipo: text(row.tipo, 'advertencia') as UserSanction['tipo'],
    motivo: text(row.motivo),
    fecha: text(row.fecha),
    adminResponsable: text(row.adminResponsable, 'Administrador'),
  };
}

const FEATURE_KEYS: PlanFeatureKey[] = [
  'sinPublicidad',
  'copiasNube',
  'chatsOcultos',
  'firmaDigital',
  'historialVersiones',
  'catalogoAvanzado',
  'perfilDestacado',
];

export function toPlan(row: Record<string, unknown>): Plan {
  const limits = (row.limites || {}) as Record<string, unknown>;
  const features = (row.funciones || {}) as Record<string, boolean>;
  const highlights = Array.isArray(row.caracteristicas)
    ? row.caracteristicas.map((item) => String(item))
    : [];

  return {
    id: text(row.id, 'free') as PlanId,
    nombre: text(row.nombre),
    precioMensual: number(row.precioMensual),
    precioAnual: number(row.precioAnual),
    descripcion: text(row.descripcion),
    caracteristicas: highlights,
    usuariosActivos: number(row.usuariosActivos),
    color: text(row.color, '#6025d2'),
    limites: {
      almacenamientoGB: number(limits.almacenamientoGB),
      dispositivos: number(limits.dispositivos),
      ofertasPerfil: number(limits.ofertasPerfil),
    },
    funciones: FEATURE_KEYS.reduce((accumulator, key) => {
      accumulator[key] = Boolean(features[key]);
      return accumulator;
    }, {} as Record<PlanFeatureKey, boolean>),
  };
}

export function detailCollections(row: Record<string, unknown>) {
  return {
    user: toAdminUser(row),
    transactions: (Array.isArray(row.transacciones) ? row.transacciones : [])
      .map((item) => toTransaction(item as Record<string, unknown>)),
    reports: (Array.isArray(row.reportes) ? row.reportes : [])
      .map((item) => toReport(item as Record<string, unknown>)),
    sanctions: (Array.isArray(row.sanciones) ? row.sanciones : [])
      .map((item) => toSanction(item as Record<string, unknown>)),
  };
}
