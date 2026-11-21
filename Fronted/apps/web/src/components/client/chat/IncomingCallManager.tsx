'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import {
  declineCall,
  getActiveConversationCall,
  getCallDetail,
  getChatIdentities,
  getChatInbox,
  getSupabase,
  joinCall,
  type AgoraCallCredentials,
  type CallDetailResponse,
} from '@beeapp/api-client';
import { getRememberedChatIdentity, getWebAuth } from '@/lib/client/liveData';
import CallOverlay from './CallOverlay';

interface IncomingCallInfo {
  callId: string;
  conversationId: string;
  callerName: string;
  isVideo: boolean;
  identityId: string;
}

export default function IncomingCallManager() {
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    callerName: string;
    isVideo: boolean;
    identityId: string;
    agora: AgoraCallCredentials;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const ringtoneTimerRef = useRef<number | null>(null);
  const dismissedCallsRef = useRef<Set<string>>(new Set());
  const identityIdRef = useRef<string>('');
  const conversationNameMapRef = useRef<Map<string, string>>(new Map());

  const playRingtonePulse = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.46);
      window.setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 600);
    } catch {
      // AudioContext blocked before user gesture
    }
  };

  useEffect(() => {
    if (!incoming) {
      if (ringtoneTimerRef.current) {
        window.clearInterval(ringtoneTimerRef.current);
        ringtoneTimerRef.current = null;
      }
      return undefined;
    }
    playRingtonePulse();
    ringtoneTimerRef.current = window.setInterval(playRingtonePulse, 2400);
    return () => {
      if (ringtoneTimerRef.current) {
        window.clearInterval(ringtoneTimerRef.current);
        ringtoneTimerRef.current = null;
      }
    };
  }, [incoming]);

  useEffect(() => {
    let mounted = true;

    const inspectCallDetail = (detail: CallDetailResponse | null, identityId: string) => {
      if (!mounted || !detail || !detail.call) return;
      const call = detail.call;
      if (dismissedCallsRef.current.has(call.id)) return;
      if (call.status !== 'ringing' && call.status !== 'active') {
        setIncoming((curr) => (curr?.callId === call.id ? null : curr));
        return;
      }
      const myParticipant =
        detail.participant
        || detail.participants?.find((p) => p.identity_id === identityId);
      if (!myParticipant || myParticipant.status !== 'invited') {
        return;
      }
      const callerName =
        conversationNameMapRef.current.get(call.conversation_id)
        || 'Llamada entrante';
      setIncoming((curr) => {
        if (curr?.callId === call.id) return curr;
        return {
          callId: call.id,
          conversationId: call.conversation_id,
          callerName,
          isVideo: call.call_type === 'video',
          identityId,
        };
      });
    };

    const resolveIdentityAndCheck = async () => {
      try {
        const auth = await getWebAuth();
        if (auth.scheme !== 'Bearer' || !auth.token) return;
        let identityId = getRememberedChatIdentity() || identityIdRef.current;
        if (!identityId) {
          const identities = await getChatIdentities(auth);
          const personal = identities.identities.find((i) => i.identity_type === 'profile') || identities.identities[0];
          identityId = personal?.id || '';
        }
        if (!identityId || !mounted) return;
        identityIdRef.current = identityId;

        const inbox = await getChatInbox(auth, identityId).catch(() => ({ conversations: [] }));
        const topConversations = (inbox.conversations || []).slice(0, 12);
        topConversations.forEach((conv) => {
          const label = conv.name || conv.other_display_name || conv.commercial?.display_name || 'Contacto';
          conversationNameMapRef.current.set(conv.id, label);
        });

        for (const conv of topConversations.slice(0, 5)) {
          if (!mounted) return;
          const active = await getActiveConversationCall(auth, conv.id, identityId).catch(() => null);
          if (active) {
            inspectCallDetail(active, identityId);
          }
        }
      } catch {
        // ignore background check error
      }
    };

    void resolveIdentityAndCheck();

    const channel = getSupabase()
      .channel('web-incoming-calls')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          const row = (payload.new || payload.old) as { id?: string; status?: string } | undefined;
          if (!row?.id) return;
          if (row.status && row.status !== 'ringing' && row.status !== 'active') {
            setIncoming((curr) => (curr?.callId === row.id ? null : curr));
            return;
          }
          const identityId = getRememberedChatIdentity() || identityIdRef.current;
          if (!identityId) return;
          void getWebAuth()
            .then((auth) => getCallDetail(auth, row.id!, identityId))
            .then((detail) => inspectCallDetail(detail, identityId))
            .catch(() => undefined);
        },
      )
      .subscribe();

    const pollInterval = window.setInterval(() => {
      if (!activeCall) {
        void resolveIdentityAndCheck();
      }
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(pollInterval);
      void getSupabase().removeChannel(channel);
    };
  }, [activeCall]);

  const handleAnswer = async () => {
    if (!incoming || busy) return;
    setBusy(true);
    try {
      const auth = await getWebAuth();
      const response = await joinCall(auth, incoming.callId, {
        actor_identity_id: incoming.identityId,
      });
      dismissedCallsRef.current.add(incoming.callId);
      setActiveCall({
        callId: incoming.callId,
        callerName: incoming.callerName,
        isVideo: incoming.isVideo,
        identityId: incoming.identityId,
        agora: response.agora,
      });
      setIncoming(null);
    } catch {
      setIncoming(null);
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!incoming || busy) return;
    const target = incoming;
    dismissedCallsRef.current.add(target.callId);
    setIncoming(null);
    try {
      const auth = await getWebAuth();
      await declineCall(auth, target.callId, {
        actor_identity_id: target.identityId,
      });
    } catch {
      // ignore
    }
  };

  return (
    <>
      {incoming && !activeCall ? (
        <div className="fixed top-5 right-5 z-[110] w-80 rounded-2xl bg-[#18122B] text-white p-4 shadow-2xl border border-white/15 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-primary/25 border border-brand-primary/40 flex items-center justify-center font-bold text-sm text-white shrink-0">
              {incoming.callerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
                {incoming.isVideo ? 'Videollamada entrante' : 'Llamada entrante'}
              </p>
              <p className="text-sm font-bold text-white truncate">{incoming.callerName}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDecline()}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Rechazar</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAnswer()}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {incoming.isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              <span>Responder</span>
            </button>
          </div>
        </div>
      ) : null}

      {activeCall ? (
        <CallOverlay
          contactName={activeCall.callerName}
          isVideo={activeCall.isVideo}
          agora={activeCall.agora}
          callId={activeCall.callId}
          actorIdentityId={activeCall.identityId}
          onHangUp={() => setActiveCall(null)}
        />
      ) : null}
    </>
  );
}
