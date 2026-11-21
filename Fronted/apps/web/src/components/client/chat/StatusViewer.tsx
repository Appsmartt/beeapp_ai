'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Send, ShoppingBag, Trash2, X } from 'lucide-react';
import { archiveStatus, getChatIdentities, sendStatusReply } from '@beeapp/api-client';
import { StatusItem } from '@/lib/client/statuses';
import { formatPrice } from '@/lib/client/myServices';
import { getRememberedChatIdentity, getWebAuth, loadStatusViewers } from '@/lib/client/liveData';
import StatusProgressPills from './StatusProgressPills';

const STATUS_DURATION = 6000;

interface StatusViewerProps {
  visible: boolean;
  statuses: StatusItem[];
  index: number;
  currentUserId?: string | null;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  onDeleted?: (statusId: string) => void;
}

export default function StatusViewer({
  visible,
  statuses,
  index,
  currentUserId,
  onChangeIndex,
  onClose,
  onDeleted,
}: StatusViewerProps) {
  const [progress, setProgress] = useState(0);
  const [productHidden, setProductHidden] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [viewers, setViewers] = useState<
    Array<{ contactId: string; contactName: string; viewedAt: string }>
  >([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyFocused, setReplyFocused] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const status = statuses[index];

  const goNext = () => {
    if (index < statuses.length - 1) {
      onChangeIndex(index + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      onChangeIndex(index - 1);
    }
  };

  useEffect(() => {
    if (!visible || !status) {
      return;
    }

    setProductHidden(false);
    setViewersOpen(false);
    setProgress(0);
    setViewers([]);
    setViewersCount(0);
    setReplyText('');
    setFeedback('');
  }, [visible, index, status?.id, status]);

  useEffect(() => {
    if (!visible || !status || viewersOpen || replyFocused || replySending) {
      return;
    }

    const step = 50;
    const increment = (step / STATUS_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          goNext();
          return 100;
        }

        return prev + increment;
      });
    }, step);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index, status?.id, viewersOpen, replyFocused, replySending]);

  const isOwnStatusPreview = Boolean(
    status && (status.authorId === 'me' || (currentUserId && status.authorId === currentUserId)),
  );

  useEffect(() => {
    if (!isOwnStatusPreview || !status) {
      return;
    }

    void loadStatusViewers(status.id)
      .then((response) => {
        setViewersCount(response.count);
      })
      .catch(() => {
        setViewersCount(0);
      });
  }, [isOwnStatusPreview, status?.id, status]);

  useEffect(() => {
    if (!viewersOpen || !status) {
      return;
    }

    setViewersLoading(true);

    void loadStatusViewers(status.id)
      .then((response) => {
        setViewersCount(response.count);
        setViewers(response.viewers);
      })
      .catch(() => {
        setViewersCount(0);
        setViewers([]);
      })
      .finally(() => {
        setViewersLoading(false);
      });
  }, [viewersOpen, status?.id, status]);

  if (!visible || !status) {
    return null;
  }

  const isPhoto = status.type === 'photo';
  const isVideo = status.type === 'video';
  const isMedia = isPhoto || isVideo;
  const isOwnStatus = isOwnStatusPreview;
  const background = status.bgColor ?? '#1A1A2E';
  const onDark = isMedia || background !== '#FFFFFF';
  const product = status.linkedProduct;
  const textPos = status.textPosition ?? { x: 50, y: 50 };

  const handleSendReply = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || replySending) return;
    setReplySending(true);
    setFeedback('');
    try {
      const auth = await getWebAuth();
      let senderIdentityId = getRememberedChatIdentity() || '';
      if (!senderIdentityId) {
        const identities = await getChatIdentities(auth);
        senderIdentityId =
          identities.identities.find((i) => i.identity_type === 'profile')?.id ||
          identities.identities[0]?.id ||
          '';
      }
      if (!senderIdentityId) {
        throw new Error('No se encontró una identidad activa para responder.');
      }
      await sendStatusReply(auth, status.id, {
        sender_identity_id: senderIdentityId,
        body: trimmed,
      });
      setReplyText('');
      setFeedback('Respuesta enviada al chat.');
      window.setTimeout(() => setFeedback(''), 2200);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'No fue posible enviar la respuesta.');
    } finally {
      setReplySending(false);
    }
  };

  const handleArchiveStatus = async () => {
    if (archiving) return;
    if (!confirm('¿Eliminar este estado?')) return;
    setArchiving(true);
    try {
      const auth = await getWebAuth();
      await archiveStatus(auth, status.id);
      onDeleted?.(status.id);
      if (statuses.length <= 1) {
        onClose();
      } else {
        goNext();
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'No fue posible eliminar el estado.');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none flex-col justify-between overflow-hidden bg-neutral-950">
      {isPhoto && status.photoUrl ? (
        <>
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-70 blur-2xl"
            style={{ backgroundImage: `url(${status.photoUrl})` }}
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : isVideo ? (
        <div className="absolute inset-0 bg-black/80" />
      ) : (
        <div className="absolute inset-0" style={{ background }} />
      )}

      <div className="absolute bottom-20 left-0 top-16 z-20 w-1/3 cursor-pointer" onClick={goPrev} />
      <div className="absolute bottom-20 right-0 top-16 z-20 w-1/3 cursor-pointer" onClick={goNext} />

      <div className="pointer-events-none relative z-30 mx-auto flex w-full max-w-md flex-1 flex-col justify-between p-4">
        <div className="pointer-events-auto space-y-2">
          <StatusProgressPills
            count={statuses.length}
            index={index}
            progressPercent={progress}
            onDark={onDark}
          />

          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-brand-primary"
                style={{ backgroundColor: status.authorColor }}
              >
                {status.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={status.authorAvatarUrl}
                    alt={status.authorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  status.authorInitials
                )}
              </div>
              <div>
                <p className={`text-xs font-semibold ${onDark ? 'text-white' : 'text-neutral-900'}`}>
                  {status.authorName}
                </p>
                <p className={`text-[10px] ${onDark ? 'text-white/70' : 'text-neutral-500'}`}>
                  {status.timestamp}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isOwnStatus ? (
                <button
                  type="button"
                  disabled={archiving}
                  onClick={() => void handleArchiveStatus()}
                  title="Eliminar estado"
                  className={`rounded-full p-2 ${
                    onDark
                      ? 'bg-white/10 text-rose-300 hover:bg-white/20'
                      : 'bg-rose-50 text-rose-600'
                  } disabled:opacity-50`}
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className={`rounded-full p-2 ${
                  onDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative my-4 flex flex-1 items-center justify-center">
          {isPhoto && status.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={status.photoUrl}
              alt="Status"
              className="h-full max-h-[68vh] w-full rounded-3xl object-cover shadow-2xl"
            />
          ) : null}

          {isVideo && status.photoUrl ? (
            <video
              src={status.photoUrl}
              autoPlay
              controls
              playsInline
              className="pointer-events-auto h-full max-h-[68vh] w-full rounded-3xl bg-black object-contain shadow-2xl"
            />
          ) : null}

          {status.imageLayers && status.imageLayers.length > 0
            ? status.imageLayers.map((imgLayer) =>
              imgLayer.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={imgLayer.id}
                  src={imgLayer.src}
                  alt="Layer"
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl object-cover shadow-md"
                  style={{
                    top: `${imgLayer.y}%`,
                    left: `${imgLayer.x}%`,
                    width: `${imgLayer.size || 110}px`,
                    height: `${imgLayer.size || 110}px`,
                  }}
                />
              ) : null,
            )
            : null}

          {status.textLayers && status.textLayers.length > 0 ? (
            status.textLayers.map((layer) => (
              <div
                key={layer.id}
                className="pointer-events-none absolute w-[86%] -translate-x-1/2 -translate-y-1/2"
                style={{
                  top: `${layer.y}%`,
                  left: `${layer.x}%`,
                  textAlign: layer.align ?? 'center',
                }}
              >
                <p
                  className="whitespace-pre-wrap break-words"
                  style={{
                    fontSize: `${layer.fontSize ?? 24}px`,
                    fontWeight: layer.fontWeight === '700' ? 700 : 400,
                    color: layer.color ?? '#FFFFFF',
                    lineHeight: 1.3,
                  }}
                >
                  {layer.content}
                </p>
              </div>
            ))
          ) : status.text ? (
            <div
              className="pointer-events-none absolute w-[86%] -translate-x-1/2 -translate-y-1/2"
              style={{
                top: `${textPos.y}%`,
                left: `${textPos.x}%`,
                textAlign: status.textAlign ?? 'center',
              }}
            >
              <p
                className="whitespace-pre-wrap break-words"
                style={{
                  fontSize: `${status.textSize ?? 24}px`,
                  fontWeight: status.textWeight === '700' ? 700 : 400,
                  color: status.textColor ?? '#FFFFFF',
                  lineHeight: 1.3,
                }}
              >
                {status.text}
              </p>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto space-y-2">
          {feedback ? (
            <p className="rounded-full bg-black/70 px-4 py-1.5 text-center text-xs font-semibold text-white">
              {feedback}
            </p>
          ) : null}

          {isOwnStatus ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setViewersOpen(true)}
                className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70"
              >
                <Eye className="h-4 w-4 text-brand-primary" />
                <span>Visto por {viewersCount}</span>
              </button>
            </div>
          ) : null}

          {product && !productHidden ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-xl animate-slide-up">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-neutral-900">{product.name}</p>
                <p className="text-[11px] font-normal text-neutral-500">
                  {product.price !== null ? formatPrice(product.price) : 'Ver oferta'}
                </p>
              </div>
              <Link
                href={`/app/beeservices/offer/${encodeURIComponent(product.id)}`}
                onClick={onClose}
                className="shrink-0 rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                Ver oferta
              </Link>
            </div>
          ) : null}

          {!isOwnStatus ? (
            <form onSubmit={(e) => void handleSendReply(e)} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onFocus={() => setReplyFocused(true)}
                onBlur={() => setReplyFocused(false)}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Responder a ${status.authorName}…`}
                className="h-10 flex-1 rounded-full border border-white/25 bg-black/50 px-4 text-xs text-white outline-none backdrop-blur-md placeholder:text-white/60 focus:border-white"
              />
              <button
                type="submit"
                disabled={replySending || !replyText.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white disabled:opacity-40"
              >
                {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {viewersOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-brand-primary" />
                <h3 className="text-sm font-semibold text-neutral-900">Visto por {viewersCount}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewersOpen(false)}
                className="rounded-full p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-60 divide-y divide-neutral-100 space-y-2 overflow-y-auto">
              {viewersLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  Cargando vistas...
                </div>
              ) : null}

              {!viewersLoading && viewers.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-500">Aún sin vistas</p>
              ) : null}

              {!viewersLoading
                ? viewers.map((viewer) => (
                  <div key={viewer.contactId} className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                        {viewer.contactName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-800">{viewer.contactName}</p>
                        <p className="text-[10px] font-normal text-neutral-500">{viewer.viewedAt}</p>
                      </div>
                    </div>
                  </div>
                ))
                : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
