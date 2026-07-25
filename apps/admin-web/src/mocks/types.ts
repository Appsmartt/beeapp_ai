/**
 * Tipos compartidos para los datos MOCK del panel de administración.
 * Todo el contenido es ficticio y se usa únicamente para maquetar la interfaz.
 */

export type UserStatus = 'activo' | 'inactivo' | 'suspendido' | 'pendiente' | 'bloqueado';

export type PlanId = 'free' | 'plus' | 'pro' | 'enterprise';

export type NetworkVisibility = 'publico' | 'privado' | 'solo_equipo';

export type TransactionStatus = 'pagado' | 'pendiente' | 'fallido' | 'reembolsado';

export type TransactionType = 'alta' | 'renovacion' | 'cancelacion' | 'reembolso';

export type ActivityType = 'registro' | 'suscripcion' | 'cancelacion' | 'alerta' | 'actualizacion';

export interface UsageMetrics {
  mensajesEnviados: number;
  llamadasRealizadas: number;
  almacenamientoUsadoGB: number;
  ultimaConexion: string;
}

export interface Integration {
  id: string;
  nombre: string;
  conectado: boolean;
  fechaConexion?: string;
}

export interface OnboardingInfo {
  completado: boolean;
  pasoActual: number;
  totalPasos: number;
  fechaInicio: string;
  fechaFinalizacion?: string;
}

export type VerificationStatus = 'verificado' | 'pendiente' | 'no_solicitado';

export interface AdminUser {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  iniciales: string;
  estado: UserStatus;
  planId: PlanId;
  visibilidadRed: NetworkVisibility;
  fechaRegistro: string;
  ultimoAcceso: string;
  departamento?: string;
  cargo?: string;
  onboarding: OnboardingInfo;
  metricasUso: UsageMetrics;
  integraciones: Integration[];
  reportesCount: number;
  verificacionRed: VerificationStatus;
  actividadComercial?: CommercialActivity;
}

export type CommercialActivityType = 'productos' | 'servicios' | 'ambos' | 'ninguno';

export interface CommercialActivity {
  tipo: CommercialActivityType;
  rubro?: string;
  descripcion?: string;
  cantidadPublicaciones?: number;
  estadoPerfil?: 'activo' | 'verificado' | 'inactivo';
}

export type ReportReason = 'spam' | 'acoso' | 'contenido_inapropiado' | 'suplantacion' | 'otro';

export type ReportStatus = 'pendiente' | 'revisado' | 'descartado';

export interface UserReport {
  id: string;
  usuarioReportadoId: string;
  reportadoPor: string;
  motivo: ReportReason;
  detalle: string;
  contenidoReportado: string;
  fecha: string;
  estado: ReportStatus;
}

export type SanctionType = 'bloqueo' | 'suspension' | 'reactivacion' | 'advertencia';

export interface UserSanction {
  id: string;
  usuarioId: string;
  tipo: SanctionType;
  motivo: string;
  fecha: string;
  adminResponsable: string;
}

export interface PlanLimits {
  almacenamientoGB: number;
  dispositivos: number;
  ofertasPerfil: number;
}

export type PlanFeatureKey =
  | 'sinPublicidad'
  | 'copiasNube'
  | 'chatsOcultos'
  | 'firmaDigital'
  | 'historialVersiones'
  | 'catalogoAvanzado'
  | 'perfilDestacado';

export interface Plan {
  id: PlanId;
  nombre: string;
  precioMensual: number;
  precioAnual: number;
  descripcion: string;
  caracteristicas: string[];
  usuariosActivos: number;
  color: string;
  limites: PlanLimits;
  funciones: Record<PlanFeatureKey, boolean>;
}

export interface Transaction {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  planId: PlanId;
  tipo: TransactionType;
  estado: TransactionStatus;
  monto: number;
  fecha: string;
  metodoPago: string;
}

export interface Activity {
  id: string;
  tipo: ActivityType;
  descripcion: string;
  fecha: string;
  usuarioNombre?: string;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface SubscriptionFlowPoint {
  label: string;
  altas: number;
  cancelaciones: number;
}

export interface PlanDistributionPoint {
  planId: PlanId;
  nombre: string;
  valor: number;
  color: string;
}

export interface DashboardKpis {
  usuariosTotales: number;
  usuariosActivos: number;
  nuevosRegistros: number;
  suscripcionesActivas: number;
  ingresosMes: number;
  almacenamientoConsumidoGB: number;
}

export interface SubscriptionKpis {
  ingresosMes: number;
  ingresosAnio: number;
  altas: number;
  cancelaciones: number;
  churnRate: number;
  ingresoPromedio: number;
}

export type NotificationRecipientMode = 'todos' | 'segmento' | 'especificos';

export type NotificationStatus = 'enviada' | 'programada' | 'fallida' | 'cancelada';

export type PlanTier = 'gratuito' | 'de_pago';

export interface NotificationSegmentCriteria {
  planTier: PlanTier | '';
  estado: UserStatus | '';
  registroDias: string;
  visibilidad: NetworkVisibility | '';
}

export interface NotificationCampaign {
  id: string;
  titulo: string;
  mensaje: string;
  modoDestinatario: NotificationRecipientMode;
  segmentoCriterios?: NotificationSegmentCriteria;
  usuariosIds?: string[];
  cantidadDestinatarios: number;
  fechaEnvio: string;
  estado: NotificationStatus;
  entregados?: number;
  abiertos?: number;
}
