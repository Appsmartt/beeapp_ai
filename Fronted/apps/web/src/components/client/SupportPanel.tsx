'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Mail, Phone, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { loadSupportConfig, type SupportFaqItem } from '@/lib/client/publicAppSettings';

export function SupportPanel() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<SupportFaqItem[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [supportUrl, setSupportUrl] = useState('');

  useEffect(() => {
    void loadSupportConfig()
      .then((config) => {
        setFaqs(config.faq);
        setEmail(config.email);
        setPhone(config.phone);
        setWhatsapp(config.whatsapp);
        setSupportUrl(config.supportUrl);
      })
      .finally(() => setLoading(false));
  }, []);

  const chatHref = supportUrl || (email ? `mailto:${email}` : '');

  return (
    <div className="space-y-6 select-none">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-neutral-900">Soporte Buddy AI</h3>
        <p className="text-xs text-neutral-600 font-normal leading-relaxed">
          ¿Necesitas ayuda? Contáctanos por cualquiera de estos canales o revisa las preguntas frecuentes:
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando canales…
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Canales directos
          </span>

          <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-2xl bg-neutral-50 overflow-hidden">
            {chatHref ? (
              <a
                href={chatHref}
                target={supportUrl ? '_blank' : undefined}
                rel={supportUrl ? 'noreferrer' : undefined}
                className="p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Chat de soporte</p>
                    <p className="text-[11px] text-neutral-500 font-normal">Abrir canal configurado</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-brand-primary">Iniciar</span>
              </a>
            ) : (
              <div className="p-3.5 text-xs text-neutral-500">Canal de chat no configurado.</div>
            )}

            {email ? (
              <a
                href={`mailto:${email}`}
                className="p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Correo electrónico</p>
                    <p className="text-[11px] text-neutral-500 font-normal">{email}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600">Enviar correo</span>
              </a>
            ) : null}

            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="p-3.5 flex items-center justify-between hover:bg-white transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Línea telefónica</p>
                    <p className="text-[11px] text-neutral-500 font-normal">{phone}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-600">Llamar</span>
              </a>
            ) : null}

            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
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
                    <p className="text-[11px] text-neutral-500 font-normal">Atención por WhatsApp</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">Abrir WhatsApp</span>
              </a>
            ) : null}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Preguntas frecuentes (FAQ)
        </span>

        {faqs.length === 0 ? (
          <p className="text-xs text-neutral-500">No hay preguntas frecuentes publicadas.</p>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
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
                  {isOpen ? (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-neutral-600 font-normal leading-relaxed bg-white border-t border-neutral-100">
                      {faq.a}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
