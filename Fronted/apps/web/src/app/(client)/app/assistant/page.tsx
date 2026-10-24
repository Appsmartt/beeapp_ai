'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Loader2,
  Send,
  Settings2,
} from 'lucide-react';
import type { AssistantCard, AssistantMessage } from '@beeapp/shared-types';
import {
  cancelAssistantAction,
  confirmAssistantAction,
  getAssistantSettings,
  getCurrentWebProfile,
  listAssistantMessages,
  sendAssistantMessage,
} from '@beeapp/api-client';
import ProfileAvatar from '@/components/client/ProfileAvatar';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AI_ASSISTANT_NAME } from '@/lib/client/chats';
import { contactInitials } from '@/lib/client/contacts';
import { resolveProfileAvatarUrl } from '@/lib/client/profileAvatarService';
import {
  buildChooseProviderMessage,
  mapAssistantMessagesToChat,
} from '@/lib/client/assistantChat';
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;

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
      const response = await sendAssistantMessage(auth, text, false);
      if (response.message) {
        appendMessage({
          ...response.message,
          cards: response.cards?.length
            ? response.cards
            : response.message.cards,
        });
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'No fue posible enviar el mensaje.',
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const resolveAction = async (card: AssistantCard, confirm: boolean) => {
    const actionId = String(card.action_id || '');
    if (!actionId || sending) return;
    setSending(true);
    setError('');
    try {
      const auth = await getWebAuth();
      if (!confirm) {
        await cancelAssistantAction(auth, actionId);
        appendMessage({
          id: `local-${Date.now()}`,
          role: 'assistant',
          content: 'Cancelé esa acción.',
          cards: [],
          created_at: new Date().toISOString(),
        });
        return;
      }
      const response = await confirmAssistantAction(auth, actionId);
      if (response.message) {
        appendMessage({
          ...response.message,
          cards: response.cards?.length ? response.cards : response.message.cards,
        });
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'No fue posible completar la acción.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-neutral-50">
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
              Puedo ayudarte con calendario, correos, notas y proveedores.
              <br />
              Escribe abajo para empezar.
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
                    </div>

                    {row.assistantCards?.length ? (
                      <AssistantMessageCards
                        cards={row.assistantCards}
                        busy={sending}
                        onConfirm={(card, confirm) => void resolveAction(card, confirm)}
                        onChooseProvider={(item) => void sendText(buildChooseProviderMessage(item))}
                        onOpenChat={() => router.push('/app')}
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
        <form
          className="mx-auto flex w-full max-w-2xl items-end gap-2 pr-20"
          onSubmit={(event) => {
            event.preventDefault();
            void sendText(draft);
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            disabled={sending || loading}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe a tu asistente…"
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
            disabled={sending || loading || !draft.trim()}
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
