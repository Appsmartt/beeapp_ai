'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, X } from 'lucide-react';
import {
  cancelAssistantAction,
  confirmAssistantAction,
  listAssistantMessages,
  sendAssistantMessage,
  speakAssistantText,
  transcribeAssistantAudio,
} from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/liveData';
import VoiceOrb from './VoiceOrb';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const auth = await getWebAuth();
      const response = await listAssistantMessages(auth);
      const last = response.messages?.[response.messages.length - 1];
      if (last?.role === 'assistant') {
        setReply(last.content || '');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isOpen) void loadHistory();
  }, [isOpen, loadHistory]);

  const playTts = async (text: string) => {
    const auth = await getWebAuth();
    const spoken = await speakAssistantText(auth, text);
    const binary = atob(spoken.audio_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: spoken.audio_mime || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setOrbState('speaking');
    await audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setOrbState('idle');
    };
  };

  const handleAssistantResponse = async (message: string, speak: boolean) => {
    const auth = await getWebAuth();
    setOrbState('thinking');
    const response = await sendAssistantMessage(auth, message, speak);
    const assistantText = response.message?.content || '';
    setReply(assistantText);
    const actionCard = response.cards?.find((card) => card.action_id);
    setPendingActionId(actionCard?.action_id ?? null);
    if (speak && assistantText) {
      await playTts(assistantText);
    } else {
      setOrbState('idle');
    }
  };

  const startListening = async () => {
    setError('');
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void (async () => {
          try {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = String(reader.result || '');
                resolve(result.includes(',') ? result.split(',')[1] : result);
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
            const auth = await getWebAuth();
            setOrbState('thinking');
            const { text } = await transcribeAssistantAudio(auth, base64, blob.type);
            setTranscript(text);
            await handleAssistantResponse(text, true);
          } catch (listenError) {
            setError(listenError instanceof Error ? listenError.message : 'No fue posible procesar el audio.');
            setOrbState('idle');
          }
        })();
      };
      recorderRef.current = recorder;
      recorder.start();
      setOrbState('listening');
    } catch {
      setError('Necesitamos permiso de micrófono para el asistente de voz.');
    }
  };

  const stopListening = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/20" onClick={onClose} role="presentation">
      <div
        className="fixed inset-y-0 left-0 flex w-[35vw] min-w-[360px] max-w-[620px] flex-col bg-[#1B0B3A] pt-9 pb-7 shadow-[12px_0_35px_rgba(15,5,35,0.45)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Asistente Buddy AI"
      >
        <div className="flex shrink-0 items-center justify-between px-5">
          <span className="text-[13px] font-semibold tracking-[0.3px] text-[#EDE9FE]">Asistente Buddy AI</span>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(237,233,254,0.12)] text-[#EDE9FE]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center px-8 text-center flex-1 overflow-y-auto">
          <VoiceOrb state={orbState === 'listening' ? 'listening' : orbState === 'speaking' ? 'speaking' : orbState === 'thinking' ? 'thinking' : 'idle'} />
          {transcript ? (
            <p className="mt-4 text-sm text-[#DDD6FE] max-w-sm">Tú: {transcript}</p>
          ) : null}
          {reply ? (
            <p className="mt-3 text-sm leading-6 text-white max-w-sm">{reply}</p>
          ) : (
            <p className="mt-6 text-sm text-[#C4B5FD]">Mantén el micrófono para hablar con tu asistente.</p>
          )}
          {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
          {pendingActionId ? (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                onClick={() => void getWebAuth().then((auth) => confirmAssistantAction(auth, pendingActionId).then(() => setPendingActionId(null)))}
              >
                Confirmar acción
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-neutral-700 text-white text-xs font-semibold"
                onClick={() => void getWebAuth().then((auth) => cancelAssistantAction(auth, pendingActionId).then(() => setPendingActionId(null)))}
              >
                Cancelar
              </button>
            </div>
          ) : null}
        </div>

        <div className="px-8 pb-2 flex justify-center">
          {orbState === 'listening' ? (
            <button type="button" onClick={stopListening} className="h-14 w-14 rounded-full bg-red-500 text-white flex items-center justify-center">
              <Square className="w-5 h-5" />
            </button>
          ) : orbState === 'thinking' ? (
            <Loader2 className="w-8 h-8 text-[#C4B5FD] animate-spin" />
          ) : (
            <button type="button" onClick={() => void startListening()} className="h-14 w-14 rounded-full bg-brand-primary text-white flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
