'use client';

import { useState, FormEvent } from 'react';
import { ArrowLeft, Send, Bot, ShieldCheck, Settings } from 'lucide-react';
import { ChatItem, ChatMessage } from '@/mocks/chats';

interface ChatConversationProps {
  chat: ChatItem;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenAiSettings?: () => void;
}

export default function ChatConversation({
  chat,
  onBack,
  onOpenProfile,
  onOpenAiSettings,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(chat.messages || [
    { id: 'm1', sender: chat.name, text: chat.preview, timestamp: chat.timestamp, isMe: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [aiReplyActive, setAiReplyActive] = useState(true);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const myMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'Santiago',
      text: inputText,
      timestamp: 'Ahora',
      isMe: true,
    };

    setMessages((prev) => [...prev, myMsg]);
    setInputText('');

    // Mock AI response if AI chat
    if (chat.isAi) {
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'Bee',
          text: 'Entendido. Estoy procesando tu solicitud con los datos mock...',
          timestamp: 'Ahora',
          isMe: false,
          sentByAi: true,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 1000);
    }
  };

  return (
    <div className="bg-neutral-50 min-h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/80 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div onClick={onOpenProfile} className="flex items-center gap-2.5 cursor-pointer">
            <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center ${
              chat.isAi ? 'bg-brand-primary text-white' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {chat.isAi ? 'IA' : chat.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-xs text-neutral-900 leading-none">{chat.name}</span>
                {chat.verified && <ShieldCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
              </div>
              <span className="text-[10px] text-neutral-400 font-normal">En línea</span>
            </div>
          </div>
        </div>

        {chat.isAi && onOpenAiSettings && (
          <button
            onClick={onOpenAiSettings}
            className="p-1.5 text-neutral-500 hover:text-brand-primary rounded-full hover:bg-neutral-100"
            title="Configuración IA"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Seller AI Auto-reply Banner if applicable */}
      {chat.isSellerChat && (
        <div className={`px-4 py-2 flex items-center justify-between border-b text-xs transition-colors ${
          aiReplyActive ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
        }`}>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              {aiReplyActive ? 'Asistente IA respondiendo' : 'Asistente IA desactivado'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAiReplyActive(!aiReplyActive)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              aiReplyActive ? 'bg-brand-primary' : 'bg-neutral-300'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${aiReplyActive ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto pb-20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed space-y-1 shadow-xs ${
                msg.isMe
                  ? 'bg-brand-primary text-white rounded-br-xs'
                  : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs'
              }`}
            >
              {msg.sentByAi && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-white/20 text-brand-primary px-1.5 py-0.2 rounded mb-1">
                  <Bot className="w-2.5 h-2.5" /> IA
                </span>
              )}
              <p className="font-normal">{msg.text}</p>
              <div className={`text-[9px] font-normal text-right ${msg.isMe ? 'text-white/70' : 'text-neutral-400'}`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Write Bar */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-neutral-200/80 flex items-center gap-2 sticky bottom-0 z-10">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 h-10 px-4 bg-neutral-100 border border-neutral-200/60 rounded-full text-xs text-neutral-900 outline-none focus:border-brand-primary font-normal"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
