'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  BellOff,
  Trash2,
  Bot,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import {
  ChatItem,
  ChatMessage,
  AI_CONVERSATION_MESSAGES,
  MOCK_CONVERSATION_MESSAGES,
  SELLER_CONVERSATION_MESSAGES,
  AI_CHAT_ID,
} from '@/mocks/chats';
import MessageBubble from './MessageBubble';
import WriteBar from './WriteBar';
import AiAutoReplyBanner from './AiAutoReplyBanner';
import InlineProductCards from './InlineProductCards';
import CallOverlay from './CallOverlay';
import { AiSearchResult } from '@/mocks/aiSearchResults';

interface ChatConversationProps {
  chat: ChatItem;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenAiSettings?: () => void;
  onNavigateToChat?: (chatId: string, chatName: string, initialText: string) => void;
}

export default function ChatConversation({
  chat,
  onBack,
  onOpenProfile,
  onOpenAiSettings,
  onNavigateToChat,
}: ChatConversationProps) {
  const isAI = chat.id === AI_CHAT_ID || !!chat.isAI;
  const isGroup = chat.isGroup;
  const online = chat.online;
  const isVerified = chat.verified;
  const isSellerChat = chat.isSellerChat;
  const groupMemberCount = chat.members?.length ?? 0;

  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // CORRECCIÓN 2: Menú contextual anclado a coordenadas (clientX, clientY)
  const [contextMenu, setContextMenu] = useState<{ messageId: number; x: number; y: number } | null>(null);

  // CORRECCIÓN 5: Overlay de llamada / videollamada
  const [activeCall, setActiveCall] = useState<{ isVideo: boolean } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isAI
      ? AI_CONVERSATION_MESSAGES
      : isSellerChat
      ? SELLER_CONVERSATION_MESSAGES
      : MOCK_CONVERSATION_MESSAGES
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(
      isAI
        ? AI_CONVERSATION_MESSAGES
        : isSellerChat
        ? SELLER_CONVERSATION_MESSAGES
        : MOCK_CONVERSATION_MESSAGES
    );
  }, [chat.id, isAI, isSellerChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: Date.now(),
      isUser: true,
      type: 'text',
      text,
      time: '14:35',
      status: 'sent',
    };
    setMessages((prev) => [...prev, newMsg]);

    if (isAI) {
      setTimeout(() => {
        const aiReply: ChatMessage = {
          id: Date.now() + 1,
          senderName: 'BeeAI',
          isUser: false,
          type: 'text',
          text: 'Encontré 3 opciones para ti:',
          time: '14:36',
          status: 'read',
          showCatalog: true,
        };
        setMessages((prev) => [...prev, aiReply]);
      }, 1000);
      return;
    }

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: Date.now() + 1,
        senderName: isGroup ? 'Desarrollador 🐝' : chat.name,
        isUser: false,
        type: 'text',
        text: '¡Recibido! Esto es una simulación de conversación de BeeApp AI.',
        time: '14:36',
        status: 'read',
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 1000);
  };

  const handleSendVoiceNote = (duration: string) => {
    const newMsg: ChatMessage = {
      id: Date.now(),
      isUser: true,
      type: 'audio',
      audioDuration: duration,
      time: '14:36',
      status: 'sent',
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleSendAttachment = (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => {
    let mockMsg: ChatMessage;
    const timeNow = '14:37';
    switch (type) {
      case 'photo':
      case 'camera':
        mockMsg = {
          id: Date.now(),
          isUser: true,
          type: 'image',
          mediaUrl: 'https://picsum.photos/400/300',
          text: `Foto adjunta (${type === 'camera' ? 'Cámara' : 'Galería'})`,
          time: timeNow,
          status: 'sent',
        };
        break;
      case 'file':
        mockMsg = {
          id: Date.now(),
          isUser: true,
          type: 'file',
          fileName: 'Reporte_Avances.xlsx',
          fileSize: '340 KB',
          time: timeNow,
          status: 'sent',
        };
        break;
      default:
        mockMsg = {
          id: Date.now(),
          isUser: true,
          type: 'text',
          text: `📍 Ubicación o contacto compartido (Mock de ${type})`,
          time: timeNow,
          status: 'sent',
        };
    }
    setMessages((prev) => [...prev, mockMsg]);
  };

  const handleContactSeller = (result: AiSearchResult) => {
    const initialText = `Hola, me interesa tu servicio de ${result.productName} que encontré en BeeApp.`;
    if (onNavigateToChat) {
      onNavigateToChat(result.id, result.sellerName, initialText);
    } else {
      alert(`Contactando a ${result.sellerName} por ${result.productName}`);
    }
  };

  const handleContextMenuClick = (e: React.MouseEvent, msgId: number) => {
    e.preventDefault();
    setContextMenu({ messageId: msgId, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="bg-neutral-50 min-h-full flex flex-col relative select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-neutral-200 sticky top-0 z-20">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-lg text-neutral-700 hover:bg-neutral-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div
            onClick={() => (isAI ? onOpenAiSettings?.() : onOpenProfile())}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="relative shrink-0">
              <div
                className={`w-9.5 h-9.5 rounded-full flex items-center justify-center font-bold text-sm ${
                  isAI ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-brand-primary'
                }`}
              >
                {isAI ? <Bot className="w-5 h-5" /> : chat.name?.[0]?.toUpperCase() || 'C'}
              </div>
              {online && !isGroup && !isAI && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-neutral-900 truncate leading-tight">
                  {chat.name}
                </span>
                {isVerified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-neutral-500 truncate font-normal leading-tight">
                {isAI
                  ? 'Asistente de BeeApp · siempre disponible'
                  : isGroup
                  ? `${groupMemberCount} participantes`
                  : online
                  ? 'En línea'
                  : 'Últ. vez hace 1 hora'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-neutral-700 shrink-0">
          {isAI ? (
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="p-1.5 rounded-lg text-brand-primary hover:bg-neutral-100"
              title="Configuración IA"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveCall({ isVideo: false })}
                className="p-1.5 rounded-lg hover:bg-neutral-100"
                title="Llamada de voz"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveCall({ isVideo: true })}
                className="p-1.5 rounded-lg hover:bg-neutral-100"
                title="Videollamada"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg hover:bg-neutral-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu Overlay */}
      {menuOpen && (
        <div className="absolute top-14 right-3 w-44 bg-white border border-neutral-200 rounded-2xl shadow-xl z-40 py-1 text-xs text-neutral-800">
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
            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 font-normal"
          >
            {isAI ? 'Configuración IA' : 'Ver info'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              alert('Conversación silenciada');
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2 font-normal"
          >
            <BellOff className="w-3.5 h-3.5" /> Silenciar
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setMessages([]);
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2 font-normal"
          >
            <Trash2 className="w-3.5 h-3.5" /> Vaciar chat
          </button>
        </div>
      )}

      {/* Seller AI Auto-reply Banner */}
      {isSellerChat && (
        <AiAutoReplyBanner enabled={aiAutoReply} onChange={setAiAutoReply} />
      )}

      {/* Messages Scroll Area (pb-36 padding ensures messages scroll clear above WriteBar & AppBottomBar) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-36 space-y-3">
        <div className="flex justify-center my-3">
          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded-md tracking-wider">
            HOY
          </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id}>
            <div onContextMenu={(e) => handleContextMenuClick(e, msg.id)}>
              <MessageBubble
                senderName={msg.senderName}
                senderVerified={msg.senderVerified}
                isUser={msg.isUser}
                isAI={isAI}
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
              />
            </div>

            {/* CORRECCIÓN 3: Tarjetas de productos inline dentro del chat */}
            {msg.showCatalog && (
              <div className="pl-4 my-2">
                <InlineProductCards onContact={handleContactSeller} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CORRECCIÓN 2: Menú contextual posicionado exactamente en coordenadas del clic */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`,
            }}
            className="z-50 bg-white border border-neutral-200 rounded-xl shadow-xl py-1 w-44 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => {
                alert('Respuesta simulada');
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 font-normal text-neutral-800"
            >
              Responder
            </button>
            <button
              type="button"
              onClick={() => {
                alert('Mensaje copiado');
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 font-normal text-neutral-800"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => {
                setMessages((prev) => prev.filter((m) => m.id !== contextMenu.messageId));
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-red-50 font-normal text-red-600"
            >
              Eliminar
            </button>
          </div>
        </>
      )}

      {/* CORRECCIÓN 5: Call / Video call overlay */}
      {activeCall && (
        <CallOverlay
          contactName={chat.name}
          isVideo={activeCall.isVideo}
          isVerified={isVerified}
          onHangUp={() => setActiveCall(null)}
        />
      )}

      {/* CORRECCIÓN 4: WriteBar posicionada sticky bottom-14 (56px) directamente encima de AppBottomBar */}
      <div className="sticky bottom-14 left-0 right-0 z-20 bg-white">
        <WriteBar
          onSendMessage={handleSendMessage}
          onSendVoiceNote={handleSendVoiceNote}
          onSendAttachment={handleSendAttachment}
        />
      </div>
    </div>
  );
}
