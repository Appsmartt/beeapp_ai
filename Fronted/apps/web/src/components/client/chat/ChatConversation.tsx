'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BellOff,
  CheckCircle2,
  ChevronLeft,
  MoreVertical,
  Phone,
  Reply,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import type { AssistantCard } from '@beeapp/shared-types';
import {
  cancelAssistantAction,
  clearAssistantMessages,
  clearChatConversation,
  confirmAssistantAction,
  endCall,
  getActiveConversationCall,
  listAssistantMessages,
  markChatConversationDelivered,
  markChatConversationRead,
  sendAssistantMessage,
  speakAssistantText,
  startCall,
  transcribeAssistantAudio,
  updateChatConversationNotifications,
  type CallCredentialsResponse,
} from '@beeapp/api-client';
import { ASSISTANT_CHAT_ID, ChatItem, ChatMessage } from '@/lib/client/chats';
import type { ContactItem } from '@/lib/client/contacts';
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
import {
  getRememberedChatIdentity,
  getWebAuth,
  hydrateChatMedia,
  loadChatMessages,
  loadContacts,
  sendChatAttachmentMessage,
  sendContactChatMessage,
  sendLocationChatMessage,
  sendTextChatMessage,
  toggleChatMessageReaction,
} from '@/lib/client/liveData';
import { subscribeConversationMessages } from '@/lib/client/chatRealtime';
import { ChatAvatar } from './ChatAvatar';
import AssistantMessageCards from './AssistantMessageCards';
import MessageBubble from './MessageBubble';
import { ChatInlineText } from './ChatFormattedText';
import WriteBar, { type ChatAttachmentActionType } from './WriteBar';
import AiAutoReplyBanner from './AiAutoReplyBanner';
import InlineProductCards from './InlineProductCards';
import CallOverlay from './CallOverlay';
import ChatMessageContextMenu, { ChatMessageAction } from './ChatMessageContextMenu';

interface ChatConversationProps {
  chat: ChatItem;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenAiSettings?: () => void;
  onMuteChanged?: (muted: boolean) => void;
  onNavigateToChat?: (chatId: string, chatName: string, initialText: string) => void;
  onArchiveChat?: (conversationId: string, archived: boolean) => void;
}

function formatLastSeenSubtitle(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return 'Contacto de Buddy';
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return 'Contacto de Buddy';
  const diffMin = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMin < 1) return 'Últ. vez hace un momento';
  if (diffMin < 60) return `Últ. vez hace ${diffMin} min`;
  const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return `Últ. vez hoy a las ${timeStr}`;
  const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  return `Últ. vez ${dateStr} a las ${timeStr}`;
}

