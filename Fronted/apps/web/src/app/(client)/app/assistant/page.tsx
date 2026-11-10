'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Loader2,
  Mic,
  Send,
  Settings2,
  Volume2,
} from 'lucide-react';
import type { AssistantCard, AssistantMessage } from '@beeapp/shared-types';
import {
  cancelAssistantAction,
  confirmAssistantAction,
  getAssistantSettings,
  getCurrentWebProfile,
  listAssistantMessages,
  sendAssistantMessage,
  speakAssistantText,
  transcribeAssistantAudio,
} from '@beeapp/api-client';
import ProfileAvatar from '@/components/client/ProfileAvatar';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AI_ASSISTANT_NAME } from '@/lib/client/chats';
import { contactInitials } from '@/lib/client/contacts';
import { resolveProfileAvatarUrl } from '@/lib/client/profileAvatarService';
import {
  applyAssistantClientEffects,
  assistantDecision,
  assistantSendContext,
  buildChooseProviderMessage,
  isAssistantPlanBlock,
  mapAssistantMessagesToChat,
  plainAssistantSpeech,
  playAssistantAudio,
  stampResolvedCards,
  type AssistantDecision,
} from '@/lib/client/assistantChat';
import { startBrowserRecording, type BrowserRecording } from '@/lib/client/assistantAudio';
import {
  validateVoiceRecordingDuration,
  validateVoiceTranscript,
} from '@/lib/client/voiceTranscriptValidation';
import { getWebAuth } from '@/lib/client/liveData';
import AssistantMessageCards from '@/components/client/chat/AssistantMessageCards';

