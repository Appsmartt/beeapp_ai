/**
 * Mock dialogue for the immersive voice assistant experience.
 * Each turn is what the user "says" (transcribed on screen) and what the
 * assistant "answers" (also transcribed). No real speech/AI involved.
 */

export interface VoiceTurn {
  user: string;
  assistant: string;
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
    assistant:
      'Encontré 3 opciones para ti en la red empresarial:',
    showCatalog: true,
  },
];
