'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Phone, Video, MoreVertical, BellOff, Trash2, Bot, SlidersHorizontal, CheckCircle2, Reply, Pencil, X } from 'lucide-react';
import type { AssistantCard } from '@beeapp/shared-types';
import { ChatItem, ChatMessage, ASSISTANT_CHAT_ID } from '@/lib/client/chats';
import {
  buildChooseProviderMessage,
  mapAssistantMessagesToChat,
} from '@/lib/client/assistantChat';
import {
  getRememberedChatIdentity,
  getWebAuth,
  loadChatMessages,
  sendChatAttachmentMessage,
  sendLocationChatMessage,
  sendTextChatMessage,
} from '@/lib/client/liveData';
import {
  cancelAssistantAction,
  clearAssistantMemory,
  clearChatConversation,
  confirmAssistantAction,
  endCall,
  listAssistantMessages,
  sendAssistantMessage,
  startCall,
  updateChatConversationNotifications,
  type CallCredentialsResponse,
} from '@beeapp/api-client';
import AssistantMessageCards from './AssistantMessageCards';
import { subscribeConversationMessages } from '@/lib/client/chatRealtime';
import MessageBubble from './MessageBubble';
import WriteBar from './WriteBar';
import AiAutoReplyBanner from './AiAutoReplyBanner';
import InlineProductCards from './InlineProductCards';
import CallOverlay from './CallOverlay';
import PinnedMessageBanner from './PinnedMessageBanner';
import ForwardMessageModal from './ForwardMessageModal';
import ChatMessageContextMenu, { ChatMessageAction } from './ChatMessageContextMenu';

interface ChatConversationProps {
  chat: ChatItem;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenAiSettings?: () => void;
  onNavigateToChat?: (chatId: string, chatName: string, initialText: string) => void;
}

