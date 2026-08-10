'use client';

import { useState } from 'react';
import { Check, CheckCheck, FileText, Play, Pause, Bot, CheckCircle2, Pin } from 'lucide-react';

interface MessageBubbleProps {
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  isAI?: boolean;
  sentByAi?: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status?: 'sent' | 'delivered' | 'read';
  time: string;
  replyTo?: {
    sender: string;
    text: string;
  };
  isEdited?: boolean;
  isDestroyed?: boolean;
  isPinned?: boolean;
  onLongPress?: () => void;
}

export default function MessageBubble({
  senderName,
  senderVerified,
  isUser,
  isAI,
  sentByAi,
  type,
  text,
  mediaUrl,
  fileName,
  fileSize,
  audioDuration,
  status = 'read',
  time,
  replyTo,
  isEdited,
  isDestroyed,
  isPinned,
  onLongPress,
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className={`w-full mb-2.5 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      {/* Sender Name for group chats */}
      {senderName && !isUser && (
        <div className="flex items-center gap-1 mb-0.5 ml-3">
          <span className="text-[11px] font-normal text-neutral-500">{senderName}</span>
          {senderVerified && <CheckCircle2 className="w-3 h-3 text-brand-primary" />}
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-[18px] px-3.5 pt-2.5 pb-1.5 shadow-xs relative transition-all ${
          isUser
            ? 'bg-brand-primary text-white rounded-br-[2px]'
            : isAI
            ? 'bg-brand-primary/10 border border-brand-primary/20 text-neutral-900 rounded-bl-[2px]'
            : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-[2px]'
        }`}
      >
        {/* Sent by AI Badge */}
        {sentByAi && (
          <div className="inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-md mb-1.5 text-white">
            <Bot className="w-2.5 h-2.5" />
            <span className="text-[9px] font-normal tracking-wide">IA</span>
          </div>
        )}

        {/* Reply Header */}
        {replyTo && (
          <div
            className={`flex items-stretch rounded-lg p-2 mb-2 border-l-3 ${
              isUser
                ? 'bg-[#5219C4] border-white/70 text-white'
                : 'bg-neutral-100 border-brand-primary text-neutral-800'
            }`}
          >
            <div className="flex-1 min-w-0 pl-1">
              <p
                className={`text-[11px] font-semibold ${
                  isUser ? 'text-white' : 'text-brand-primary'
                }`}
              >
                {replyTo.sender}
              </p>
              <p
                className={`text-xs truncate ${
                  isUser ? 'text-white/80' : 'text-neutral-600'
                }`}
              >
                {replyTo.text}
              </p>
            </div>
          </div>
        )}

        {/* Message Content according to type or destroyed status */}
        {isDestroyed ? (
          <p className={`text-xs italic font-normal my-0.5 ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
            Este mensaje fue destruido
          </p>
        ) : (
          <>
            {type === 'text' && (
              <p className="text-sm leading-5 font-normal whitespace-pre-wrap break-words">{text}</p>
            )}

            {type === 'image' && (
              <div className="w-[200px] sm:w-[240px]">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Media"
                    className="w-full h-36 object-cover rounded-xl mb-1.5"
                  />
                ) : (
                  <div className="w-full h-36 rounded-xl bg-neutral-100 flex items-center justify-center text-xs text-neutral-500 mb-1.5 border border-neutral-200">
                    Imagen cargada (MOCK)
                  </div>
                )}
                {text && <p className="text-xs leading-4 mt-1 font-normal">{text}</p>}
              </div>
            )}

            {type === 'file' && (
              <div className="flex items-center gap-3 w-[200px] sm:w-[220px] py-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{fileName || 'documento.pdf'}</p>
                  <p
                    className={`text-[11px] ${
                      isUser ? 'text-white/80' : 'text-neutral-500'
                    }`}
                  >
                    {fileSize || '0 KB'}
                  </p>
                </div>
              </div>
            )}

            {type === 'audio' && (
              <div className="flex items-center gap-2.5 w-[210px] sm:w-[230px] py-1">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-white text-brand-primary'
                      : 'bg-neutral-100 border border-neutral-200 text-neutral-800'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>

                {/* Waveform Mock */}
                <div className="flex-1 flex items-center gap-1 h-5">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-xs transition-colors ${
                        isUser
                          ? isPlaying
                            ? 'bg-white'
                            : 'bg-white/50'
                          : isPlaying
                          ? 'bg-brand-primary'
                          : 'bg-neutral-300'
                      }`}
                      style={{ height: `${20 + ((i * 17) % 80)}%` }}
                    />
                  ))}
                </div>

                <span
                  className={`text-[11px] font-normal shrink-0 ${
                    isUser ? 'text-white/80' : 'text-neutral-500'
                  }`}
                >
                  {audioDuration || '0:00'}
                </span>
              </div>
            )}
          </>
        )}

        {/* Timestamp and status check row */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px]">
          {isPinned && <Pin className={`w-2.5 h-2.5 shrink-0 ${isUser ? 'text-white/70' : 'text-neutral-500'}`} />}
          {isEdited && (
            <span className={`italic text-[10px] ${isUser ? 'text-white/70' : 'text-neutral-500'}`}>
              (editado)
            </span>
          )}
          <span className={isUser ? 'text-white/70' : 'text-neutral-500'}>{time}</span>
          {isUser && (
            <div className="shrink-0 text-white/90">
              {status === 'sent' && <Check className="w-3 h-3 text-white/70" />}
              {status === 'delivered' && <CheckCheck className="w-3 h-3 text-white/70" />}
              {status === 'read' && <CheckCheck className="w-3 h-3 text-white" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
