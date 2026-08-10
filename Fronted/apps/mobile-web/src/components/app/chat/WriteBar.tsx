'use client';

import { useState, useEffect, useRef } from 'react';
import { Paperclip, Mic, Send, Image as ImageIcon, Camera, FileText, MapPin, User, X } from 'lucide-react';

interface WriteBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (duration: string) => void;
  onSendAttachment: (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => void;
  value?: string;
  onChangeText?: (text: string) => void;
}

export default function WriteBar({
  onSendMessage,
  onSendVoiceNote,
  onSendAttachment,
  value,
  onChangeText,
}: WriteBarProps) {
  const [internalText, setInternalText] = useState('');
  const text = value !== undefined ? value : internalText;
  const setText = onChangeText || setInternalText;
  const [attachOpen, setAttachOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);

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

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleStartRecord = () => {
    setIsRecording(true);
    setAttachOpen(false);
  };

  const handleCancelRecord = () => {
    setIsRecording(false);
  };

  const handleStopRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      const minutes = Math.floor(recordTime / 60);
      const seconds = recordTime % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      onSendVoiceNote(recordTime > 0 ? formattedDuration : '0:03');
    }
  };

  const handleAttachItemClick = (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => {
    onSendAttachment(type);
    setAttachOpen(false);
  };

  return (
    <div className="w-full bg-white border-t border-neutral-200 sticky bottom-0 z-20">
      {/* Attachment popup menu */}
      {attachOpen && (
        <div className="flex items-center justify-around py-3 px-4 bg-neutral-50 border-b border-neutral-200 animate-slide-up">
          <button
            type="button"
            onClick={() => handleAttachItemClick('file')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200/80 text-neutral-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-neutral-700 font-normal">Documento</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('photo')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200/80 text-neutral-700 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-neutral-700 font-normal">Foto</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('camera')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200/80 text-neutral-700 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-neutral-700 font-normal">Cámara</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('location')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200/80 text-neutral-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-neutral-700 font-normal">Ubicación</span>
          </button>

          <button
            type="button"
            onClick={() => handleAttachItemClick('contact')}
            className="flex flex-col items-center gap-1.5 hover:opacity-80"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200/80 text-neutral-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-neutral-700 font-normal">Contacto</span>
          </button>
        </div>
      )}

      {/* Main write bar */}
      <div className="p-3">
        {isRecording ? (
          /* Recording state UI */
          <div className="flex items-center justify-between h-10 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs text-neutral-800 font-normal">
                Grabando... {Math.floor(recordTime / 60)}:
                {(recordTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelRecord}
                className="text-xs text-red-600 font-medium px-2 py-1 hover:underline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStopRecord}
                className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal input state UI */
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAttachOpen(!attachOpen)}
              title="Adjuntar"
              className={`w-9.5 h-9.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                attachOpen ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {attachOpen ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => handleAttachItemClick('camera')}
              title="Cámara"
              className="w-9.5 h-9.5 rounded-full text-neutral-500 hover:bg-neutral-100 flex items-center justify-center shrink-0"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => handleAttachItemClick('location')}
              title="Ubicación"
              className="w-9.5 h-9.5 rounded-full text-neutral-500 hover:bg-neutral-100 flex items-center justify-center shrink-0"
            >
              <MapPin className="w-5 h-5" />
            </button>

            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 h-10 px-4 bg-neutral-100 border border-neutral-200/80 rounded-full text-xs font-normal text-neutral-900 outline-none focus:ring-2 focus:ring-brand-primary"
            />

            {text.trim() ? (
              <button
                type="submit"
                className="w-9.5 h-9.5 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 hover:bg-brand-dark transition-colors"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecord}
                title="Nota de voz"
                className="w-9.5 h-9.5 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0 hover:bg-neutral-200 transition-colors"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
