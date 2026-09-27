import type { AuthCredentials } from '@beeapp/shared-types';

import { api } from './client';

export interface ProtectedChatListResponse {
  conversation_ids: string[];
}

export interface ChatPinProtectionResponse {
  protected: boolean;
}

export function listProtectedChats(
  auth: AuthCredentials,
): Promise<ProtectedChatListResponse> {
  return api.get<ProtectedChatListResponse>(
    '/chat/pin-protections/',
    { auth },
  );
}

export function getChatPinProtection(
  auth: AuthCredentials,
  conversationId: string,
): Promise<ChatPinProtectionResponse> {
  return api.get<ChatPinProtectionResponse>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/pin-protection/`,
    { auth },
  );
}

export function protectChatWithPin(
  auth: AuthCredentials,
  conversationId: string,
): Promise<ChatPinProtectionResponse> {
  return api.post<ChatPinProtectionResponse>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/pin-protection/`,
    {},
    { auth },
  );
}

export function removeChatPinProtection(
  auth: AuthCredentials,
  conversationId: string,
  pin: string,
): Promise<ChatPinProtectionResponse> {
  return api.delete<ChatPinProtectionResponse>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/pin-protection/`,
    {
      auth,
      body: { pin },
    },
  );
}
