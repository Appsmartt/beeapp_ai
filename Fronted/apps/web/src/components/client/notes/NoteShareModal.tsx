'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Search, Share2, Trash2, UserPlus, X } from 'lucide-react';
import type {
  NoteShare,
  NoteShareRecipient,
} from '@beeapp/shared-types';
import { webNotesApi } from './webNotesApi';

interface NoteShareModalProps {
  isOpen: boolean;
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}

export default function NoteShareModal({
  isOpen,
  noteId,
  noteTitle,
  onClose,
}: NoteShareModalProps) {
  const [query, setQuery] = useState('');
  const [recipients, setRecipients] = useState<NoteShareRecipient[]>([]);
  const [outgoingShares, setOutgoingShares] = useState<NoteShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSharesAndRecipients = useCallback(async (searchText: string) => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, outRes] = await Promise.all([
        webNotesApi.getShareRecipients({ q: searchText.trim() || undefined, limit: 20 }).catch(() => ({ recipients: [] })),
        webNotesApi.getOutgoingShares(noteId).catch(() => ({ shares: [] })),
      ]);
      setRecipients(recRes.recipients || []);
      setOutgoingShares(outRes.shares || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar destinatarios.');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      void loadSharesAndRecipients(query);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isOpen, query, loadSharesAndRecipients]);

  if (!isOpen) return null;

  const handleShareWith = async (recipient: NoteShareRecipient) => {
    setBusyId(recipient.id);
    setError(null);
    setNotice(null);
    try {
      await webNotesApi.createShare(noteId, {
        recipient_id: recipient.id,
      });
      const label = [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || recipient.email;
      setNotice(`Nota compartida con ${label}.`);
      await loadSharesAndRecipients(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible compartir la nota.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (shareId: string) => {
    setBusyId(shareId);
    setError(null);
    setNotice(null);
    try {
      await webNotesApi.revokeShare(shareId);
      setNotice('Acceso revocado.');
      await loadSharesAndRecipients(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible revocar el acceso.');
    } finally {
      setBusyId(null);
    }
  };

  const sharedRecipientIds = new Set(
    outgoingShares
      .filter((s) => !s.revoked_at)
      .map((s) => s.shared_with_user_id),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 flex max-h-[90dvh] sm:max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
              <Share2 className="h-4 w-4 shrink-0 text-brand-primary" />
              <span className="truncate">Compartir nota</span>
            </h2>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{noteTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar contacto por nombre o correo..."
                className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-xs text-neutral-800 outline-none focus:border-brand-primary focus:bg-white"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Destinatarios disponibles
            </p>
            {loading && recipients.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-xs text-neutral-400 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                <span>Buscando...</span>
              </div>
            ) : recipients.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">
                No se encontraron contactos disponibles.
              </p>
            ) : (
              <div className="max-h-48 divide-y divide-neutral-100 overflow-y-auto rounded-2xl border border-neutral-200">
                {recipients.map((rec) => {
                  const fullName = [rec.first_name, rec.last_name].filter(Boolean).join(' ') || rec.email;
                  const alreadyShared = sharedRecipientIds.has(rec.id);
                  return (
                    <div key={rec.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-neutral-900">{fullName}</p>
                        <p className="truncate text-[11px] text-neutral-500">{rec.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyShared || busyId === rec.id}
                        onClick={() => void handleShareWith(rec)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          alreadyShared
                            ? 'bg-neutral-100 text-neutral-500'
                            : 'bg-brand-primary text-white hover:bg-brand-dark'
                        }`}
                      >
                        {alreadyShared ? (
                          <span>Compartida</span>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            <span>Compartir</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {outgoingShares.filter((s) => !s.revoked_at).length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Personas con acceso
              </p>
              <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                {outgoingShares
                  .filter((s) => !s.revoked_at)
                  .map((share) => {
                    const label =
                      [share.shared_with?.first_name, share.shared_with?.last_name].filter(Boolean).join(' ')
                      || 'Contacto compartido';
                    return (
                      <div key={share.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-neutral-900">{label}</p>
                          <p className="text-[11px] text-neutral-500">
                            {share.permission === 'edit' ? 'Puede editar' : 'Solo lectura'}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === share.id}
                          onClick={() => void handleRevoke(share.id)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          title="Revocar acceso"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