function clock(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function AssistantTextPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [assistantName, setAssistantName] = useState(AI_ASSISTANT_NAME);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [planBlock, setPlanBlock] = useState('');
  const [recording, setRecording] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const recordingRef = useRef<BrowserRecording | null>(null);
  const speechRef = useRef<HTMLAudioElement | null>(null);
  const micBusyRef = useRef(false);

  const initials = contactInitials(
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú',
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const [settingsResponse, messagesResponse] = await Promise.all([
        getAssistantSettings(auth),
        listAssistantMessages(auth),
      ]);
      if (settingsResponse.settings?.name?.trim()) {
        setAssistantName(settingsResponse.settings.name.trim());
      }
      setMessages(messagesResponse.messages ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el asistente.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    recordingRef.current?.cancel();
    speechRef.current?.pause();
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [profileResponse, auth] = await Promise.all([
          getCurrentWebProfile(),
          getWebAuth(),
        ]);
        const url = await resolveProfileAvatarUrl(profileResponse.profile, auth);
        if (active) setAvatarUrl(url);
      } catch {
        if (active) setAvatarUrl(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const appendMessage = (message: AssistantMessage) => {
    setMessages((current) => [...current, message]);
  };

  const noteError = (sendError: unknown, fallback: string) => {
    const message = sendError instanceof Error ? sendError.message : fallback;
    if (isAssistantPlanBlock(message)) setPlanBlock(message);
    setError(message);
  };

  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending || planBlock) return;

    appendMessage({
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      cards: [],
      created_at: new Date().toISOString(),
    });
    setDraft('');
    setSending(true);
    setError('');

    try {
      const auth = await getWebAuth();
      const response = await sendAssistantMessage(auth, text, false, assistantSendContext());
      const cards = response.cards?.length ? response.cards : response.message?.cards;
      applyAssistantClientEffects(cards);
      if (response.message) {
        appendMessage({
          ...response.message,
          cards: cards || [],
        });
      }
    } catch (sendError) {
      noteError(sendError, 'No fue posible enviar el mensaje.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const rememberDecision = (actionId: string, decision: AssistantDecision) => {
    setMessages((current) => current.map((message) => {
      const cards = stampResolvedCards(message.cards, actionId, decision);
      if (cards === message.cards) return message;
      return { ...message, cards: cards || [] };
    }));
  };

  const resolveAction = async (card: AssistantCard, confirm: boolean) => {
    const actionId = String(card.action_id || '');
    if (!actionId || sending || assistantDecision(card)) return;
    setSending(true);
    setError('');
    const decision: AssistantDecision = confirm ? 'confirmed' : 'cancelled';
    try {
      const auth = await getWebAuth();
      if (!confirm) {
        const cancelled = await cancelAssistantAction(auth, actionId);
        rememberDecision(actionId, decision);
        if (cancelled.message) {
          appendMessage(cancelled.message);
          return;
        }
        appendMessage({
          id: `local-${Date.now()}`,
          role: 'assistant',
          content: 'Entendido, cancelé la solicitud y no realicé ningún cambio.',
          cards: [],
          created_at: new Date().toISOString(),
        });
        return;
      }
      const response = await confirmAssistantAction(auth, actionId);
      rememberDecision(actionId, decision);
      const cards = response.cards?.length ? response.cards : response.message?.cards;
      applyAssistantClientEffects(cards);
      if (response.message) {
        appendMessage({
          ...response.message,
          cards: cards || [],
        });
      }
    } catch (actionError) {
      noteError(actionError, 'No fue posible completar la acción.');
    } finally {
      setSending(false);
    }
  };

  const speak = async (text: string) => {
    const spoken = plainAssistantSpeech(text);
    if (!spoken) return;
    try {
      const auth = await getWebAuth();
      const audio = await speakAssistantText(auth, spoken);
      speechRef.current?.pause();
      speechRef.current = await playAssistantAudio(audio.audio_base64, audio.audio_mime);
    } catch (speakError) {
      noteError(speakError, 'No se pudo reproducir la respuesta.');
    }
  };

  const toggleMic = async () => {
    if (sending || micBusyRef.current || planBlock) return;
    micBusyRef.current = true;
    try {
      if (!recordingRef.current) {
        recordingRef.current = await startBrowserRecording();
        setRecording(true);
        return;
      }
      const clip = await recordingRef.current.stop();
      recordingRef.current = null;
      setRecording(false);
      const durationCheck = validateVoiceRecordingDuration(clip.durationMs);
      if (!durationCheck.ok) {
        setError(durationCheck.message);
        return;
      }
      setSending(true);
      const auth = await getWebAuth();
      const transcript = await transcribeAssistantAudio(auth, clip.audioBase64, clip.mime);
      const validation = validateVoiceTranscript(transcript.text);
      setSending(false);
      if (!validation.ok) {
        setError(validation.message);
        return;
      }
      await sendText(validation.text);
    } catch (micError) {
      recordingRef.current?.cancel();
      recordingRef.current = null;
      setRecording(false);
      setSending(false);
      noteError(micError, 'No se pudo usar el micrófono.');
    } finally {
      micBusyRef.current = false;
    }
  };

  const blocked = Boolean(planBlock);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-neutral-50">
      <header className="z-10 flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <Link
          href="/app"
          className="rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
          <Bot className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-neutral-900">
            {assistantName}
          </h1>
          <p className="truncate text-[11px] font-normal text-neutral-500">
            Asistente de Buddy · siempre disponible
          </p>
        </div>

        <Link
          href="/app/profile/ai-settings"
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-brand-primary"
          title="Configuración"
        >
          <Settings2 className="h-5 w-5" />
        </Link>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
              Cargando conversación…
            </div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <p className="py-8 text-center text-xs leading-relaxed text-neutral-500">
              Puedo consultar tu información en Buddy, leer y agendar en tus calendarios, leer y enviar correos, crear notas, gestionar chats y negocios, revisar tu carrito y buscar en Buddy Services.
            </p>
          ) : null}

          {!loading
            ? messages.map((source) => {
              const row = mapAssistantMessagesToChat([source])[0];
              if (!row) return null;
              const isUser = row.isUser;

              return (
                <div
                  key={row.id}
                  className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {isUser ? (
                    <ProfileAvatar
                      size="xs"
                      initials={initials}
                      avatarUrl={avatarUrl}
                      className="mt-1 shadow-none"
                    />
                  ) : (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`flex max-w-[72%] flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`inline-block rounded-[18px] px-3.5 py-2 text-sm leading-snug ${
                        isUser
                          ? 'rounded-br-[4px] bg-brand-primary text-white'
                          : 'rounded-bl-[4px] border border-neutral-200 bg-white text-neutral-900 shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words font-normal">
                        {row.text}
                      </p>
                      {!isUser && row.text ? (
                        <button
                          type="button"
                          onClick={() => void speak(row.text || '')}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary"
                          aria-label="Escuchar respuesta"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Escuchar
                        </button>
                      ) : null}
                    </div>

                    {row.assistantCards?.length ? (
                      <AssistantMessageCards
                        cards={row.assistantCards}
                        busy={sending}
                        onConfirm={(card, confirm) => void resolveAction(card, confirm)}
                        onChooseProvider={(item) => void sendText(buildChooseProviderMessage(item))}
                        onOpenChat={(conversationId) => router.push(`/app?openChat=${encodeURIComponent(conversationId)}`)}
                      />
                    ) : null}

                    <span className="mt-0.5 px-1 text-[10px] text-neutral-400">
                      {row.time || clock(source.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
            : null}

          {sending ? (
            <div className="flex gap-2">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-[18px] rounded-bl-[4px] border border-neutral-200 bg-white px-4 py-2.5 shadow-sm">
                <p className="text-xs text-neutral-500">Escribiendo…</p>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="z-10 shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        {planBlock ? (
          <p className="mx-auto mb-2 w-full max-w-2xl text-xs text-neutral-600">{planBlock}</p>
        ) : null}
        <form
          className="mx-auto flex w-full max-w-2xl items-end gap-2 pr-20"
          onSubmit={(event) => {
            event.preventDefault();
            void sendText(draft);
          }}
        >
          <button
            type="button"
            onClick={() => void toggleMic()}
            disabled={blocked || sending}
            className={`mb-0.5 flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl ${
              recording ? 'bg-red-500 text-white' : 'bg-brand-primary/10 text-brand-primary'
            } disabled:opacity-40`}
            aria-label={recording ? 'Detener dictado' : 'Dictar'}
          >
            <Mic className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            disabled={sending || loading || recording || blocked}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={recording ? 'Escuchando…' : 'Escribe a tu asistente…'}
            className="box-border max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-normal text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-primary focus:bg-white disabled:opacity-60"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendText(draft);
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || loading || recording || blocked || !draft.trim()}
            className="mb-0.5 flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
