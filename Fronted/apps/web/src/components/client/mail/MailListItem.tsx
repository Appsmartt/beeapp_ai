'use client';

import {
  Archive,
  CheckCircle2,
  Mail,
  MailOpen,
  MoreVertical,
  Paperclip,
  Star,
  Trash2,
} from 'lucide-react';

import type {
  MailListItemModel,
} from './mailTypes';
import {
  getInitials,
} from './mailTypes';

interface MailListItemProps {
  email: MailListItemModel;
  isSelected: boolean;
  isUpdating?: boolean;
  onOpen: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export default function MailListItem({
  email,
  isSelected,
  isUpdating = false,
  onOpen,
  onToggleStar,
  onToggleRead,
  onArchive,
  onDelete,
}: MailListItemProps) {
  return (
    <div
      className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors ${
        isSelected
          ? 'border-l-4 border-brand-primary bg-brand-primary/10 pl-3'
          : email.isRead
            ? 'hover:bg-neutral-50'
            : 'bg-brand-primary/5 hover:bg-brand-primary/10'
      } ${isUpdating ? 'pointer-events-none opacity-60' : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Abrir correo de ${email.senderName}: ${email.subject}`}
    >
      <div
        style={{
          backgroundColor: email.initialsColor,
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      >
        {getInitials(email.senderName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span
              className={`truncate text-xs text-neutral-900 ${
                email.isRead
                  ? 'font-medium'
                  : 'font-bold'
              }`}
            >
              {email.senderName}
            </span>

            <CheckCircle2 className="hidden h-3.5 w-3.5 shrink-0 text-brand-primary" />
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {!email.isRead ? (
              <span className="h-2 w-2 rounded-full bg-brand-primary" />
            ) : null}

            <span className="text-[10px] font-normal text-neutral-400">
              {email.timestamp}
            </span>
          </span>
        </div>

        <p
          className={`mt-0.5 truncate text-xs ${
            email.isRead
              ? 'font-normal text-neutral-800'
              : 'font-semibold text-brand-primary'
          }`}
        >
          {email.subject}
        </p>

        <p className="mt-0.5 truncate text-[11px] font-normal text-neutral-500">
          {email.bodyPreview}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          {email.hasAttachment ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-normal text-neutral-600">
              <Paperclip className="h-2.5 w-2.5" />
              {email.attachmentCount > 1
                ? `${email.attachmentCount} adjuntos`
                : 'Adjunto'}
            </span>
          ) : null}

          <span
            style={{
              borderColor: email.initialsColor,
              color: email.initialsColor,
            }}
            className="max-w-[120px] truncate rounded-md border px-1.5 py-0.5 text-[9px] font-medium"
            title={email.accountEmail}
          >
            {email.accountEmail.split('@')[0]}
          </span>
        </div>
      </div>

      <div
        className="flex shrink-0 flex-col items-center gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleStar}
          disabled={isUpdating}
          aria-label={
            email.isStarred
              ? 'Quitar de importantes'
              : 'Marcar como importante'
          }
          className="rounded-md p-1 text-neutral-300 transition-colors hover:text-amber-400 disabled:cursor-wait"
        >
          <Star
            className={`h-4 w-4 ${
              email.isStarred
                ? 'fill-amber-400 text-amber-400'
                : ''
            }`}
          />
        </button>

        <div className="relative">
          <button
            type="button"
            disabled={isUpdating}
            aria-label="Más acciones"
            className="peer rounded-md p-1 text-neutral-400 transition-colors hover:text-neutral-700"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          <div className="invisible absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 opacity-0 shadow-xl transition-all peer-focus-within:visible peer-focus-within:opacity-100 hover:visible hover:opacity-100">
            <button
              type="button"
              onClick={onToggleRead}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-normal text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              {email.isRead ? (
                <Mail className="h-3.5 w-3.5 text-neutral-500" />
              ) : (
                <MailOpen className="h-3.5 w-3.5 text-neutral-500" />
              )}

              {email.isRead
                ? 'Marcar como no leído'
                : 'Marcar como leído'}
            </button>

            <button
              type="button"
              onClick={onArchive}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-normal text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <Archive className="h-3.5 w-3.5 text-neutral-500" />
              Archivar
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-normal text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Mover a papelera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}