'use client';

import { useState } from 'react';
import {
  Star,
  Paperclip,
  MoreVertical,
  MailOpen,
  Mail,
  Archive,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type { EmailItem } from '@/mocks/emails';

interface MailListItemProps {
  email: EmailItem;
  isSelected: boolean;
  onOpen: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const initialsOf = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** Fila de correo: remitente, asunto, preview, adjuntos y menú de acciones */
export default function MailListItem({
  email,
  isSelected,
  onOpen,
  onToggleStar,
  onToggleRead,
  onArchive,
  onDelete,
}: MailListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const runAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const menuItems = [
    { key: 'read', label: email.unread ? 'Marcar como leído' : 'Marcar como no leído', icon: email.unread ? MailOpen : Mail, action: onToggleRead },
    { key: 'star', label: email.starred ? 'Quitar de favoritos' : 'Marcar favorito', icon: Star, action: onToggleStar },
    { key: 'archive', label: 'Archivar', icon: Archive, action: onArchive },
  ];

  return (
    <div
      onClick={onOpen}
      className={`relative px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-brand-primary/10 border-l-4 border-brand-primary pl-3'
          : email.unread
            ? 'bg-brand-primary/5 hover:bg-brand-primary/10'
            : 'hover:bg-neutral-50'
      }`}
    >
      <div
        style={{ backgroundColor: email.initialsColor }}
        className="w-10 h-10 rounded-full text-white text-xs font-normal flex items-center justify-center shrink-0"
      >
        {initialsOf(email.sender)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-normal text-neutral-900 truncate">{email.sender}</span>
            {email.senderVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            )}
          </span>

          <span className="flex items-center gap-1.5 shrink-0">
            {email.unread && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            <span className="text-[10px] font-normal text-neutral-400">{email.timestamp}</span>
          </span>
        </div>

        <p
          className={`text-xs font-normal truncate mt-0.5 ${
            email.unread ? 'text-brand-primary' : 'text-neutral-800'
          }`}
        >
          {email.subject}
        </p>

        <p className="text-[11px] font-normal text-neutral-500 truncate mt-0.5">{email.preview}</p>

        <div className="flex items-center gap-2 mt-1.5">
          {email.hasAttachment && (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-neutral-600 bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded-md">
              <Paperclip className="w-2.5 h-2.5" />
              Adjunto
            </span>
          )}

          <span
            style={{ borderColor: email.initialsColor, color: email.initialsColor }}
            className="text-[9px] font-normal border px-1.5 py-0.5 rounded-md truncate max-w-[120px]"
          >
            {email.account.split('@')[0]}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleStar();
          }}
          aria-label={email.starred ? 'Quitar de favoritos' : 'Marcar favorito'}
          className="p-1 text-neutral-300 hover:text-amber-400 transition-colors"
        >
          <Star className={`w-4 h-4 ${email.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          aria-label="Más acciones"
          className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
            }}
          />
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute top-10 right-3 z-30 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl py-1"
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => runAction(item.action)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-normal text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <item.icon className="w-3.5 h-3.5 text-neutral-500" />
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => runAction(onDelete)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-normal text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
