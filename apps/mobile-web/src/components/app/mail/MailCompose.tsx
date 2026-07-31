'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { X, Send, Paperclip, ChevronDown, FileText } from 'lucide-react';
import { MAIL_ACCOUNTS } from '@/mocks/emails';

export interface ComposeDraft {
  to: string;
  subject: string;
}

interface MailComposeProps {
  isOpen: boolean;
  /** Prellenado al responder o reenviar */
  draft?: ComposeDraft | null;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string, from: string) => void;
}

const MOCK_FILES = ['Reporte_Q3.pdf', 'Resumen_Ejecutivo.docx', 'Factura_Servicios.pdf'];

export default function MailCompose({ isOpen, draft, onClose, onSend }: MailComposeProps) {
  const [from, setFrom] = useState(MAIL_ACCOUNTS[0]);
  const [fromOpen, setFromOpen] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setFrom(MAIL_ACCOUNTS[0]);
    setFromOpen(false);
    setTo(draft?.to ?? '');
    setCc('');
    setSubject(draft?.subject ?? '');
    setBody('');
    setShowCc(false);
    setAttachments([]);
  }, [isOpen, draft]);

  if (!isOpen) return null;

  const addAttachment = () => {
    const next = MOCK_FILES.find((file) => !attachments.includes(file));
    if (next) setAttachments((prev) => [...prev, next]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!to.trim() || !subject.trim()) return;
    onSend(to.trim(), subject.trim(), body, from);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl z-50 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Mensaje nuevo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3 relative">
            <span className="w-14 text-xs font-normal text-neutral-500 shrink-0">De:</span>
            <button
              type="button"
              onClick={() => setFromOpen(!fromOpen)}
              className="flex items-center gap-1.5 text-xs font-normal text-neutral-900 hover:text-brand-primary transition-colors"
            >
              {from}
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {fromOpen && (
              <div className="absolute top-full left-16 z-20 mt-1 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl py-1">
                {MAIL_ACCOUNTS.map((account) => (
                  <button
                    key={account}
                    type="button"
                    onClick={() => {
                      setFrom(account);
                      setFromOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 transition-colors ${
                      account === from ? 'text-brand-primary font-semibold' : 'text-neutral-700 font-normal'
                    }`}
                  >
                    {account}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3">
            <span className="w-14 text-xs font-normal text-neutral-500 shrink-0">Para:</span>
            <input
              type="email"
              required
              placeholder="destinatario@correo.com"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="flex-1 text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
            />
            <button
              type="button"
              onClick={() => setShowCc(!showCc)}
              className="text-[10px] font-normal text-neutral-500 bg-neutral-100 rounded-md px-2 py-1 hover:bg-neutral-200 transition-colors shrink-0"
            >
              {showCc ? 'Ocultar CC' : 'CC'}
            </button>
          </div>

          {showCc && (
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3">
              <span className="w-14 text-xs font-normal text-neutral-500 shrink-0">CC:</span>
              <input
                type="email"
                placeholder="copia@correo.com"
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                className="flex-1 text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
          )}

          <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3">
            <span className="w-14 text-xs font-normal text-neutral-500 shrink-0">Asunto:</span>
            <input
              type="text"
              required
              placeholder="Asunto del correo"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="flex-1 text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
            />
          </div>

          <textarea
            placeholder="Escribe tu mensaje aquí..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="flex-1 min-h-[220px] px-5 py-4 text-sm font-normal text-neutral-800 outline-none resize-none placeholder:text-neutral-400"
          />

          {attachments.length > 0 && (
            <div className="px-5 pb-3 space-y-2">
              {attachments.map((file) => (
                <div
                  key={file}
                  className="flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2"
                >
                  <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="flex-1 text-xs font-normal text-neutral-900 truncate">{file}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((f) => f !== file))}
                    aria-label={`Quitar ${file}`}
                    className="text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
            <button
              type="button"
              onClick={addAttachment}
              className="flex items-center gap-2 text-xs font-normal text-brand-primary bg-brand-primary/10 rounded-xl px-3 py-2 hover:bg-brand-primary/20 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              Adjuntar archivo
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors"
            >
              Enviar
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