export default function ChatConversation({
  chat, onBack, onOpenProfile, onOpenAiSettings, onNavigateToChat,
}: ChatConversationProps) {
  const isAI = chat.id === ASSISTANT_CHAT_ID || !!chat.isAI;
  const isGroup = chat.isGroup;
  const online = chat.online;
  const isVerified = chat.verified;
  const isSellerChat = chat.isSellerChat;
  const groupMemberCount = chat.members?.length ?? 0;

  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ message: ChatMessage; x: number; y: number } | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editingText, setEditingText] = useState('');
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{
    isVideo: boolean;
    credentials: CallCredentialsResponse;
  } | null>(null);
  const [muted, setMuted] = useState(Boolean(chat.isMuted));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSending, setAiSending] = useState(false);

  const pinnedMessage = isAI ? undefined : messages.find((m) => m.isPinned);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        if (active) setMessages(next);
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
    return subscribeConversationMessages(chat.id, (row) => {
      if (row.sender_id && chat.postingIdentityId) {
        setMessages((prev) => {
          if (prev.some((item) => item.id === row.id)) return prev;
          const incoming: ChatMessage = {
            id: row.id,
            isUser: false,
            type: row.kind === 'audio' ? 'audio' : row.kind === 'image' ? 'image' : 'text',
            text: row.body || '',
            time: 'Ahora',
            status: 'delivered',
          };
          return [...prev, incoming];
        });
      }
    });
  }, [chat.id, chat.postingIdentityId, isAI]);

  const appendAssistantReply = (message: ChatMessage, extraCards?: AssistantCard[]) => {
    setMessages((prev) => {
      const cards = extraCards?.length
        ? extraCards
        : message.assistantCards;
      return [...prev, { ...message, assistantCards: cards?.length ? cards : undefined }];
    });
  };

  const sendAssistantText = (rawText: string) => {
    const text = rawText.trim();
    if (!text || aiSending) return;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      isUser: true,
      type: 'text',
      text,
      time: 'Ahora',
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTarget(null);
    setAiSending(true);

    void getWebAuth()
      .then(async (auth) => {
        const response = await sendAssistantMessage(auth, text, false);
        const assistantMsg = response.message;
        if (assistantMsg) {
          const mapped = mapAssistantMessagesToChat([assistantMsg])[0];
          const cards = response.cards?.length ? response.cards : assistantMsg.cards;
          appendAssistantReply(mapped, cards);
        }
      })
      .catch(() => {
        setToastText('No fue posible enviar el mensaje al asistente.');
        setTimeout(() => setToastText(null), 2500);
      })
      .finally(() => setAiSending(false));
  };

  const resolveAssistantAction = (card: AssistantCard, confirm: boolean) => {
    const actionId = String(card.action_id || '');
    if (!actionId || aiSending) return;
    setAiSending(true);
    void getWebAuth()
      .then(async (auth) => {
        if (!confirm) {
          await cancelAssistantAction(auth, actionId);
          appendAssistantReply({
            id: `local-${Date.now()}`,
            isUser: false,
            type: 'text',
            text: 'Cancelé esa acción.',
            time: 'Ahora',
            status: 'read',
          });
          return;
        }
        const response = await confirmAssistantAction(auth, actionId);
        if (response.message) {
          const mapped = mapAssistantMessagesToChat([response.message])[0];
          appendAssistantReply(mapped, response.cards);
        }
      })
      .catch(() => {
        setToastText('No fue posible completar la acción.');
        setTimeout(() => setToastText(null), 2500);
      })
      .finally(() => setAiSending(false));
  };

  const scrollToBottom = () => {
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = (text: string) => {
    if (editingMessage) {
      setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? { ...m, text, isEdited: true } : m)));
      setEditingMessage(null);
      setEditingText('');
      return;
    }
    if (isAI) {
      sendAssistantText(text);
      return;
    }
    const newMsg: ChatMessage = {
      id: String(Date.now()), isUser: true, type: 'text', text, time: 'Ahora', status: 'sent',
      replyTo: replyTarget ? { sender: replyTarget.isUser ? 'Tú' : replyTarget.senderName || chat.name, text: replyTarget.text || 'Mensaje' } : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyTarget(null);

    if (chat.postingIdentityId) {
      void sendTextChatMessage(chat.id, chat.postingIdentityId, text)
        .then((saved) => {
          setMessages((prev) => prev.map((message) => message.id === newMsg.id ? saved : message));
        })
        .catch(() => undefined);
    }
  };

  const beginCall = (isVideo: boolean) => {
    const identityId = chat.postingIdentityId;
    if (!identityId || isAI) return;
    void getWebAuth()
      .then(async (auth) => {
        const credentials = await startCall(auth, chat.id, {
          actor_identity_id: identityId,
          call_type: isVideo ? 'video' : 'voice',
        });
        setActiveCall({ isVideo, credentials });
      })
      .catch(() => {
        setToastText('No fue posible iniciar la llamada.');
        setTimeout(() => setToastText(null), 2500);
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
    setMenuOpen(false);
    void getWebAuth()
      .then((auth) => updateChatConversationNotifications(auth, chat.id, {
        identity_id: identityId,
        notifications_enabled: !next,
      }))
      .catch(() => setMuted(!next));
  };

  const clearConversation = () => {
    setMenuOpen(false);
    if (!confirm('¿Vaciar todos los mensajes de este chat?')) return;
    if (isAI) {
      void getWebAuth()
        .then((auth) => clearAssistantMemory(auth))
        .then(() => setMessages([]))
        .catch(() => undefined);
      return;
    }
    const identityId = chat.postingIdentityId;
    if (!identityId) return;
    void getWebAuth()
      .then((auth) => clearChatConversation(auth, chat.id, { identity_id: identityId }))
      .then(() => setMessages([]))
      .catch(() => undefined);
  };

  const handleAttachment = (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => {
    const identityId = chat.postingIdentityId;
    if (!identityId || isAI) return;
    if (type === 'location') {
      if (!navigator.geolocation) {
        setToastText('Geolocalización no soportada en este navegador.');
        setTimeout(() => setToastText(null), 2500);
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        void sendLocationChatMessage(
          chat.id,
          identityId,
          pos.coords.latitude,
          pos.coords.longitude,
        ).then((saved) => setMessages((prev) => [...prev, saved])).catch(() => undefined);
      });
      return;
    }
    if (type === 'contact') {
      setToastText('Compartir contacto desde el panel Contactos.');
      setTimeout(() => setToastText(null), 2500);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'file' ? '*/*' : 'image/*';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const identityId = chat.postingIdentityId;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !identityId) return;
    const messageType = file.type.startsWith('image/') ? 'image' : 'document';
    void sendChatAttachmentMessage(chat.id, identityId, file, messageType)
      .then((saved) => setMessages((prev) => [...prev, saved]))
      .catch(() => undefined);
  };

  const handleVoiceNote = (durationLabel: string) => {
    const identityId = chat.postingIdentityId;
    if (!identityId) return;
    void navigator.mediaDevices.getUserMedia({ audio: true })
      .then(async (stream) => {
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
          void sendChatAttachmentMessage(chat.id, identityId, file, 'audio')
            .then((saved) => {
              setMessages((prev) => [...prev, { ...saved, audioDuration: durationLabel }]);
            })
            .catch(() => undefined);
        };
        recorder.start();
        const [mins, secs] = durationLabel.split(':').map((part) => Number(part) || 0);
        const seconds = Math.max(1, mins * 60 + secs);
        window.setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, seconds * 1000);
      })
      .catch(() => {
        setToastText('Permiso de micrófono requerido.');
        setTimeout(() => setToastText(null), 2500);
      });
  };

  const handleSelectMessageAction = (action: ChatMessageAction) => {
    if (!contextMenu) return;
    const target = contextMenu.message;
    setContextMenu(null);

    switch (action) {
      case 'reply':
        setEditingMessage(null); setReplyTarget(target); break;
      case 'edit':
        setReplyTarget(null); setEditingMessage(target); setEditingText(target.text || ''); break;
      case 'forward':
        setForwardModalOpen(true); break;
      case 'pin':
        setMessages((prev) => prev.map((m) => ({ ...m, isPinned: m.id === target.id ? !target.isPinned : false }))); break;
      case 'copy':
        setToastText('Texto copiado'); setTimeout(() => setToastText(null), 2000); break;
      case 'delete':
        if (confirm('¿Eliminar este mensaje para ti?')) setMessages((prev) => prev.filter((m) => m.id !== target.id)); break;
      case 'destroy':
        if (confirm('¿Destruir este mensaje para todos? Esta acción no se puede deshacer.')) {
          setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, isDestroyed: true, text: 'Este mensaje fue destruido' } : m)));
        }
        break;
    }
  };

  return (
    <div className="bg-neutral-50 h-full min-h-0 flex flex-col relative select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-neutral-200 sticky top-0 z-20">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          <button type="button" onClick={onBack} className="p-1 rounded-lg text-neutral-700 hover:bg-neutral-100">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div onClick={() => (isAI ? onOpenAiSettings?.() : onOpenProfile())} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
            <div className="relative shrink-0">
              <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center font-bold text-sm ${isAI ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-brand-primary'}`}>
                {isAI ? <Bot className="w-5 h-5" /> : chat.name?.[0]?.toUpperCase() || 'C'}
              </div>
              {online && !isGroup && !isAI && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-neutral-900 truncate leading-tight">{chat.name}</span>
                {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
              </div>
              <p className="text-[11px] text-neutral-500 truncate font-normal leading-tight">
                {isAI ? 'Asistente de Buddy · siempre disponible' : isGroup ? `${groupMemberCount} participantes` : online ? 'En línea' : 'Últ. vez hace 1 hora'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-neutral-700 shrink-0">
          {isAI ? (
            <button type="button" onClick={onOpenAiSettings} className="p-1.5 rounded-lg text-brand-primary hover:bg-neutral-100" title="Configuración IA">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button type="button" onClick={() => beginCall(false)} className="p-1.5 rounded-lg hover:bg-neutral-100"><Phone className="w-5 h-5" /></button>
              <button type="button" onClick={() => beginCall(true)} className="p-1.5 rounded-lg hover:bg-neutral-100"><Video className="w-5 h-5" /></button>
            </>
          )}
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-neutral-100"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>

      {pinnedMessage && (
        <PinnedMessageBanner text={pinnedMessage.text || 'Mensaje fijado'} onUnpin={() => setMessages((prev) => prev.map((m) => ({ ...m, isPinned: false })))} />
      )}

      {menuOpen && (
        <div className="absolute top-14 right-3 w-44 bg-white border border-neutral-200 rounded-2xl shadow-xl z-40 py-1 text-xs text-neutral-800">
          <button type="button" onClick={() => { setMenuOpen(false); if (isAI) { onOpenAiSettings?.(); } else { onOpenProfile(); } }} className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 font-normal">
            {isAI ? 'Configuración IA' : 'Ver info'}
          </button>
          <button
            type="button"
            onClick={toggleMuteConversation}
            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2 font-normal"
          >
            <BellOff className="w-3.5 h-3.5" /> {muted ? 'Activar notificaciones' : 'Silenciar'}
          </button>
          <button type="button" onClick={clearConversation} className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2 font-normal">
            <Trash2 className="w-3.5 h-3.5" /> Vaciar chat
          </button>
        </div>
      )}

      {isSellerChat && !isAI && <AiAutoReplyBanner enabled={aiAutoReply} onChange={setAiAutoReply} />}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 pb-3 space-y-3">
        <div className="flex justify-center my-3">
          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded-md tracking-wider">HOY</span>
        </div>

        {aiLoading ? (
          <p className="text-center text-xs text-neutral-500 py-6">Cargando conversación...</p>
        ) : null}

        {!aiLoading && isAI && messages.length === 0 ? (
          <p className="text-center text-xs text-neutral-500 py-4 px-6">
            Puedo crear reuniones, anotar, buscar en la app y sugerirte proveedores.
          </p>
        ) : null}

        {messages.map((msg) => (
          <div key={msg.id} className={msg.isUser ? '' : 'pl-0'}>
            <div onContextMenu={(e) => { if (!isAI) { e.preventDefault(); setContextMenu({ message: msg, x: e.clientX, y: e.clientY }); } }}>
              <MessageBubble
                senderName={msg.senderName} senderVerified={msg.senderVerified} isUser={msg.isUser} isAI={isAI && !msg.isUser} sentByAi={msg.sentByAi} type={msg.type} text={msg.text} mediaUrl={msg.mediaUrl} fileName={msg.fileName} fileSize={msg.fileSize} audioDuration={msg.audioDuration} status={msg.status} time={msg.time} replyTo={msg.replyTo} isEdited={msg.isEdited} isDestroyed={msg.isDestroyed} isPinned={msg.isPinned}
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
              <div className="pl-4 my-2">
                <InlineProductCards onContact={(r) => onNavigateToChat?.(r.id, r.sellerName, `Hola, me interesa tu servicio de ${r.productName}`)} />
              </div>
            ) : null}
          </div>
        ))}

        {aiSending ? (
          <p className="text-xs text-neutral-500 pl-1">Escribiendo...</p>
        ) : null}
      </div>

      <ChatMessageContextMenu position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null} message={contextMenu?.message || null} onClose={() => setContextMenu(null)} onSelectAction={handleSelectMessageAction} />

      <ForwardMessageModal isOpen={forwardModalOpen} onClose={() => setForwardModalOpen(false)} onSelectChat={(cName) => { setToastText(`Mensaje reenviado a ${cName}`); setTimeout(() => setToastText(null), 2000); }} />

      {replyTarget && (
        <div className="flex items-center justify-between px-4 py-2 bg-brand-primary/5 border-t border-brand-primary/20 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-brand-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-brand-primary block text-[11px]">Respondiendo a {replyTarget.isUser ? 'Tú' : replyTarget.senderName || chat.name}</span>
              <p className="text-neutral-600 font-normal truncate">{replyTarget.text || 'Mensaje'}</p>
            </div>
          </div>
          <button type="button" onClick={() => setReplyTarget(null)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center justify-between px-4 py-2 bg-brand-primary/5 border-t border-brand-primary/20 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-4 h-4 text-brand-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-brand-primary block text-[11px]">Editando mensaje</span>
              <p className="text-neutral-600 font-normal truncate">{editingMessage.text}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setEditingMessage(null); setEditingText(''); }} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {activeCall ? (
        <CallOverlay
          contactName={chat.name}
          isVideo={activeCall.isVideo}
          isVerified={isVerified}
          agora={activeCall.credentials.agora}
          onHangUp={hangUpCall}
        />
      ) : null}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      <div className="shrink-0 mt-auto z-20 bg-white border-t border-neutral-200">
        <WriteBar
          onSendMessage={handleSendMessage}
          onSendVoiceNote={handleVoiceNote}
          onSendAttachment={handleAttachment}
          value={editingMessage ? editingText : undefined}
          onChangeText={editingMessage ? setEditingText : undefined}
          variant={isAI ? 'assistant' : 'default'}
          disabled={isAI && (aiSending || aiLoading)}
        />
      </div>

      {toastText && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
          {toastText}
        </div>
      )}
    </div>
  );
}
