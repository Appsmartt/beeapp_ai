'use client';

import { useState } from 'react';
import { MessageCircle, Mail, Phone, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: '¿Cómo cambio mi PIN de 4 dígitos para carpetas y chats?',
    a: 'Ve a Seguridad y PIN en el menú lateral. Allí encontrarás la opción para crear o cambiar tu PIN de 4 dígitos y configurar el método de recuperación por SMS o correo electrónico.',
  },
  {
    q: '¿Cómo solicito la insignia de verificado Bee Verify?',
    a: 'En la sección Suscripción y Verificación, busca el apartado Bee Verify. Revisa los requisitos de cuenta y haz clic en "Solicitar verificación" para enviar la revisión al equipo.',
  },
  {
    q: '¿Cómo conecto mi cuenta de Google Calendar o Gmail?',
    a: 'Entra a Integraciones Externas desde el menú lateral. Haz clic en "Conectar" junto al servicio deseado y concede los permisos de sincronización.',
  },
  {
    q: '¿Cómo funciona la IA Asistente por voz?',
    a: 'En cualquier módulo de la web app, puedes tocar el botón de micrófono o asistente en la barra flotante para hablar con tu asistente BeeAI. En Configuración del Asistente puedes personalizar su tono y nombre.',
  },
];

export function SupportPanel() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-6 select-none">
      {/* Header Info */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-neutral-900">Soporte BeeApp AI</h3>
        <p className="text-xs text-neutral-600 font-normal leading-relaxed">
          ¿Necesitas ayuda? Contáctanos por cualquiera de estos canales o revisa las preguntas frecuentes:
        </p>
      </div>

      {/* Contact Channels List */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Canales Directos
        </span>

        <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-2xl bg-neutral-50 overflow-hidden">
          {/* Chat de soporte */}
          <button
            type="button"
            onClick={() => alert('Abriendo chat con agente de soporte (simulación)...')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <MessageCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Chat de soporte</p>
                <p className="text-[11px] text-neutral-500 font-normal">Respuesta promedio: &lt; 5 minutos</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-brand-primary">Iniciar chat</span>
          </button>

          {/* Correo electrónico */}
          <a
            href="mailto:soporte@beeapp.ai"
            className="p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Correo electrónico</p>
                <p className="text-[11px] text-neutral-500 font-normal">soporte@beeapp.ai</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600">Enviar correo</span>
          </a>

          {/* Teléfono */}
          <a
            href="tel:+573001234567"
            className="p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Línea telefónica</p>
                <p className="text-[11px] text-neutral-500 font-normal">+57 300 123 4567</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-purple-600">Llamar</span>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/573001234567"
            target="_blank"
            rel="noreferrer"
            className="p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">WhatsApp de soporte</p>
                <p className="text-[11px] text-neutral-500 font-normal">Atención 24/7 con asistente o agente</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-600">Abrir WhatsApp</span>
          </a>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="space-y-3 pt-2">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Preguntas Frecuentes (FAQ)
        </span>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-neutral-200/80 rounded-xl bg-neutral-50 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white transition-colors"
                >
                  <span className="text-xs font-semibold text-neutral-900 pr-2">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-neutral-600 font-normal leading-relaxed bg-white border-t border-neutral-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
