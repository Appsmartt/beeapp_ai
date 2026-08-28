import type {
  AuthCredentials,
} from '@beeapp/shared-types';

import {
  api,
} from './client';

export type CallType =
  | 'voice'
  | 'video';

export type CallStatus =
  | 'ringing'
  | 'active'
  | 'ended'
  | 'cancelled'
  | 'missed'
  | 'declined'
  | 'busy';

export type CallParticipantStatus =
  | 'invited'
  | 'joined'
  | 'declined'
  | 'missed'
  | 'left'
  | 'kicked';

export interface AgoraCallCredentials {
  app_id: string;
  channel_name: string;
  uid: number;
  token: string;
  expires_at: number | string;
}

export interface CallSession {
  id: string;
  conversation_id: string;
  call_type: CallType;
  status: CallStatus;
  agora_channel_name: string;
  conversation_type: 'direct' | 'group';
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface CallParticipant {
  id?: string;
  call_id?: string;
  identity_id: string;
  agora_uid: number;
  status: CallParticipantStatus;
  invited_at?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
}

export interface CallCredentialsResponse {
  call: CallSession;
  participant: CallParticipant;
  participants: CallParticipant[];
  can_end_call: boolean;
  can_kick_participants: boolean;
  agora: AgoraCallCredentials;
}

export interface CallParticipantResponse {
  participant: CallParticipant;
}

export interface CallDetailResponse {
  call: CallSession;
  participant?: CallParticipant | null;
  participants: CallParticipant[];
  can_end_call: boolean;
  can_kick_participants: boolean;
}

export interface CallHistoryResponse {
  calls: CallDetailResponse[];
  limit?: number;
  next_before_created_at?: string | null;
}

export interface StartCallPayload {
  actor_identity_id: string;
  call_type: CallType;
}

export interface CallActorPayload {
  actor_identity_id: string;
}

function requireBearerAuth(
  auth: AuthCredentials,
): AuthCredentials {
  if (
    auth.scheme !== 'Bearer'
    || !auth.token?.trim()
  ) {
    throw new Error(
      'Las llamadas requieren una sesión iniciada con correo y contraseña. '
      + 'Cierra sesión e ingresa nuevamente con correo.',
    );
  }

  return auth;
}

function callPath(
  callId: string,
): string {
  const normalizedCallId = String(callId || '').trim();

  if (!normalizedCallId) {
    throw new Error(
      'No fue posible identificar la llamada.',
    );
  }

  return `/calls/${encodeURIComponent(normalizedCallId)}/`;
}

function conversationCallsPath(
  conversationId: string,
): string {
  const normalizedConversationId = String(
    conversationId || '',
  ).trim();

  if (!normalizedConversationId) {
    throw new Error(
      'No fue posible identificar la conversación.',
    );
  }

  return (
    `/calls/conversations/${encodeURIComponent(
      normalizedConversationId,
    )}/`
  );
}

function encodeQuery(
  params: Record<string, string | number | undefined | null>,
): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined
      || value === null
      || value === ''
    ) {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();

  return serialized
    ? `?${serialized}`
    : '';
}

export function startCall(
  auth: AuthCredentials,
  conversationId: string,
  payload: StartCallPayload,
): Promise<CallCredentialsResponse> {
  return api.post<CallCredentialsResponse>(
    `${conversationCallsPath(conversationId)}start/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function joinCall(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload,
): Promise<CallCredentialsResponse> {
  return api.post<CallCredentialsResponse>(
    `${callPath(callId)}join/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function confirmCallJoined(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload,
): Promise<CallParticipantResponse> {
  return api.post<CallParticipantResponse>(
    `${callPath(callId)}confirm-joined/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function refreshCallToken(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload,
): Promise<CallCredentialsResponse> {
  return api.post<CallCredentialsResponse>(
    `${callPath(callId)}refresh-token/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function cancelCallJoinAttempt(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload & {
    failure_reason?: string;
  },
): Promise<CallDetailResponse> {
  return api.post<CallDetailResponse>(
    `${callPath(callId)}cancel-join-attempt/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function declineCall(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload,
): Promise<CallDetailResponse> {
  return api.post<CallDetailResponse>(
    `${callPath(callId)}decline/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function leaveCall(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload,
): Promise<CallDetailResponse> {
  return api.post<CallDetailResponse>(
    `${callPath(callId)}leave/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function endCall(
  auth: AuthCredentials,
  callId: string,
  payload: CallActorPayload,
): Promise<CallDetailResponse> {
  return api.post<CallDetailResponse>(
    `${callPath(callId)}end/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function getCallDetail(
  auth: AuthCredentials,
  callId: string,
  actorIdentityId: string,
): Promise<CallDetailResponse> {
  return api.get<CallDetailResponse>(
    `${callPath(callId)}${encodeQuery({
      actor_identity_id: actorIdentityId,
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function getActiveConversationCall(
  auth: AuthCredentials,
  conversationId: string,
  actorIdentityId: string,
): Promise<CallDetailResponse | null> {
  return api.get<CallDetailResponse | null>(
    `${conversationCallsPath(conversationId)}active/${encodeQuery({
      actor_identity_id: actorIdentityId,
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function getConversationCallHistory(
  auth: AuthCredentials,
  conversationId: string,
  actorIdentityId: string,
  limit = 50,
): Promise<CallHistoryResponse> {
  return api.get<CallHistoryResponse>(
    `${conversationCallsPath(conversationId)}history/${encodeQuery({
      actor_identity_id: actorIdentityId,
      limit,
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );
}
