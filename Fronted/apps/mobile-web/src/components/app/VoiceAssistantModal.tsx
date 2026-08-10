'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { VOICE_CONVERSATION } from '@/mocks/voiceAssistant';
import VoiceOrb, { OrbState } from './VoiceOrb';
import VoiceControls from './VoiceControls';
import InlineProductCards from './chat/InlineProductCards';
import { AiSearchResult } from '@/mocks/aiSearchResults';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactSeller?: (result: AiSearchResult) => void;
}

interface Line {
  speaker: 'user' | 'assistant';
  text: string;
}

const USER_WORD_MS = 130;
const ASSISTANT_WORD_MS = 90;
const THINKING_MS = 900;

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'Toca el micrófono para hablar',
  listening: 'Escuchando...',
  thinking: 'Pensando...',
  speaking: 'Respondiendo',
};

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  onContactSeller,
}: VoiceAssistantModalProps) {
  const [phase, setPhase] = useState<OrbState>('idle');
  const [turnIndex, setTurnIndex] = useState(0);
  const [history, setHistory] = useState<Line[]>([]);
  const [current, setCurrent] = useState<Line | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      setShowProducts(false);
      return;
    }

    setPhase('listening');
    setTurnIndex(0);
    setHistory([]);
    setCurrent(null);
    setShowProducts(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (phase !== 'listening' && phase !== 'speaking') return;

    const turn = VOICE_CONVERSATION[turnIndex % VOICE_CONVERSATION.length];
    const speaker: Line['speaker'] =
      phase === 'listening' ? 'user' : 'assistant';

    const words = (
      speaker === 'user' ? turn.user : turn.assistant
    ).split(' ');

    let wordIndex = 0;

    setCurrent({ speaker, text: '' });

    const intervalId = setInterval(
      () => {
        wordIndex += 1;

        setCurrent({
          speaker,
          text: words.slice(0, wordIndex).join(' '),
        });

        if (wordIndex < words.length) return;

        clearInterval(intervalId);

        setTimeout(() => {
          setHistory((previous) => [
            ...previous,
            { speaker, text: words.join(' ') },
          ]);

          setCurrent(null);

          if (speaker === 'user') {
            setPhase('thinking');
          } else {
            setPhase('idle');
            setShowProducts(true);
            setTurnIndex((index) => index + 1);
          }
        }, 350);
      },
      speaker === 'user' ? USER_WORD_MS : ASSISTANT_WORD_MS,
    );

    return () => clearInterval(intervalId);
  }, [phase, turnIndex, isOpen]);

  useEffect(() => {
    if (phase !== 'thinking') return;

    const timeoutId = setTimeout(() => {
      setPhase('speaking');
      setShowProducts(true);
    }, THINKING_MS);

    return () => clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    const transcriptNode = transcriptRef.current;

    if (transcriptNode) {
      transcriptNode.scrollTop = transcriptNode.scrollHeight;
    }
  }, [history, current, showProducts]);

  if (!isOpen) return null;

  const isTalking = phase === 'listening' || phase === 'speaking';

  const handleMic = () => {
    if (phase === 'idle') {
      setPhase('listening');
      return;
    }

    if (current?.text) {
      setHistory((previous) => [...previous, current]);
    }

    setCurrent(null);
    setPhase('idle');
  };

  const handleRestart = () => {
    setHistory([]);
    setCurrent(null);
    setTurnIndex(0);
    setShowProducts(false);
    setPhase('listening');
  };

  const handleContactCard = (result: AiSearchResult) => {
    onClose();

    if (onContactSeller) {
      onContactSeller(result);
      return;
    }

    alert(`Solicitando a ${result.sellerName} por ${result.productName}`);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/20"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fixed inset-y-0 left-0 flex w-[35vw] min-w-[360px] max-w-[620px] flex-col bg-[#1B0B3A] pt-9 pb-7 shadow-[12px_0_35px_rgba(15,5,35,0.45)]"
        style={{ animation: 'voice-fade-in 300ms ease-out' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Asistente BeeAI"
      >
        {/* Barra superior */}
        <div className="flex shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isTalking ? 'bg-semantic-success' : 'bg-[#7C6BA8]'
              }`}
            />

            <span className="text-[13px] font-semibold tracking-[0.3px] text-[#EDE9FE]">
              Asistente BeeAI
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar asistente de voz"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(237,233,254,0.12)] text-[#EDE9FE] transition-colors hover:bg-[rgba(237,233,254,0.2)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Orbe de voz */}
        <div className="mt-4 flex shrink-0 flex-col items-center px-6">
          <div style={{ animation: 'voice-orb-enter 300ms ease-out' }}>
            <VoiceOrb state={phase} />
          </div>

          <p className="mt-1.5 text-[13px] font-semibold tracking-[0.4px] text-[#C4B5FD]">
            {STATE_LABEL[phase]}
          </p>
        </div>

        {/* Conversación transcrita */}
        <div
          ref={transcriptRef}
          className="mt-3 min-h-0 flex-1 overflow-y-auto px-7 pb-3"
        >
          <div className="mx-auto max-w-2xl">
            {history.map((line, index) => (
              <Transcript key={index} line={line} />
            ))}

            {current && <Transcript line={current} live />}

            {(showProducts || phase === 'speaking') && (
              <div className="mt-3 animate-in fade-in slide-in-from-bottom-4 transition-all duration-300">
                <p className="mb-1 text-xs font-semibold text-[#C4B5FD]">
                  Encontré 3 opciones para ti:
                </p>

                <InlineProductCards
                  darkTheme
                  onContact={handleContactCard}
                />
              </div>
            )}
          </div>
        </div>

        {/* Controles inferiores */}
        <VoiceControls
          isTalking={isTalking}
          onRestart={handleRestart}
          onToggleMic={handleMic}
          onClose={onClose}
        />

        <p className="mt-3.5 text-center text-[11px] font-normal text-[rgba(237,233,254,0.45)]">
          Experiencia de voz simulada
        </p>
      </div>
    </div>
  );
}

function Transcript({ line, live }: { line: Line; live?: boolean }) {
  return (
    <div className="mb-[18px]">
      <p
        className={`mb-1 text-[10px] font-semibold uppercase tracking-[1px] ${
          line.speaker === 'user'
            ? 'text-[#8B7FB8]'
            : 'text-[#A78BFA]'
        }`}
      >
        {line.speaker === 'user' ? 'Tú' : 'BeeAI'}
      </p>

      <p
        className={`text-[17px] font-normal leading-[25px] ${
          live
            ? 'text-white'
            : 'text-[rgba(237,233,254,0.55)]'
        }`}
      >
        {line.text}
        {live && (
          <span className="font-normal text-[#A78BFA]"> |</span>
        )}
      </p>
    </div>
  );
}