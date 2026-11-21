'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  Film,
  Image as ImageIcon,
  MapPin,
  Mic,
  Paperclip,
  Send,
  User,
  X,
} from 'lucide-react';

export type ChatAttachmentActionType =
  | 'photo'
  | 'video'
  | 'camera'
  | 'file'
  | 'location'
  | 'contact';

interface WriteBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (duration: string, audioFile?: File) => void;
  onSendAttachment: (type: ChatAttachmentActionType) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  /** Solo texto (chat del asistente IA). */
  variant?: 'default' | 'assistant';
  disabled?: boolean;
  disabledReason?: string;
  dictating?: boolean;
  onDictate?: () => void;
}

export default function WriteBar({
  onSendMessage,
  onSendVoiceNote,
  onSendAttachment,
  value,
  onChangeText,
  variant = 'default',
  disabled = false,
  disabledReason,
  dictating = false,
  onDictate,
}: WriteBarProps) {
  const isAssistant = variant === 'assistant';
  const [internalText, setInternalText] = useState('');
  const text = value !== undefined ? value : internalText;
  const setText = onChangeText || setInternalText;
  const [attachOpen, setAttachOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const cleanupRecordingStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  useEffect(() => {
    if (isRecording) {
      recordInterval.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
        recordInterval.current = null;
      }
      setRecordTime(0);
    }

    return () => {
      if (recordInterval.current) clearInterval(recordInterval.current);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      cleanupRecordingStream();
    };
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || !text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleStartRecord = async () => {
    if (disabled) return;
    setAttachOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      cleanupRecordingStream();
      setIsRecording(false);
    }
  };

  const handleCancelRecord = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupRecordingStream();
    setIsRecording(false);
  };

  const handleStopRecord = () => {
    if (!isRecording) return;
    const elapsed = Math.max(1, recordTime);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const recorder = mediaRecorderRef.current;
    setIsRecording(false);

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('mp4') || mimeType.includes('aac') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
        cleanupRecordingStream();
        onSendVoiceNote(formattedDuration, file);
      };
      recorder.stop();
    } else {
      cleanupRecordingStream();
      onSendVoiceNote(formattedDuration);
    }
  };

  const handleAttachItemClick = (type: ChatAttachmentActionType) => {
    onSendAttachment(type);
    setAttachOpen(false);
  };

  if (disabledReason && !isAssistant) {
    return (
      <div className="w-full border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-center text-xs font-medium text-neutral-500">
        {disabledReason}
      </div>
    );
  }

  return (
    <div className="z-20 w-full bg-white">
      {attachOpen ? (
        <div className="flex items-center justify-around border-b border-neutral-200 bg-neutral-50 px-4 py-3 animate-slide-up">
          <button
            type="button"
            onClick={() => handleAttachItemClick('file')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-normal text-neutral-700">Documento</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('photo')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
              <ImageIcon className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-normal text-neutral-700">Foto</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('video')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
              <Film className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-normal text-neutral-700">Video</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('camera')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
              <Camera className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-normal text-neutral-700">Cámara</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('location')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-normal text-neutral-700">Ubicación</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('contact')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
              <User className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-normal text-neutral-700">Contacto</span>
          </button>
        </div>
      ) : null}

      <div className="p-3">
        {isRecording ? (
          <div className="flex h-10 items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
              <span className="text-xs font-normal text-neutral-800">
                Grabando... {Math.floor(recordTime / 60)}:
                {(recordTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelRecord}
                className="px-2 py-1 text-xs font-medium text-red-600 hover:underline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStopRecord}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {!isAssistant ? (
              <>
                <button
                  type="button"
                  onClick={() => setAttachOpen(!attachOpen)}
                  title="Adjuntar"
                  className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full transition-colors ${
                    attachOpen ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  {attachOpen ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleAttachItemClick('camera')}
                  title="Cámara"
                  className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                >
                  <Camera className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleAttachItemClick('location')}
                  title="Ubicación"
                  className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                >
                  <MapPin className="h-5 w-5" />
                </button>
              </>
            ) : null}

            {isAssistant && onDictate ? (
              <button
                type="button"
                onClick={onDictate}
                disabled={disabled && !dictating}
                title={dictating ? 'Detener dictado' : 'Dictar'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  dictating ? 'bg-red-500 text-white' : 'bg-neutral-100 text-brand-primary hover:bg-neutral-200'
                } disabled:opacity-40`}
              >
                <Mic className="h-4 w-4" />
              </button>
            ) : null}

            <input
              type="text"
              placeholder={
                dictating
                  ? 'Escuchando...'
                  : isAssistant
                    ? 'Pídele algo al asistente...'
                    : 'Escribe un mensaje...'
              }
              value={text}
              disabled={disabled || dictating}
              onChange={(e) => setText(e.target.value)}
              className="h-10 flex-1 rounded-full border border-neutral-200/80 bg-neutral-100 px-4 text-xs font-normal text-neutral-900 outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60"
            />

            {text.trim() || isAssistant ? (
              <button
                type="submit"
                disabled={disabled || !text.trim()}
                className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleStartRecord()}
                title="Nota de voz"
                className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
