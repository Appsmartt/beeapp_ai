'use client';

import { ArrowLeft, Star, Trash2, Paperclip, Reply, Forward } from 'lucide-react';
import { EmailItem } from '@/mocks/emails';

interface MailDetailProps {
  email: EmailItem;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function MailDetail({ email, onBack, onToggleStar, onDelete }: MailDetailProps) {
  return (
    <div className="bg-white min-h-full flex flex-col">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleStar(email.id)}
            className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <Star className={`w-5 h-5 ${email.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(email.id)}
            className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Email Body & Details */}
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        
        {/* Subject */}
        <h1 className="text-xl font-semibold text-neutral-900 leading-snug">
          {email.subject}
        </h1>

        {/* Sender Info */}
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="w-11 h-11 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-sm flex items-center justify-center shrink-0">
            {email.sender.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-neutral-900 truncate">
                {email.sender}
              </h2>
              <span className="text-xs text-neutral-400 font-normal shrink-0">
                {email.timestamp}
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-normal truncate">
              {email.email}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="text-sm text-neutral-800 font-normal leading-relaxed whitespace-pre-line space-y-4">
          {email.body || email.preview}
        </div>

        {/* Attachments if any */}
        {email.hasAttachment && (
          <div className="pt-4 border-t border-neutral-100 space-y-2">
            <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4" /> Archivos adjuntos (1)
            </span>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-800">Documento_Adjunto.pdf</p>
                  <p className="text-[10px] text-neutral-400 font-normal">1.2 MB</p>
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                Descargar
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t border-neutral-100">
          <button
            type="button"
            className="flex-1 h-10 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Responder</span>
          </button>
          <button
            type="button"
            className="flex-1 h-10 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
          >
            <Forward className="w-4 h-4" />
            <span>Reenviar</span>
          </button>
        </div>

      </div>

    </div>
  );
}
