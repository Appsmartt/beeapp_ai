import type {
  AdminUser,
  CommercialActivity,
  CommercialActivityType,
  Integration,
  NetworkVisibility,
  Plan,
  PlanEntitlements,
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

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value != null && value !== '') return value;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
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
        correo: integration.correo ? text(integration.correo) : undefined,
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

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function emptyEntitlements(): PlanEntitlements {
  return {
    groups: null,
    groupMembers: null,
    callMinutes: null,
    mailAccounts: null,
    calendars: null,
    filesGb: null,
    mailStorageGb: null,
    catalogOffers: null,
    aiCredits: null,
    signatures: null,
    documentJobs: null,
    transcriptionMinutes: null,
    aiLevel: 'basic',
    transcription: false,
    documentProcessing: false,
    automations: 'none',
    storageAddon: false,
    extraAiCredits: false,
    promotedSpaces: false,
  };
}

export function toPlan(row: Record<string, unknown>): Plan {
  const limits = asRecord(row.limites);
  const features = asRecord(row.funciones ?? row.features);
  const rawEntitlements = asRecord(row.entitlements);
  const highlightSource = row.caracteristicas ?? row.highlights;
  const highlights = Array.isArray(highlightSource)
    ? highlightSource.map((item) => String(item))
    : [];
  const entitlements = {
    ...emptyEntitlements(),
    ...rawEntitlements,
    groups: nullableNumber(rawEntitlements.groups),
    groupMembers: nullableNumber(rawEntitlements.groupMembers),
    callMinutes: nullableNumber(rawEntitlements.callMinutes),
    mailAccounts: nullableNumber(rawEntitlements.mailAccounts),
    calendars: nullableNumber(rawEntitlements.calendars),
    filesGb: nullableNumber(rawEntitlements.filesGb),
    mailStorageGb: nullableNumber(rawEntitlements.mailStorageGb),
    catalogOffers: nullableNumber(rawEntitlements.catalogOffers),
    aiCredits: nullableNumber(rawEntitlements.aiCredits),
    signatures: nullableNumber(rawEntitlements.signatures),
    documentJobs: nullableNumber(rawEntitlements.documentJobs),
    transcriptionMinutes: nullableNumber(rawEntitlements.transcriptionMinutes),
    aiLevel: text(rawEntitlements.aiLevel, 'basic'),
    transcription: Boolean(rawEntitlements.transcription),
    documentProcessing: Boolean(rawEntitlements.documentProcessing),
    automations: text(rawEntitlements.automations, 'none'),
    storageAddon: (rawEntitlements.storageAddon ?? false) as PlanEntitlements['storageAddon'],
    extraAiCredits: (rawEntitlements.extraAiCredits ?? false) as PlanEntitlements['extraAiCredits'],
    promotedSpaces: (rawEntitlements.promotedSpaces ?? false) as PlanEntitlements['promotedSpaces'],
  };

  return {
    id: text(pick(row, 'id'), 'free') as PlanId,
    nombre: text(pick(row, 'nombre', 'name')),
    precioMensual: number(pick(row, 'precioMensual', 'monthly_price')),
    precioAnual: number(pick(row, 'precioAnual', 'yearly_price')),
    descripcion: text(pick(row, 'descripcion', 'description')),
    caracteristicas: highlights,
    usuariosActivos: number(row.usuariosActivos),
    color: text(pick(row, 'color'), '#6025d2'),
    limites: {
      almacenamientoGB: number(pick(limits, 'almacenamientoGB') ?? pick(row, 'storage_gb')),
      dispositivos: number(pick(limits, 'dispositivos') ?? pick(row, 'device_limit')),
      ofertasPerfil: number(pick(limits, 'ofertasPerfil') ?? pick(row, 'offer_limit')),
    },
    funciones: FEATURE_KEYS.reduce((accumulator, key) => {
      accumulator[key] = Boolean(features[key]);
      return accumulator;
    }, {} as Record<PlanFeatureKey, boolean>),
    entitlements,
    purchasable: Boolean(row.purchasable),
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
