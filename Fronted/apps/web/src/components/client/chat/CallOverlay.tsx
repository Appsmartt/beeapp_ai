'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, VideoOff, CheckCircle2 } from 'lucide-react';
import type { AgoraCallCredentials } from '@beeapp/api-client';
import { joinAgoraCall, leaveAgoraCall, type AgoraCallSession } from '@/lib/client/agoraSession';

interface CallOverlayProps {
  contactName: string;
  isVideo?: boolean;
  isVerified?: boolean;
  agora: AgoraCallCredentials | null;
  onHangUp: () => void;
}

export default function CallOverlay({
  contactName,
  isVideo = false,
  isVerified = false,
  agora,
  onHangUp,
}: CallOverlayProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(isVideo);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [connectError, setConnectError] = useState('');
  const [connected, setConnected] = useState(false);

  const sessionRef = useRef<AgoraCallSession | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!agora) return;
    let active = true;
    void joinAgoraCall(agora, isVideo, {
      localVideo: localVideoRef.current,
      remoteVideo: remoteVideoRef.current,
    })
      .then((session) => {
        if (!active) {
          void leaveAgoraCall(session);
          return;
        }
        sessionRef.current = session;
        setConnected(true);
      })
      .catch((error: unknown) => {
        setConnectError(error instanceof Error ? error.message : 'No fue posible conectar la llamada.');
      });

    return () => {
      active = false;
      void leaveAgoraCall(sessionRef.current);
      sessionRef.current = null;
    };
  }, [agora, isVideo]);

  useEffect(() => {
    if (!connected) return;
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connected]);

  useEffect(() => {
    const track = sessionRef.current?.localAudioTrack;
    if (!track) return;
    void track.setEnabled(!isMuted);
  }, [isMuted]);

  useEffect(() => {
    const track = sessionRef.current?.localVideoTrack;
    if (!track) return;
    void track.setEnabled(!isVideoOff);
  }, [isVideoOff]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleHangUp = () => {
    void leaveAgoraCall(sessionRef.current);
    sessionRef.current = null;
    onHangUp();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#11101E]/95 backdrop-blur-md flex flex-col justify-between p-8 text-white select-none animate-in fade-in duration-200">
      <div className="text-center pt-6 space-y-1">
        <p className="text-xs font-semibold text-brand-primary tracking-wide uppercase">
          {connectError
            ? 'Error de conexión'
            : !connected
              ? 'Conectando...'
              : seconds === 0
                ? 'En llamada'
                : `En llamada • ${formatTimer(seconds)}`}
        </p>
        <p className="text-xs font-normal text-neutral-400">Buddy Voice & Video</p>
        {connectError ? (
          <p className="text-[11px] text-red-300 max-w-sm mx-auto">{connectError}</p>
        ) : null}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-6">
        {isVideo ? (
          <div className="w-full max-w-lg h-72 rounded-3xl bg-[#1E1D2D] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            <div ref={remoteVideoRef} className="absolute inset-0" />
            {isVideoOff ? (
              <div className="relative z-10 flex flex-col items-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-brand-primary text-white font-extrabold text-3xl flex items-center justify-center border-4 border-white/20">
                  {contactName[0]?.toUpperCase() || 'C'}
                </div>
                <p className="text-xs text-neutral-400 font-normal">Cámara desactivada</p>
              </div>
            ) : null}
            <div
              ref={localVideoRef}
              className="absolute top-4 right-4 w-20 h-28 rounded-xl bg-neutral-900 border-2 border-white/20 overflow-hidden shadow-lg z-10"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-[100px] h-[100px] rounded-full bg-white text-brand-primary border-4 border-[#DDD6FE] font-extrabold text-4xl flex items-center justify-center shadow-2xl">
              {contactName[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-xl text-white">{contactName}</h2>
              {isVerified && <CheckCircle2 className="w-5 h-5 text-brand-primary" />}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-5 pb-8">
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

        {isVideo ? (
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
        ) : null}

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

        <button
          type="button"
          onClick={handleHangUp}
          className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-xl"
          title="Colgar"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
