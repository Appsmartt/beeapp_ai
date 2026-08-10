import type { NetworkVisibility, PlanFeatureKey, ReportReason, SanctionType, TransactionType } from '@/mocks/types';

export const VISIBILITY_LABELS: Record<NetworkVisibility, string> = {
  publico: 'Público',
  privado: 'Privado',
  solo_equipo: 'Solo equipo',
};

export const PLAN_FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  sinPublicidad: 'Sin publicidad',
  copiasNube: 'Copias de seguridad en la nube',
  chatsOcultos: 'Chats ocultos',
  firmaDigital: 'Firma digital',
  historialVersiones: 'Historial de versiones',
  catalogoAvanzado: 'Catálogo avanzado',
  perfilDestacado: 'Perfil destacado',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  acoso: 'Acoso',
  contenido_inapropiado: 'Contenido inapropiado',
  suplantacion: 'Suplantación de identidad',
  otro: 'Otro',
};

export const SANCTION_LABELS: Record<SanctionType, string> = {
  bloqueo: 'Bloqueo',
  suspension: 'Suspensión',
  reactivacion: 'Reactivación',
  advertencia: 'Advertencia',
};

export const TRANSACTION_TIPO_LABELS: Record<TransactionType, string> = {
  alta: 'Alta',
  renovacion: 'Renovación',
  cancelacion: 'Cancelación',
  reembolso: 'Reembolso',
};
