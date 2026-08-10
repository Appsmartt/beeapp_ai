'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Phone, Video, MoreVertical, BellOff, Trash2, Bot, SlidersHorizontal, CheckCircle2, Reply, Pencil, X } from 'lucide-react';
import { ChatItem, ChatMessage, AI_CONVERSATION_MESSAGES, MOCK_CONVERSATION_MESSAGES, SELLER_CONVERSATION_MESSAGES, AI_CHAT_ID } from '@/mocks/chats';
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
  const isAI = chat.id === AI_CHAT_ID || !!chat.isAI;
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
  const [activeCall, setActiveCall] = useState<{ isVideo: boolean } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isAI ? AI_CONVERSATION_MESSAGES : isSellerChat ? SELLER_CONVERSATION_MESSAGES : MOCK_CONVERSATION_MESSAGES
  );

  const pinnedMessage = messages.find((m) => m.isPinned);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(isAI ? AI_CONVERSATION_MESSAGES : isSellerChat ? SELLER_CONVERSATION_MESSAGES : MOCK_CONVERSATION_MESSAGES);
  }, [chat.id, isAI, isSellerChat]);

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

    const newMsg: ChatMessage = {
      id: Date.now(), isUser: true, type: 'text', text, time: '14:35', status: 'sent',
      replyTo: replyTarget ? { sender: replyTarget.isUser ? 'Tú' : replyTarget.senderName || chat.name, text: replyTarget.text || 'Mensaje' } : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyTarget(null);

    if (isAI) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: Date.now() + 1, senderName: 'BeeAI', isUser: false, type: 'text', text: 'Encontré 3 opciones para ti:', time: '14:36', status: 'read', showCatalog: true }]);
      }, 1000);
      return;
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, senderName: isGroup ? 'Desarrollador 🐝' : chat.name, isUser: false, type: 'text', text: '¡Recibido! Esto es una simulación.', time: '14:36', status: 'read' }]);
    }, 1000);
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
    <div className="bg-neutral-50 min-h-full flex flex-col relative select-none">
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
                {isAI ? 'Asistente de BeeApp · siempre disponible' : isGroup ? `${groupMemberCount} participantes` : online ? 'En línea' : 'Últ. vez hace 1 hora'}
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
              <button type="button" onClick={() => setActiveCall({ isVideo: false })} className="p-1.5 rounded-lg hover:bg-neutral-100"><Phone className="w-5 h-5" /></button>
              <button type="button" onClick={() => setActiveCall({ isVideo: true })} className="p-1.5 rounded-lg hover:bg-neutral-100"><Video className="w-5 h-5" /></button>
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
          <button type="button" onClick={() => { setMenuOpen(false); alert('Conversación silenciada'); }} className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 flex items-center gap-2 font-normal">
            <BellOff className="w-3.5 h-3.5" /> Silenciar
          </button>
          <button type="button" onClick={() => { setMenuOpen(false); setMessages([]); }} className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2 font-normal">
            <Trash2 className="w-3.5 h-3.5" /> Vaciar chat
          </button>
        </div>
      )}

      {isSellerChat && <AiAutoReplyBanner enabled={aiAutoReply} onChange={setAiAutoReply} />}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-36 space-y-3">
        <div className="flex justify-center my-3">
          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded-md tracking-wider">HOY</span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id}>
            <div onContextMenu={(e) => { e.preventDefault(); setContextMenu({ message: msg, x: e.clientX, y: e.clientY }); }}>
              <MessageBubble
                senderName={msg.senderName} senderVerified={msg.senderVerified} isUser={msg.isUser} isAI={isAI} sentByAi={msg.sentByAi} type={msg.type} text={msg.text} mediaUrl={msg.mediaUrl} fileName={msg.fileName} fileSize={msg.fileSize} audioDuration={msg.audioDuration} status={msg.status} time={msg.time} replyTo={msg.replyTo} isEdited={msg.isEdited} isDestroyed={msg.isDestroyed} isPinned={msg.isPinned}
              />
            </div>
            {msg.showCatalog && (
              <div className="pl-4 my-2">
                <InlineProductCards onContact={(r) => onNavigateToChat?.(r.id, r.sellerName, `Hola, me interesa tu servicio de ${r.productName}`)} />
              </div>
            )}
          </div>
        ))}
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

      {activeCall && <CallOverlay contactName={chat.name} isVideo={activeCall.isVideo} isVerified={isVerified} onHangUp={() => setActiveCall(null)} />}

      <div className="sticky bottom-14 left-0 right-0 z-20 bg-white">
        <WriteBar
          onSendMessage={handleSendMessage}
          onSendVoiceNote={(dur) => setMessages((prev) => [...prev, { id: Date.now(), isUser: true, type: 'audio', audioDuration: dur, time: '14:36', status: 'sent' }])}
          onSendAttachment={(type) => setMessages((prev) => [...prev, { id: Date.now(), isUser: true, type: type === 'file' ? 'file' : 'text', text: `${type} adjunto`, time: '14:37', status: 'sent' }])}
          value={editingMessage ? editingText : undefined}
          onChangeText={editingMessage ? setEditingText : undefined}
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
