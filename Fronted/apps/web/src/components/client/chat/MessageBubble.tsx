'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Pause,
  Phone,
  Pin,
  Play,
  Sparkles,
  UserRound,
  Video,
} from 'lucide-react';
import type { ChatMessage } from '@/lib/client/chats';
import ChatFormattedText, { ChatInlineText } from './ChatFormattedText';

interface MessageBubbleProps {
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  isAI?: boolean;
  sentByAi?: boolean;
  type: ChatMessage['type'];
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status?: 'sent' | 'delivered' | 'read';
  time: string;
  replyTo?: ChatMessage['replyTo'];
  location?: ChatMessage['location'];
  contactCard?: ChatMessage['contactCard'];
  statusReply?: ChatMessage['statusReply'];
  callNotice?: ChatMessage['callNotice'];
  reactions?: ChatMessage['reactions'];
  isEdited?: boolean;
  isDestroyed?: boolean;
  isPinned?: boolean;
  onOpenMedia?: () => void;
  onLongPress?: () => void;
  onClickReply?: (replyMessageId: string) => void;
  onToggleReaction?: (emoji: string) => void;
}

function formatCallDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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
  location,
  contactCard,
  statusReply,
  callNotice,
  reactions,
  isEdited,
  isDestroyed,
  isPinned,
  onOpenMedia,
  onLongPress,
  onClickReply,
  onToggleReaction,
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [computedDuration, setComputedDuration] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleToggleAudio = () => {
    if (!mediaUrl) return;
    if (!audioRef.current) {
      const audio = new Audio(mediaUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const total = Math.round(audio.duration);
          const mins = Math.floor(total / 60);
          const secs = total % 60;
          setComputedDuration(`${mins}:${String(secs).padStart(2, '0')}`);
        }
      };
      audioRef.current = audio;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className={`mb-2.5 flex w-full flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      {senderName && !isUser ? (
        <div className="mb-0.5 ml-3 flex items-center gap-1">
          <span className="text-[11px] font-normal text-neutral-500">{senderName}</span>
          {senderVerified ? <CheckCircle2 className="h-3 w-3 text-brand-primary" /> : null}
        </div>
      ) : null}

      <div
        className={`relative max-w-[80%] rounded-[18px] px-3.5 pb-1.5 pt-2.5 shadow-sm transition-all sm:max-w-[70%] ${
          isUser
            ? 'rounded-br-[2px] bg-brand-primary text-white'
            : isAI
              ? 'rounded-bl-[2px] border border-brand-primary/20 bg-brand-primary/10 text-neutral-900'
              : 'rounded-bl-[2px] border border-neutral-200 bg-white text-neutral-900'
        }`}
      >
        {isUser && sentByAi ? (
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 text-white">
            <Bot className="h-2.5 w-2.5" />
            <span className="text-[10px] font-medium tracking-wide">Respondido con IA</span>
          </div>
        ) : null}

        {replyTo ? (
          <div
            onClick={() => {
              if (replyTo.id && onClickReply) {
                onClickReply(replyTo.id);
              }
            }}
            className={`mb-2 flex items-stretch rounded-lg border-l-[3px] p-2 ${
              replyTo.id && onClickReply ? 'cursor-pointer hover:opacity-90' : ''
            } ${
              isUser
                ? 'border-white/70 bg-[#5219C4] text-white'
                : 'border-brand-primary bg-neutral-100 text-neutral-800'
            }`}
          >
            <div className="min-w-0 flex-1 pl-1">
              <p className={`text-[11px] font-semibold ${isUser ? 'text-white' : 'text-brand-primary'}`}>
                {replyTo.sender}
              </p>
              <p className={`truncate text-xs ${isUser ? 'text-white/80' : 'text-neutral-600'}`}>
                <ChatInlineText text={replyTo.text} inverted={isUser} />
              </p>
            </div>
          </div>
        ) : null}

        {isDestroyed ? (
          <p className={`my-0.5 text-xs font-normal italic ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
            Este mensaje fue destruido
          </p>
        ) : (
          <>
            {type === 'text' ? (
              <ChatFormattedText
                text={text || ''}
                inverted={isUser}
                className="text-sm font-normal leading-5"
              />
            ) : null}

            {type === 'image' ? (
              <div className="w-[200px] sm:w-[240px]">
                {mediaUrl ? (
                  <button type="button" onClick={onOpenMedia} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl}
                      alt="Media"
                      className="mb-1.5 h-36 w-full rounded-xl object-cover"
                    />
                  </button>
                ) : (
                  <div className="mb-1.5 flex h-36 w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-xs text-neutral-500">
                    Imagen adjunta
                  </div>
                )}
                {text ? (
                  <ChatFormattedText
                    text={text}
                    inverted={isUser}
                    className="mt-1 text-xs font-normal leading-4"
                  />
                ) : null}
              </div>
            ) : null}

            {type === 'video' ? (
              <div className="w-[220px] sm:w-[260px]">
                {mediaUrl ? (
                  <video
                    src={mediaUrl}
                    controls
                    preload="metadata"
                    className="mb-1.5 max-h-52 w-full rounded-xl bg-black"
                  />
                ) : (
                  <div className="mb-1.5 flex h-36 w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-xs text-neutral-500">
                    Video adjunto
                  </div>
                )}
                {text ? (
                  <ChatFormattedText
                    text={text}
                    inverted={isUser}
                    className="mt-1 text-xs font-normal leading-4"
                  />
                ) : null}
              </div>
            ) : null}

            {type === 'file' ? (
              <a
                href={mediaUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                download={fileName || true}
                onClick={(e) => {
                  if (!mediaUrl) e.preventDefault();
                }}
                className="flex w-[210px] items-center gap-3 py-1 hover:opacity-90 sm:w-[235px]"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isUser ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{fileName || 'documento'}</p>
                  <p className={`text-[11px] ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                    {fileSize || 'Abrir o descargar'}
                  </p>
                </div>
                {mediaUrl ? (
                  <Download className={`h-4 w-4 shrink-0 ${isUser ? 'text-white/85' : 'text-brand-primary'}`} />
                ) : null}
              </a>
            ) : null}

            {type === 'audio' ? (
              <div className="flex w-[210px] items-center gap-2.5 py-1 sm:w-[230px]">
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  disabled={!mediaUrl}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-50 ${
                    isUser
                      ? 'bg-white text-brand-primary'
                      : 'border border-neutral-200 bg-neutral-100 text-neutral-800'
                  }`}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </button>

                <div className="flex h-5 flex-1 items-center gap-1">
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

                <span className={`shrink-0 text-[11px] font-normal ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                  {computedDuration || audioDuration || '0:00'}
                </span>
              </div>
            ) : null}

            {type === 'location' && location ? (
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-[220px] items-center gap-2.5 rounded-xl p-2 transition hover:opacity-90 sm:w-[240px] ${
                  isUser ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-900'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isUser ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{location.label || 'Ubicación compartida'}</p>
                  <p className={`truncate text-[11px] ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-75" />
              </a>
            ) : null}

            {type === 'contact' && contactCard ? (
              <div
                className={`flex w-[220px] items-center gap-2.5 rounded-xl p-2 sm:w-[240px] ${
                  isUser ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-900'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isUser ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{contactCard.name}</p>
                  {contactCard.phone ? (
                    <p className={`truncate text-[11px] ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                      {contactCard.phone}
                    </p>
                  ) : null}
                  {contactCard.email ? (
                    <p className={`truncate text-[11px] ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                      {contactCard.email}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {type === 'status_reply' ? (
              <div className="space-y-1.5">
                <div
                  className={`flex items-center gap-2 rounded-lg p-2 text-xs ${
                    isUser ? 'bg-white/15 text-white' : 'bg-brand-primary/10 text-brand-primary'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-semibold">
                    {statusReply?.previewText || 'Respondió a un estado'}
                  </span>
                </div>
                {text ? (
                  <ChatFormattedText
                    text={text}
                    inverted={isUser}
                    className="text-sm font-normal leading-5"
                  />
                ) : null}
              </div>
            ) : null}

            {type === 'call_notice' && callNotice ? (
              <div className="flex items-center gap-2.5 py-1">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isUser ? 'bg-white/20 text-white' : 'bg-brand-primary/10 text-brand-primary'
                  }`}
                >
                  {callNotice.callType === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold">
                    {callNotice.callType === 'video' ? 'Videollamada' : 'Llamada de voz'}
                  </p>
                  <p className={`text-[11px] ${isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                    {callNotice.durationSeconds
                      ? `Finalizada · ${formatCallDuration(callNotice.durationSeconds)}`
                      : text || callNotice.status}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="mt-1 flex items-center justify-end gap-1 text-[10px]">
          {isPinned ? <Pin className={`h-2.5 w-2.5 shrink-0 ${isUser ? 'text-white/70' : 'text-neutral-500'}`} /> : null}
          {isEdited ? (
            <span className={`text-[10px] italic ${isUser ? 'text-white/70' : 'text-neutral-500'}`}>
              (editado)
            </span>
          ) : null}
          <span className={isUser ? 'text-white/70' : 'text-neutral-500'}>{time}</span>
          {isUser ? (
            <div className="shrink-0 text-white/90">
              {status === 'sent' ? <Check className="h-3 w-3 text-white/70" /> : null}
              {status === 'delivered' ? <CheckCheck className="h-3 w-3 text-white/70" /> : null}
              {status === 'read' ? <CheckCheck className="h-3 w-3 text-white" /> : null}
            </div>
          ) : null}
        </div>
      </div>

      {reactions && reactions.length > 0 ? (
        <div className={`mt-1 flex flex-wrap gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() => onToggleReaction?.(reaction.emoji)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                reaction.mine
                  ? 'border-brand-primary/40 bg-brand-primary/10 font-semibold text-brand-primary'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span>{reaction.emoji}</span>
              {reaction.count > 1 ? <span>{reaction.count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
