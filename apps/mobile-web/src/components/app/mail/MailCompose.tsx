'use client';

import { useState, FormEvent } from 'react';
import { X, Send, Paperclip } from 'lucide-react';

interface MailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => void;
}

export default function MailCompose({ isOpen, onClose, onSend }: MailComposeProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!to || !subject) return;
    onSend(to, subject, body);
    setTo('');
    setSubject('');
    setBody('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <h2 className="font-semibold text-sm text-neutral-900">Mensaje nuevo</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 flex-1 flex flex-col overflow-y-auto">
          <div>
            <input
              type="email"
              required
              placeholder="Para: destinatario@correo.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full py-2 border-b border-neutral-200 text-xs text-neutral-900 outline-none focus:border-brand-primary placeholder:text-neutral-400 font-normal"
            />
          </div>

          <div>
            <input
              type="text"
              required
              placeholder="Asunto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full py-2 border-b border-neutral-200 text-xs font-semibold text-neutral-900 outline-none focus:border-brand-primary placeholder:text-neutral-400"
            />
          </div>

          <div className="flex-1 min-h-[160px]">
            <textarea
              required
              placeholder="Escribe tu mensaje aquí..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-full py-2 text-xs text-neutral-800 outline-none resize-none placeholder:text-neutral-400 font-normal"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <button
              type="button"
              className="p-2 text-neutral-500 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
              title="Adjuntar archivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Enviar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
