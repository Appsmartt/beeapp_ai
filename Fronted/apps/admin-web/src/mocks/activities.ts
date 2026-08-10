import type { Activity } from './types';

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 'act_01', tipo: 'suscripcion', descripcion: 'Nueva suscripción Plus anual', fecha: '2026-07-23T09:40:00', usuarioNombre: 'María Gómez' },
  { id: 'act_02', tipo: 'alerta', descripcion: 'Renovación de cobro fallida', fecha: '2026-07-23T08:12:00', usuarioNombre: 'Laura Ramos' },
  { id: 'act_03', tipo: 'registro', descripcion: 'Nuevo registro en la plataforma', fecha: '2026-07-22T19:05:00', usuarioNombre: 'Daniela Peña' },
  { id: 'act_04', tipo: 'actualizacion', descripcion: 'Alerta de API: sincronización fallida con Outlook', fecha: '2026-07-22T17:30:00', usuarioNombre: 'Sofía Castro' },
  { id: 'act_05', tipo: 'registro', descripcion: 'Nuevo registro en la plataforma', fecha: '2026-07-20T10:15:00', usuarioNombre: 'Andrés Torres' },
  { id: 'act_06', tipo: 'cancelacion', descripcion: 'Cancelación de suscripción Pro', fecha: '2026-06-30T14:00:00', usuarioNombre: 'Juan Pablo Rojas' },
  { id: 'act_07', tipo: 'suscripcion', descripcion: 'Renovación de plan Enterprise', fecha: '2026-06-27T11:45:00', usuarioNombre: 'Valentina Ortiz' },
];
