'use client';

import {
  ArrowLeft,
  Star,
  Trash2,
  Archive,
  Paperclip,
  FileText,
  Download,
  CornerUpLeft,
  CornerUpRight,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import type { EmailItem } from '@/mocks/emails';

interface MailDetailProps {
  email: EmailItem;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (email: EmailItem) => void;
  onForward: (email: EmailItem) => void;
}

const initialsOf = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const TOOLBAR = 'p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors';

/** Panel derecho: el correo abierto, con adjuntos y acciones */
export default function MailDetail({
  email,
  onBack,
  onToggleStar,
  onArchive,
  onDelete,
  onReply,
  onForward,
}: MailDetailProps) {
  const attachments = email.attachments ?? [];

  return (
    <div className="bg-white min-h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button type="button" onClick={onBack} aria-label="Volver" className={TOOLBAR}>
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleStar(email.id)}
            aria-label="Favorito"
            className={TOOLBAR}
          >
            <Star className={`w-5 h-5 ${email.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onArchive(email.id)}
            aria-label="Archivar"
            className={TOOLBAR}
          >
            <Archive className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(email.id)}
            aria-label="Eliminar"
            className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-normal text-neutral-600 bg-neutral-100 rounded-lg px-2.5 py-1">
            <Mail className="w-3 h-3" />
            Cuenta: {email.account}
          </span>

          <h1 className="text-xl font-semibold text-neutral-900 leading-snug mt-4">
            {email.subject}
          </h1>

          <div className="flex items-start gap-3 mt-5 pb-5 border-b border-neutral-100">
            <div
              style={{ backgroundColor: email.initialsColor }}
              className="w-11 h-11 rounded-full text-white text-sm font-normal flex items-center justify-center shrink-0"
            >
              {initialsOf(email.sender)}
            </div>

            <div className="flex-1 min-w-0">
              <span className="flex items-center gap-1">
                <span className="text-sm font-normal text-neutral-900 truncate">{email.sender}</span>
                {email.senderVerified && (
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                )}
              </span>
              <p className="text-xs font-normal text-neutral-500 truncate">De: {email.email}</p>
              <p className="text-xs font-normal text-neutral-400">Para: mí</p>
            </div>

            <span className="text-[11px] font-normal text-neutral-500 shrink-0">
              {email.date ?? email.timestamp}
            </span>
          </div>

          <div className="text-sm font-normal text-neutral-800 leading-relaxed whitespace-pre-line py-6">
            {email.body || email.preview}
          </div>

          {attachments.length > 0 && (
            <div className="pt-5 border-t border-neutral-100 space-y-3">
              <span className="text-[11px] font-normal uppercase tracking-[0.08em] text-neutral-500 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Archivos adjuntos ({attachments.length})
              </span>

              {attachments.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-neutral-200 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-neutral-50 text-neutral-500 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-normal text-neutral-900 truncate">{file.name}</p>
                      <p className="text-[11px] font-normal text-neutral-500">
                        {file.kind} · {file.size}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Descargar ${file.name}`}
                    className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20 transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-5 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => onReply(email)}
              className="flex-1 h-10 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-normal flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
            >
              <CornerUpLeft className="w-4 h-4" />
              Responder
            </button>
            <button
              type="button"
              onClick={() => onForward(email)}
              className="flex-1 h-10 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-normal flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
            >
              <CornerUpRight className="w-4 h-4" />
              Reenviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
