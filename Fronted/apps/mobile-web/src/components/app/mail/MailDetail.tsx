'use client';

import {
  Archive,
  ArrowLeft,
  CornerUpLeft,
  CornerUpRight,
  Download,
  FileText,
  Mail,
  ReplyAll,
  Star,
  Trash2,
} from 'lucide-react';

import type {
  MailDetailModel,
} from './mailTypes';
import {
  formatMailDetailDate,
  getAttachmentDescription,
  getInitials,
  getRecipientLabel,
} from './mailTypes';

interface MailDetailProps {
  email: MailDetailModel;
  actionLoading?: boolean;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onReply: (email: MailDetailModel) => void;
  onReplyAll: (email: MailDetailModel) => void;
  onForward: (email: MailDetailModel) => void;
}

const TOOLBAR = (
  'rounded-xl p-2 text-neutral-500 '
  + 'transition-colors hover:bg-neutral-100 '
  + 'disabled:cursor-wait disabled:opacity-50'
);

export default function MailDetail({
  email,
  actionLoading = false,
  onBack,
  onToggleStar,
  onArchive,
  onDelete,
  onRestore,
  onReply,
  onReplyAll,
  onForward,
}: MailDetailProps) {
  const emailDate = formatMailDetailDate(
    email.receivedAt || email.sentAt,
  );

  const canShowHtml = Boolean(
    email.bodyHtml
    && !email.body.trim(),
  );

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          disabled={actionLoading}
          aria-label="Volver a correos"
          className={TOOLBAR}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleStar(email.id)}
            disabled={actionLoading}
            aria-label={
              email.isStarred
                ? 'Quitar de importantes'
                : 'Marcar como importante'
            }
            className={TOOLBAR}
          >
            <Star
              className={`h-5 w-5 ${
                email.isStarred
                  ? 'fill-amber-400 text-amber-400'
                  : ''
              }`}
            />
          </button>

          {email.isTrashed ? (
            <button
              type="button"
              onClick={() => onRestore(email.id)}
              disabled={actionLoading}
              aria-label="Restaurar correo a recibidos"
              className={TOOLBAR}
            >
              <Mail className="h-5 w-5 text-brand-primary" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onArchive(email.id)}
                disabled={actionLoading}
                aria-label="Archivar correo"
                className={TOOLBAR}
              >
                <Archive className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => onDelete(email.id)}
                disabled={actionLoading}
                aria-label="Mover correo a la papelera"
                className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {actionLoading ? (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              Actualizando correo...
            </div>
          ) : null}

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
            <Mail className="h-3 w-3" />
            Cuenta: {email.accountEmail}
          </span>

          <h1 className="mt-4 text-xl font-semibold leading-snug text-neutral-900">
            {email.subject}
          </h1>

          <div className="mt-5 flex items-start gap-3 border-b border-neutral-100 pb-5">
            <div
              style={{
                backgroundColor: email.initialsColor,
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            >
              {getInitials(email.senderName)}
            </div>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-900">
                {email.senderName}
              </span>

              {email.senderEmail ? (
                <p className="truncate text-xs font-normal text-neutral-500">
                  De: {email.senderEmail}
                </p>
              ) : null}

              <p className="truncate text-xs font-normal text-neutral-400">
                {getRecipientLabel(email)}
              </p>
            </div>

            <span className="max-w-[130px] shrink-0 text-right text-[11px] font-normal leading-4 text-neutral-500">
              {emailDate}
            </span>
          </div>

          {canShowHtml ? (
            <div
              className="mail-html-content py-6 text-sm leading-relaxed text-neutral-800"
              dangerouslySetInnerHTML={{
                __html: email.bodyHtml || '',
              }}
            />
          ) : (
            <div className="whitespace-pre-wrap py-6 text-sm font-normal leading-relaxed text-neutral-800">
              {email.body}
            </div>
          )}

          {email.attachments.length > 0 ? (
            <div className="space-y-3 border-t border-neutral-100 pt-5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                <FileText className="h-3.5 w-3.5" />
                Archivos adjuntos ({email.attachments.length})
              </span>

              {email.attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-500">
                      <FileText className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-neutral-900">
                        {file.filename}
                      </p>

                      <p className="text-[11px] font-normal text-neutral-500">
                        {getAttachmentDescription(
                          file.mime_type,
                          file.size_bytes,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    title="La descarga de adjuntos se habilitará próximamente."
                    aria-label={`Descargar ${file.filename}`}
                    className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary opacity-50"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {!email.isTrashed ? (
            <div className="mt-8 flex gap-3 border-t border-neutral-100 pt-5">
              <button
                type="button"
                onClick={() => onReply(email)}
                disabled={actionLoading}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                <CornerUpLeft className="h-4 w-4" />
                Responder
              </button>

              <button
                type="button"
                onClick={() => onReplyAll(email)}
                disabled={actionLoading}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                <ReplyAll className="h-4 w-4" />
                Todos
              </button>

              <button
                type="button"
                onClick={() => onForward(email)}
                disabled={actionLoading}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                <CornerUpRight className="h-4 w-4" />
                Reenviar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}