export type IncomingCallType = 'voice' | 'video';

export interface IncomingCall {
  callId: string;
  conversationId: string;
  callType: IncomingCallType;
  callerIdentityId: string;
  callerName: string;
  receivedAt: number;
}

let incomingCall: IncomingCall | null = null;

const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

export function getIncomingCall(): IncomingCall | null {
  return incomingCall;
}

export function setIncomingCall(
  value: IncomingCall,
): void {
  incomingCall = value;
  emitChange();
}

export function clearIncomingCall(
  callId?: string,
): void {
  if (
    !callId
    || incomingCall?.callId === callId
  ) {
    incomingCall = null;
    emitChange();
  }
}

export function subscribeIncomingCall(
  listener: () => void,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
