'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, VideoOff, CheckCircle2 } from 'lucide-react';

interface CallOverlayProps {
  contactName: string;
  isVideo?: boolean;
  isVerified?: boolean;
  onHangUp: () => void;
}

export default function CallOverlay({
  contactName,
  isVideo = false,
  isVerified = false,
  onHangUp,
}: CallOverlayProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(isVideo);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#11101E]/95 backdrop-blur-md flex flex-col justify-between p-8 text-white select-none animate-in fade-in duration-200">
      {/* Top Status */}
      <div className="text-center pt-6 space-y-1">
        <p className="text-xs font-semibold text-brand-primary tracking-wide uppercase">
          {seconds === 0 ? 'Conectando...' : `En llamada • ${formatTimer(seconds)}`}
        </p>
        <p className="text-xs font-normal text-neutral-400">BeeApp Voice & Video</p>
      </div>

      {/* Main Avatar & Caller View */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-6">
        {isVideo ? (
          <div className="w-full max-w-lg h-72 rounded-3xl bg-[#1E1D2D] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {isVideoOff ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-brand-primary text-white font-extrabold text-3xl flex items-center justify-center border-4 border-white/20">
                  {contactName[0]?.toUpperCase() || 'C'}
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-lg text-white">{contactName}</h3>
                  {isVerified && <CheckCircle2 className="w-4 h-4 text-brand-primary" />}
                </div>
                <p className="text-xs text-neutral-400 font-normal">Cámara desactivada</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-brand-primary/20 border-2 border-brand-primary text-white font-extrabold text-3xl flex items-center justify-center animate-pulse">
                  {contactName[0]?.toUpperCase() || 'C'}
                </div>
                <p className="text-xs font-semibold text-white bg-black/40 px-3 py-1 rounded-full">
                  Cámara activa (MOCK) • {contactName}
                </p>
              </div>
            )}

            {/* PiP preview */}
            <div className="absolute top-4 right-4 w-20 h-28 rounded-xl bg-neutral-900 border-2 border-white/20 flex items-center justify-center text-[10px] font-semibold text-white/80 shadow-lg">
              Tú
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-25 h-25 w-[100px] h-[100px] rounded-full bg-white text-brand-primary border-4 border-[#DDD6FE] font-extrabold text-4xl flex items-center justify-center shadow-2xl">
              {contactName[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-xl text-white">{contactName}</h2>
              {isVerified && <CheckCircle2 className="w-5 h-5 text-brand-primary" />}
            </div>
            <p className="text-sm font-normal text-neutral-400">
              {seconds === 0 ? 'Llamando...' : 'En llamada'}
            </p>
          </div>
        )}
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-center gap-5 pb-8">
        {/* Mute Button */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${
            isMuted
              ? 'bg-white text-neutral-900 border-white'
              : 'bg-white/15 border-white/20 text-white hover:bg-white/25'
          }`}
          title={isMuted ? 'Desactivar silencio' : 'Silenciar'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          type="button"
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${
            isVideoOff
              ? 'bg-white text-neutral-900 border-white'
              : 'bg-white/15 border-white/20 text-white hover:bg-white/25'
          }`}
          title={isVideoOff ? 'Activar cámara' : 'Apagar cámara'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Speaker Toggle */}
        <button
          type="button"
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${
            isSpeakerOn
              ? 'bg-white text-neutral-900 border-white'
              : 'bg-white/15 border-white/20 text-white hover:bg-white/25'
          }`}
          title="Altavoz"
        >
          {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Hang Up Button */}
        <button
          type="button"
          onClick={onHangUp}
          className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-xl"
          title="Colgar"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
