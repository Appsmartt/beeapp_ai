'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
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

export default function VoiceAssistantModal({ isOpen, onClose, onContactSeller }: VoiceAssistantModalProps) {
  const [phase, setPhase] = useState<OrbState>('idle');
  const [turnIndex, setTurnIndex] = useState(0);
  const [history, setHistory] = useState<Line[]>([]);
  const [current, setCurrent] = useState<Line | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [draft, setDraft] = useState('');
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
    setTextMode(false);
    setDraft('');
    setShowProducts(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (phase !== 'listening' && phase !== 'speaking') return;

    const turn = VOICE_CONVERSATION[turnIndex % VOICE_CONVERSATION.length];
    const speaker: Line['speaker'] = phase === 'listening' ? 'user' : 'assistant';
    const words = (speaker === 'user' ? turn.user : turn.assistant).split(' ');
    let i = 0;

    setCurrent({ speaker, text: '' });
    const id = setInterval(
      () => {
        i += 1;
        setCurrent({ speaker, text: words.slice(0, i).join(' ') });
        if (i < words.length) return;

        clearInterval(id);
        setTimeout(() => {
          setHistory((h) => [...h, { speaker, text: words.join(' ') }]);
          setCurrent(null);
          if (speaker === 'user') {
            setPhase('thinking');
          } else {
            setPhase('idle');
            setShowProducts(true);
            setTurnIndex((t) => t + 1);
          }
        }, 350);
      },
      speaker === 'user' ? USER_WORD_MS : ASSISTANT_WORD_MS
    );

    return () => clearInterval(id);
  }, [phase, turnIndex, isOpen]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    const id = setTimeout(() => {
      setPhase('speaking');
      setShowProducts(true);
    }, THINKING_MS);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    const node = transcriptRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [history, current, showProducts]);

  if (!isOpen) return null;

  const isTalking = phase === 'listening' || phase === 'speaking';

  const handleMic = () => {
    setTextMode(false);
    if (phase === 'idle') {
      setPhase('listening');
      return;
    }
    if (current?.text) setHistory((h) => [...h, current]);
    setCurrent(null);
    setPhase('idle');
  };

  const handleRestart = () => {
    setHistory([]);
    setCurrent(null);
    setTurnIndex(0);
    setTextMode(false);
    setShowProducts(false);
    setPhase('listening');
  };

  const sendDraft = () => {
    if (!draft.trim()) return;
    setHistory((h) => [...h, { speaker: 'user', text: draft.trim() }]);
    setDraft('');
    setPhase('thinking');
  };

  const handleContactCard = (result: AiSearchResult) => {
    onClose();
    if (onContactSeller) {
      onContactSeller(result);
    } else {
      alert(`Contactando a ${result.sellerName} por ${result.productName}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#1B0B3A] flex flex-col pt-9 pb-7"
      style={{ animation: 'voice-fade-in 300ms ease-out' }}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isTalking ? 'bg-semantic-success' : 'bg-[#7C6BA8]'}`}
          />
          <span className="text-[13px] font-semibold text-[#EDE9FE] tracking-[0.3px]">
            Asistente BeeAI
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-9 h-9 rounded-xl bg-[rgba(237,233,254,0.12)] hover:bg-[rgba(237,233,254,0.2)] text-[#EDE9FE] flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Orbe o campo de texto */}
      <div className="flex flex-col items-center mt-4 shrink-0 px-6">
        {textMode ? (
          <div className="w-full max-w-md flex items-center gap-2 rounded-2xl bg-[rgba(237,233,254,0.12)] px-4 h-14">
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendDraft()}
              placeholder="Escribe lo que necesitas..."
              className="flex-1 bg-transparent text-sm text-white font-normal outline-none placeholder:text-[rgba(237,233,254,0.45)]"
            />
            <button
              type="button"
              onClick={sendDraft}
              aria-label="Enviar"
              className="text-[#A78BFA] hover:text-white transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div style={{ animation: 'voice-orb-enter 300ms ease-out' }}>
            <VoiceOrb state={phase} />
          </div>
        )}

        <p className="mt-1.5 text-[13px] font-semibold text-[#C4B5FD] tracking-[0.4px]">
          {textMode ? 'Modo texto' : STATE_LABEL[phase]}
        </p>
      </div>

      {/* Conversación transcrita con tarjetas de productos inline */}
      <div ref={transcriptRef} className="flex-1 min-h-0 overflow-y-auto mt-3 px-7 pb-3">
        <div className="max-w-2xl mx-auto">
          {history.map((line, index) => (
            <Transcript key={index} line={line} />
          ))}
          {current && <Transcript line={current} live />}

          {/* Tarjetas horizontales de productos al responder */}
          {(showProducts || phase === 'speaking') && (
            <div className="mt-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xs font-semibold text-[#C4B5FD] mb-1">Encontré 3 opciones para ti:</p>
              <InlineProductCards darkTheme onContact={handleContactCard} />
            </div>
          )}
        </div>
      </div>

      <VoiceControls
        isTalking={isTalking}
        textMode={textMode}
        onRestart={handleRestart}
        onToggleMic={handleMic}
        onToggleTextMode={() => setTextMode((mode) => !mode)}
        onClose={onClose}
      />

      <p className="text-center mt-3.5 text-[11px] font-normal text-[rgba(237,233,254,0.45)]">
        Experiencia de voz simulada
      </p>
    </div>
  );
}

function Transcript({ line, live }: { line: Line; live?: boolean }) {
  return (
    <div className="mb-[18px]">
      <p
        className={`text-[10px] font-semibold uppercase tracking-[1px] mb-1 ${
          line.speaker === 'user' ? 'text-[#8B7FB8]' : 'text-[#A78BFA]'
        }`}
      >
        {line.speaker === 'user' ? 'Tú' : 'BeeAI'}
      </p>
      <p
        className={`text-[17px] leading-[25px] font-normal ${
          live ? 'text-white' : 'text-[rgba(237,233,254,0.55)]'
        }`}
      >
        {line.text}
        {live && <span className="text-[#A78BFA] font-normal"> |</span>}
      </p>
    </div>
  );
}