export default function ChatConversation({
  chat,
  onBack,
  onOpenProfile,
  onOpenAiSettings,
  onMuteChanged,
  onNavigateToChat,
  onArchiveChat,
}: ChatConversationProps) {
  const isAI = chat.id === ASSISTANT_CHAT_ID || !!chat.isAI;
  const isGroup = chat.isGroup;
  const online = chat.online;
  const isVerified = chat.verified;
  const isSellerChat = chat.isSellerChat;
  const groupMemberCount = chat.members?.length ?? 0;

  const isGroupAdmin = !isGroup
    || !chat.members?.length
    || chat.members.some((m) => m.isCurrentUser && (m.role === 'owner' || m.role === 'admin'));
  const groupPostingBlocked = isGroup && chat.postingPolicy === 'admins_only' && !isGroupAdmin;

  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ message: ChatMessage; x: number; y: number } | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<ContactItem[]>([]);
  const [toastText, setToastText] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{
    isVideo: boolean;
    credentials: CallCredentialsResponse;
  } | null>(null);
  const [muted, setMuted] = useState(Boolean(chat.isMuted));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSending, setAiSending] = useState(false);
  const [planBlock, setPlanBlock] = useState('');
  const [dictating, setDictating] = useState(false);
  const recordingRef = useRef<BrowserRecording | null>(null);
  const speechRef = useRef<HTMLAudioElement | null>(null);
  const micBusyRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    recordingRef.current?.cancel();
    speechRef.current?.pause();
  }, []);

  const showToast = (msg: string, ms = 2500) => {
    setToastText(msg);
    window.setTimeout(() => setToastText((cur) => (cur === msg ? null : cur)), ms);
  };

  useEffect(() => {
    if (isAI) {
      let active = true;
      setAiLoading(true);
      void getWebAuth()
        .then((auth) => listAssistantMessages(auth))
        .then((response) => {
          if (!active) return;
          setMessages(mapAssistantMessagesToChat(response.messages || []));
        })
        .catch(() => {
          if (active) setMessages([]);
        })
        .finally(() => {
          if (active) setAiLoading(false);
        });
      return () => {
        active = false;
      };
    }

    const identityId = chat.postingIdentityId;
    if (!identityId) {
      setMessages([]);
      return undefined;
    }
    let active = true;
    loadChatMessages(chat.id, identityId)
      .then((next) => {
        if (!active) return;
        setMessages(next);
        const lastMsg = next[next.length - 1];
        if (lastMsg?.id) {
          void getWebAuth()
            .then(async (auth) => {
              await markChatConversationDelivered(auth, chat.id, {
                identity_id: identityId,
                last_delivered_message_id: lastMsg.id,
              }).catch(() => undefined);
              await markChatConversationRead(auth, chat.id, {
                identity_id: identityId,
                last_read_message_id: lastMsg.id,
              }).catch(() => undefined);
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (active) setMessages([]);
      });

    return () => {
      active = false;
    };
  }, [chat.id, chat.postingIdentityId, isAI]);

  useEffect(() => {
    if (isAI || !chat.postingIdentityId) return undefined;
    const identityId = chat.postingIdentityId;
    return subscribeConversationMessages(chat.id, (row, eventType) => {
      const textContent = row.content ?? row.body ?? '';
      const rawKind = row.message_type ?? row.kind ?? 'text';
      const isMine = row.sender_identity_id ? row.sender_identity_id === identityId : false;

      if (eventType === 'UPDATE') {
        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== row.id) return item;
            const nextStatus =
              row.status === 'read' || row.status === 'delivered' || row.status === 'sent'
                ? row.status
                : item.status;
            return {
              ...item,
              text: textContent || item.text,
              status: nextStatus,
            };
          }),
        );
        return;
      }

      setMessages((prev) => {
        if (prev.some((item) => item.id === row.id)) return prev;
        const type: ChatMessage['type'] =
          rawKind === 'audio' || rawKind === 'voice'
            ? 'audio'
            : rawKind === 'image'
              ? 'image'
              : rawKind === 'video'
                ? 'video'
                : rawKind === 'file' || rawKind === 'document'
                  ? 'file'
                  : rawKind === 'location'
                    ? 'location'
                    : 'text';
        const incoming: ChatMessage = {
          id: row.id,
          isUser: isMine,
          type,
          text: textContent,
          time: new Date(row.created_at || Date.now()).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          createdAt: row.created_at,
          dateLabel: 'HOY',
          status: 'delivered',
        };
        if ((incoming.type === 'image' || incoming.type === 'video' || incoming.type === 'file' || incoming.type === 'audio') && identityId) {
          void hydrateChatMedia(incoming, identityId).then((withMedia) => {
            setMessages((current) =>
              current.map((item) => (item.id === withMedia.id ? { ...item, ...withMedia } : item)),
            );
          });
        }
        return [...prev, incoming];
      });

      if (!isMine && row.id) {
        void getWebAuth()
          .then(async (auth) => {
            await markChatConversationDelivered(auth, chat.id, {
              identity_id: identityId,
              last_delivered_message_id: row.id,
            }).catch(() => undefined);
            await markChatConversationRead(auth, chat.id, {
              identity_id: identityId,
              last_read_message_id: row.id,
            }).catch(() => undefined);
          })
          .catch(() => undefined);
      }
    });
  }, [chat.id, chat.postingIdentityId, isAI]);

  const appendAssistantReply = (message: ChatMessage, extraCards?: AssistantCard[]) => {
    setMessages((prev) => {
      const cards = extraCards?.length ? extraCards : message.assistantCards;
      return [...prev, { ...message, assistantCards: cards?.length ? cards : undefined }];
    });
  };

  const noteAssistantError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    if (isAssistantPlanBlock(message)) setPlanBlock(message);
    showToast(message);
  };

  const sendAssistantText = (rawText: string) => {
    const text = rawText.trim();
    if (!text || aiSending || planBlock) return;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      isUser: true,
      type: 'text',
      text,
      time: 'Ahora',
      dateLabel: 'HOY',
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTarget(null);
    setAiSending(true);

    void getWebAuth()
      .then(async (auth) => {
        const response = await sendAssistantMessage(auth, text, false, assistantSendContext());
        const assistantMsg = response.message;
        if (assistantMsg) {
          const mapped = mapAssistantMessagesToChat([assistantMsg])[0];
          const cards = response.cards?.length ? response.cards : assistantMsg.cards;
          applyAssistantClientEffects(cards, onArchiveChat);
          appendAssistantReply(mapped, cards);
        }
      })
      .catch((error) => {
        noteAssistantError(error, 'No fue posible enviar el mensaje al asistente.');
      })
      .finally(() => setAiSending(false));
  };

  const rememberDecision = (actionId: string, decision: AssistantDecision) => {
    setMessages((prev) =>
      prev.map((message) => {
        const cards = stampResolvedCards(message.assistantCards, actionId, decision);
        if (cards === message.assistantCards) return message;
        return { ...message, assistantCards: cards };
      }),
    );
  };

  const resolveAssistantAction = (card: AssistantCard, confirm: boolean) => {
    const actionId = String(card.action_id || '');
    if (!actionId || aiSending || assistantDecision(card)) return;
    setAiSending(true);
    const decision: AssistantDecision = confirm ? 'confirmed' : 'cancelled';
    void getWebAuth()
      .then(async (auth) => {
        if (!confirm) {
          const cancelled = await cancelAssistantAction(auth, actionId);
          rememberDecision(actionId, decision);
          if (cancelled.message) {
            appendAssistantReply(mapAssistantMessagesToChat([cancelled.message])[0], cancelled.cards);
            return;
          }
          appendAssistantReply({
            id: `local-${Date.now()}`,
            isUser: false,
            type: 'text',
            text: 'Entendido, cancelé la solicitud y no realicé ningún cambio.',
            time: 'Ahora',
            dateLabel: 'HOY',
            status: 'read',
          });
          return;
        }
        const response = await confirmAssistantAction(auth, actionId);
        rememberDecision(actionId, decision);
        const cards = response.cards?.length ? response.cards : response.message?.cards;
        applyAssistantClientEffects(cards, onArchiveChat);
        if (response.message) {
          const mapped = mapAssistantMessagesToChat([response.message])[0];
          appendAssistantReply(mapped, cards);
        }
      })
      .catch((error) => {
        noteAssistantError(error, 'No fue posible completar la acción.');
      })
      .finally(() => setAiSending(false));
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((cur) => (cur === messageId ? null : cur));
    }, 1800);
  };

  const speakMessage = (text: string) => {
    const spoken = plainAssistantSpeech(text);
    if (!spoken) return;
    void getWebAuth()
      .then((auth) => speakAssistantText(auth, spoken))
      .then((audio) => playAssistantAudio(audio.audio_base64, audio.audio_mime))
      .then((audio) => {
        speechRef.current?.pause();
        speechRef.current = audio;
      })
      .catch((error) => noteAssistantError(error, 'No se pudo reproducir la respuesta.'));
  };

  const toggleDictation = () => {
    if (!isAI || aiSending || micBusyRef.current || planBlock) return;
    micBusyRef.current = true;
    void (async () => {
      try {
        if (!recordingRef.current) {
          recordingRef.current = await startBrowserRecording();
          setDictating(true);
          return;
        }
        const clip = await recordingRef.current.stop();
        recordingRef.current = null;
        setDictating(false);
        const durationCheck = validateVoiceRecordingDuration(clip.durationMs);
        if (!durationCheck.ok) {
          showToast(durationCheck.message);
          return;
        }
        setAiSending(true);
        const auth = await getWebAuth();
        const transcript = await transcribeAssistantAudio(auth, clip.audioBase64, clip.mime);
        const validation = validateVoiceTranscript(transcript.text);
        setAiSending(false);
        if (!validation.ok) {
          showToast(validation.message);
          return;
        }
        sendAssistantText(validation.text);
      } catch (error) {
        recordingRef.current?.cancel();
        recordingRef.current = null;
        setDictating(false);
        setAiSending(false);
        noteAssistantError(error, 'No se pudo usar el micrófono.');
      } finally {
        micBusyRef.current = false;
      }
    })();
  };

  const handleSendMessage = (text: string) => {
    if (isAI) {
      sendAssistantText(text);
      return;
    }
    const targetReply = replyTarget;
    const newMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      isUser: true,
      type: 'text',
      text,
      time: 'Ahora',
      dateLabel: 'HOY',
      status: 'sent',
      replyTo: targetReply
        ? {
          id: targetReply.id,
          sender: targetReply.isUser ? 'Tú' : targetReply.senderName || chat.name,
          text: targetReply.text || 'Adjunto',
        }
        : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyTarget(null);

    if (chat.postingIdentityId) {
      const replyId = targetReply && !targetReply.id.startsWith('temp-') ? targetReply.id : undefined;
      void sendTextChatMessage(chat.id, chat.postingIdentityId, text, replyId)
        .then((saved) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === newMsg.id
                ? { ...saved, replyTo: saved.replyTo || newMsg.replyTo }
                : message,
            ),
          );
        })
        .catch(() => undefined);
    }
  };

  const handleToggleReaction = (message: ChatMessage, emoji: string) => {
    const identityId = chat.postingIdentityId;
    if (!identityId || isAI || message.id.startsWith('temp-')) return;
    const existing = message.reactions?.find((r) => r.emoji === emoji);
    const currentlyMine = Boolean(existing?.mine);

    setMessages((prev) =>
      prev.map((item) => {
        if (item.id !== message.id) return item;
        const currentReactions = [...(item.reactions || [])];
        const idx = currentReactions.findIndex((r) => r.emoji === emoji);
        if (currentlyMine) {
          if (idx >= 0) {
            const updatedCount = currentReactions[idx].count - 1;
            if (updatedCount <= 0) currentReactions.splice(idx, 1);
            else currentReactions[idx] = { emoji, count: updatedCount, mine: false };
          }
        } else if (idx >= 0) {
          currentReactions[idx] = { emoji, count: currentReactions[idx].count + 1, mine: true };
        } else {
          currentReactions.push({ emoji, count: 1, mine: true });
        }
        return { ...item, reactions: currentReactions };
      }),
    );

    void toggleChatMessageReaction(chat.id, message.id, identityId, emoji, currentlyMine).catch(() => undefined);
  };

  const beginCall = (isVideo: boolean) => {
    const identityId = chat.postingIdentityId;
    if (!identityId || isAI) return;
    if (isGroup) {
      showToast('Las llamadas solo están disponibles en chats individuales.');
      return;
    }
    void getWebAuth()
      .then(async (auth) => {
        const activeExisting = await getActiveConversationCall(auth, chat.id, identityId).catch(() => null);
        if (activeExisting?.call && activeExisting.call.status === 'ringing') {
          showToast('Ya hay una llamada en curso en esta conversación.');
        }
        const credentials = await startCall(auth, chat.id, {
          actor_identity_id: identityId,
          call_type: isVideo ? 'video' : 'voice',
        });
        setActiveCall({ isVideo, credentials });
      })
      .catch(() => {
        showToast('No fue posible iniciar la llamada.');
      });
  };

  const hangUpCall = () => {
    const identityId = chat.postingIdentityId;
    const callId = activeCall?.credentials.call.id;
    if (identityId && callId) {
      void getWebAuth()
        .then((auth) => endCall(auth, callId, { actor_identity_id: identityId }))
        .catch(() => undefined);
    }
    setActiveCall(null);
  };

  const toggleMuteConversation = () => {
    const identityId = chat.postingIdentityId || getRememberedChatIdentity();
    if (!identityId) return;
    const next = !muted;
    setMuted(next);
    onMuteChanged?.(next);
    setMenuOpen(false);
    if (isAI) return;
    void getWebAuth()
      .then((auth) =>
        updateChatConversationNotifications(auth, chat.id, {
          identity_id: identityId,
          notifications_enabled: !next,
        }),
      )
      .catch(() => {
        setMuted(!next);
        onMuteChanged?.(!next);
      });
  };

  const clearConversation = () => {
    setMenuOpen(false);
    if (!confirm('¿Vaciar todos los mensajes de este chat?')) return;
    if (isAI) {
      setMessages([]);
      void getWebAuth()
        .then((auth) => clearAssistantMessages(auth))
        .catch(() => undefined);
      showToast('Historial de conversación con el asistente limpiado.');
      return;
    }
    const identityId = chat.postingIdentityId;
    if (!identityId) return;
    void getWebAuth()
      .then((auth) => clearChatConversation(auth, chat.id, { identity_id: identityId }))
      .then(() => setMessages([]))
      .catch(() => undefined);
  };

  const handleAttachment = (type: ChatAttachmentActionType) => {
    const identityId = chat.postingIdentityId;
    if (!identityId || isAI) return;
    if (type === 'location') {
      if (!navigator.geolocation) {
        showToast('Geolocalización no soportada en este navegador.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void sendLocationChatMessage(
            chat.id,
            identityId,
            pos.coords.latitude,
            pos.coords.longitude,
          )
            .then((saved) => setMessages((prev) => [...prev, saved]))
            .catch(() => showToast('No fue posible enviar la ubicación.'));
        },
        () => showToast('Permiso de ubicación denegado.'),
      );
      return;
    }
    if (type === 'contact') {
      setContactPickerOpen(true);
      void loadContacts()
        .then((list) => setAvailableContacts(list))
        .catch(() => setAvailableContacts([]));
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === 'file'
          ? '*/*'
          : type === 'video'
            ? 'video/*'
            : 'image/*';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const identityId = chat.postingIdentityId;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !identityId) return;
    const messageType: 'image' | 'video' | 'document' | 'audio' = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'document';
    void sendChatAttachmentMessage(chat.id, identityId, file, messageType)
      .then((saved) => setMessages((prev) => [...prev, saved]))
      .catch(() => showToast('No fue posible enviar el archivo adjunto.'));
  };

  const handleVoiceNote = (durationLabel: string, audioFile?: File) => {
    const identityId = chat.postingIdentityId;
    if (!identityId) return;
    if (!audioFile) {
      showToast('No se pudo grabar la nota de voz. Verifica el permiso del micrófono.');
      return;
    }
    void sendChatAttachmentMessage(chat.id, identityId, audioFile, 'audio')
      .then((saved) => {
        setMessages((prev) => [...prev, { ...saved, audioDuration: durationLabel }]);
      })
      .catch(() => showToast('No fue posible enviar la nota de voz.'));
  };

  const handleSelectMessageAction = (action: ChatMessageAction) => {
    if (!contextMenu) return;
    const target = contextMenu.message;
    setContextMenu(null);

    switch (action) {
      case 'reply':
        setReplyTarget(target);
        break;
      case 'copy':
        if (target.text) {
          void navigator.clipboard?.writeText(target.text).catch(() => undefined);
          showToast('Texto copiado al portapapeles', 2000);
        }
        break;
    }
  };

  return (
    <div className="relative h-full min-h-0 select-none overflow-hidden bg-neutral-50">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <div className="min-w-0">
          <div className="z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2.5">
            <div className="mr-2 flex min-w-0 flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg p-1 text-neutral-700 hover:bg-neutral-100"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div
                onClick={() => (isAI ? onOpenAiSettings?.() : onOpenProfile())}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
              >
                <div className="relative shrink-0">
                  <ChatAvatar
                    name={chat.name}
                    avatarUrl={chat.avatarUrl}
                    isGroup={isGroup}
                    isAI={isAI}
                    size="sm"
                  />
                  {online && !isGroup && !isAI ? (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-bold leading-tight text-neutral-900">
                      {chat.name}
                    </span>
                    {isVerified ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] font-normal leading-tight text-neutral-500">
                    {isAI
                      ? 'Asistente de Buddy · siempre disponible'
                      : isGroup
                        ? `${groupMemberCount} participantes`
                        : online
                          ? 'En línea'
                          : formatLastSeenSubtitle(chat.lastSeenAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-neutral-700">
              {isAI ? (
                <button
                  type="button"
                  onClick={onOpenAiSettings}
                  className="rounded-lg p-1.5 text-brand-primary hover:bg-neutral-100"
                  title="Configuración IA"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </button>
              ) : !isGroup ? (
                <>
                  <button
                    type="button"
                    onClick={() => beginCall(false)}
                    className="rounded-lg p-1.5 hover:bg-neutral-100"
                    title="Llamada de voz"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => beginCall(true)}
                    className="rounded-lg p-1.5 hover:bg-neutral-100"
                    title="Videollamada"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1.5 hover:bg-neutral-100"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isSellerChat && !isAI ? (
            <AiAutoReplyBanner enabled={aiAutoReply} onChange={setAiAutoReply} />
          ) : null}
        </div>

        <div ref={scrollRef} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4 pb-3">
          {aiLoading ? (
            <p className="py-6 text-center text-xs text-neutral-500">Cargando conversación...</p>
          ) : null}

          {!aiLoading && isAI && messages.length === 0 ? (
            <p className="px-6 py-4 text-center text-xs text-neutral-500">
              Puedo consultar tu información en Buddy, leer y agendar en tus calendarios, leer y enviar correos, crear notas, gestionar chats y negocios, revisar tu carrito y buscar en Buddy Services.
            </p>
          ) : null}

          {messages.map((msg, index) => {
            const currentLabel = msg.dateLabel || 'HOY';
            const prevLabel = index > 0 ? (messages[index - 1].dateLabel || 'HOY') : null;
            const showDateHeader = index === 0 || currentLabel !== prevLabel;

            return (
              <div key={msg.id}>
                {showDateHeader ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-md bg-neutral-200 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-500">
                      {currentLabel}
                    </span>
                  </div>
                ) : null}

                <div
                  id={`chat-msg-${msg.id}`}
                  className={`rounded-2xl transition-colors ${
                    highlightedMessageId === msg.id ? 'bg-brand-primary/10 p-1' : ''
                  }`}
                >
                  <div
                    onContextMenu={(e) => {
                      if (!isAI) {
                        e.preventDefault();
                        setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
                      }
                    }}
                  >
                    {isAI && !msg.isUser && msg.text ? (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.text || '')}
                        className="mb-1 ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary"
                        aria-label="Escuchar respuesta"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Escuchar
                      </button>
                    ) : null}
                    <MessageBubble
                      senderName={msg.senderName}
                      senderVerified={msg.senderVerified}
                      isUser={msg.isUser}
                      isAI={isAI && !msg.isUser}
                      sentByAi={msg.sentByAi}
                      type={msg.type}
                      text={msg.text}
                      mediaUrl={msg.mediaUrl}
                      fileName={msg.fileName}
                      fileSize={msg.fileSize}
                      audioDuration={msg.audioDuration}
                      status={msg.status}
                      time={msg.time}
                      replyTo={msg.replyTo}
                      location={msg.location}
                      contactCard={msg.contactCard}
                      statusReply={msg.statusReply}
                      callNotice={msg.callNotice}
                      reactions={msg.reactions}
                      isEdited={msg.isEdited}
                      isDestroyed={msg.isDestroyed}
                      isPinned={msg.isPinned}
                      onOpenMedia={
                        msg.mediaUrl && msg.type === 'image'
                          ? () => setViewerUrl(msg.mediaUrl || null)
                          : undefined
                      }
                      onClickReply={handleJumpToMessage}
                      onToggleReaction={(emoji) => handleToggleReaction(msg, emoji)}
                    />
                  </div>
                  {msg.assistantCards?.length ? (
                    <AssistantMessageCards
                      cards={msg.assistantCards}
                      busy={aiSending}
                      onConfirm={resolveAssistantAction}
                      onChooseProvider={(item) => sendAssistantText(buildChooseProviderMessage(item))}
                      onOpenChat={(conversationId) => onNavigateToChat?.(conversationId, 'Proveedor', '')}
                    />
                  ) : null}
                  {msg.showCatalog && !isAI ? (
                    <div className="my-2 pl-4">
                      <InlineProductCards
                        onContact={(r) =>
                          onNavigateToChat?.(
                            r.id,
                            r.sellerName,
                            `Hola, me interesa tu servicio de ${r.productName}`,
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {aiSending ? <p className="pl-1 text-xs text-neutral-500">Escribiendo...</p> : null}
        </div>

        <div className="min-w-0 bg-white">
          {replyTarget ? (
            <div className="flex shrink-0 items-center justify-between border-t border-brand-primary/20 bg-brand-primary/5 px-4 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <Reply className="h-4 w-4 shrink-0 text-brand-primary" />
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-brand-primary">
                    Respondiendo a {replyTarget.isUser ? 'Tú' : replyTarget.senderName || chat.name}
                  </span>
                  <p className="truncate font-normal text-neutral-600">
                    {replyTarget.text ? <ChatInlineText text={replyTarget.text} /> : 'Adjunto'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="z-20 border-t border-neutral-200 bg-white">
            {isAI && planBlock ? <p className="px-4 pt-2 text-xs text-neutral-600">{planBlock}</p> : null}
            <WriteBar
              onSendMessage={handleSendMessage}
              onSendVoiceNote={handleVoiceNote}
              onSendAttachment={handleAttachment}
              variant={isAI ? 'assistant' : 'default'}
              disabled={(isAI && (aiSending || aiLoading || Boolean(planBlock))) || groupPostingBlocked}
              disabledReason={
                groupPostingBlocked
                  ? 'Solo los administradores pueden enviar mensajes en este grupo.'
                  : undefined
              }
              dictating={dictating}
              onDictate={isAI ? toggleDictation : undefined}
            />
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute right-3 top-14 z-40 w-44 rounded-2xl border border-neutral-200 bg-white py-1 text-xs text-neutral-800 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              if (isAI) {
                onOpenAiSettings?.();
              } else {
                onOpenProfile();
              }
            }}
            className="w-full px-4 py-2.5 text-left font-normal hover:bg-neutral-50"
          >
            {isAI ? 'Configuración IA' : 'Ver info'}
          </button>
          <button
            type="button"
            onClick={toggleMuteConversation}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-normal hover:bg-neutral-50"
          >
            <BellOff className="h-3.5 w-3.5" /> {muted ? 'Activar notificaciones' : 'Silenciar'}
          </button>
          <button
            type="button"
            onClick={clearConversation}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-normal text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Vaciar chat
          </button>
        </div>
      ) : null}

      <ChatMessageContextMenu
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        message={contextMenu?.message || null}
        onClose={() => setContextMenu(null)}
        onSelectAction={handleSelectMessageAction}
        onToggleReaction={handleToggleReaction}
      />

      {contactPickerOpen ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[75vh] w-full max-w-sm flex-col rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">Compartir contacto</h3>
              <button
                type="button"
                onClick={() => setContactPickerOpen(false)}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex-1 divide-y divide-neutral-100 overflow-y-auto">
              {availableContacts.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-500">
                  No tienes contactos guardados para compartir.
                </p>
              ) : (
                availableContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setContactPickerOpen(false);
                      const identityId = chat.postingIdentityId;
                      if (!identityId) return;
                      void sendContactChatMessage(chat.id, identityId, {
                        name: contact.name,
                        phone: contact.phone,
                        email: contact.email,
                      })
                        .then((saved) => setMessages((prev) => [...prev, saved]))
                        .catch(() => showToast('No fue posible compartir el contacto.'));
                    }}
                    className="flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-neutral-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-neutral-900">{contact.name}</p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {contact.phone || contact.email || contact.profession || 'Contacto'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeCall ? (
        <CallOverlay
          contactName={chat.name}
          isVideo={activeCall.isVideo}
          isVerified={isVerified}
          agora={activeCall.credentials.agora}
          onHangUp={hangUpCall}
        />
      ) : null}

      {viewerUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setViewerUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewerUrl} alt="Imagen del chat" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      {toastText ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toastText}
        </div>
      ) : null}
    </div>
  );
}
