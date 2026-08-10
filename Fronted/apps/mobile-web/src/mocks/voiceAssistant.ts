/**
 * Diálogo mock del asistente por voz, portado tal cual desde la app móvil
 * (`apps/mobile/src/mocks/voiceAssistant.ts`). Cada turno es lo que el usuario
 * "dice" (transcrito en pantalla) y lo que el asistente "responde" (también
 * transcrito). No hay voz ni IA reales.
 */

export interface VoiceTurn {
  user: string;
  assistant: string;
  /** En móvil abre el catálogo de la red; en la web todavía no está conectado */
  showCatalog?: boolean;
}

export const VOICE_CONVERSATION: VoiceTurn[] = [
  {
    user: '¿Qué tengo agendado para hoy?',
    assistant:
      'Tienes dos compromisos: la sincronización semanal de equipo a las 2:00 p.m. y la presentación de resultados Q2 a las 4:30. Además llegó un correo de Eduardo Torres sobre la cotización del proyecto Q3.',
  },
  {
    user: 'Resume el correo de Eduardo Torres',
    assistant:
      'Eduardo confirma que la junta directiva aprobó el presupuesto del proyecto Q3. Quedan a la espera del contrato de servicios final para agendar la reunión de kick-off.',
  },
  {
    user: 'Agéndame una llamada con Mariana mañana a las diez',
    assistant:
      'Listo. Reservé una llamada con Mariana Gómez mañana de 10:00 a 10:30 y le envié la invitación a su correo.',
  },
  {
    user: 'Crea una nota con los pendientes de la semana',
    assistant:
      'Creé la nota "Pendientes de la semana" con tres tareas: enviar el contrato Q3, preparar la presentación de resultados y confirmar la llamada con Mariana.',
  },
  {
    user: 'Necesito un diseñador gráfico para mi logo',
    assistant: 'Encontré 3 opciones para ti en la red empresarial:',
    showCatalog: true,
  },
];
