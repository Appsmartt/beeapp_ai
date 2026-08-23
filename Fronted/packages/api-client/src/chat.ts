import type {
  AddChatParticipantsPayload,
  AddChatParticipantsResponse,
  AuthCredentials,
  ChatConversationsQuery,
  ChatMessagesQuery,
  CreateChatConversationResponse,
  CreateDirectConversationPayload,
  CreateGroupConversationPayload,
  GetChatConversationResponse,
  GetChatConversationsResponse,
  GetChatMessageResponse,
  GetChatMessagesResponse,
  GetChatParticipantsResponse,
  SearchChatUsersResponse,
  SendChatMessagePayload,
  SendChatMessageResponse,
  UpdateChatConversationPayload,
  UpdateChatConversationResponse,
  UpdateChatMessagePayload,
  UpdateChatMessageResponse,
} from '@beeapp/shared-types';

import { api } from './client';

function buildQuery(
  params: object,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined
      || value === null
      || value === ''
      || value === false
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (
          item !== undefined
          && item !== null
          && item !== ''
        ) {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

function conversationPath(
  conversationId: string,
): string {
  return `/chat/conversations/${encodeURIComponent(
    conversationId,
  )}/`;
}

function messagePath(
  conversationId: string,
  messageId: string,
): string {
  return (
    `${conversationPath(conversationId)}messages/`
    + `${encodeURIComponent(messageId)}/`
  );
}

export function getChatConversations(
  auth: AuthCredentials,
  query: ChatConversationsQuery = {},
): Promise<GetChatConversationsResponse> {
  return api.get<GetChatConversationsResponse>(
    `/chat/conversations/${buildQuery(query)}`,
    { auth },
  );
}

export function getChatConversation(
  auth: AuthCredentials,
  conversationId: string,
): Promise<GetChatConversationResponse> {
  return api.get<GetChatConversationResponse>(
    conversationPath(conversationId),
    { auth },
  );
}

export function createDirectChatConversation(
  auth: AuthCredentials,
  payload: CreateDirectConversationPayload,
): Promise<CreateChatConversationResponse> {
  return api.post<CreateChatConversationResponse>(
    '/chat/conversations/direct/',
    payload,
    { auth },
  );
}

export function createGroupChatConversation(
  auth: AuthCredentials,
  payload: CreateGroupConversationPayload,
): Promise<CreateChatConversationResponse> {
  return api.post<CreateChatConversationResponse>(
    '/chat/conversations/groups/',
    payload,
    { auth },
  );
}

export function updateChatConversation(
  auth: AuthCredentials,
  conversationId: string,
  payload: UpdateChatConversationPayload,
): Promise<UpdateChatConversationResponse> {
  return api.patch<UpdateChatConversationResponse>(
    conversationPath(conversationId),
    payload,
    { auth },
  );
}

export async function deleteChatConversation(
  auth: AuthCredentials,
  conversationId: string,
): Promise<void> {
  await api.delete<void>(
    conversationPath(conversationId),
    { auth },
  );
}

export function getChatMessages(
  auth: AuthCredentials,
  conversationId: string,
  query: ChatMessagesQuery = {},
): Promise<GetChatMessagesResponse> {
  return api.get<GetChatMessagesResponse>(
    `${conversationPath(conversationId)}messages/${buildQuery(
      query,
    )}`,
    { auth },
  );
}

export function getChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  messageId: string,
): Promise<GetChatMessageResponse> {
  return api.get<GetChatMessageResponse>(
    messagePath(conversationId, messageId),
    { auth },
  );
}

export function sendChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  payload: SendChatMessagePayload,
): Promise<SendChatMessageResponse> {
  return api.post<SendChatMessageResponse>(
    `${conversationPath(conversationId)}messages/`,
    payload,
    { auth },
  );
}

export function updateChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  messageId: string,
  payload: UpdateChatMessagePayload,
): Promise<UpdateChatMessageResponse> {
  return api.patch<UpdateChatMessageResponse>(
    messagePath(conversationId, messageId),
    payload,
    { auth },
  );
}

export async function deleteChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  messageId: string,
): Promise<void> {
  await api.delete<void>(
    messagePath(conversationId, messageId),
    { auth },
  );
}

export function pinChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  messageId: string,
): Promise<UpdateChatMessageResponse> {
  return api.post<UpdateChatMessageResponse>(
    `${messagePath(conversationId, messageId)}pin/`,
    {},
    { auth },
  );
}

export function unpinChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  messageId: string,
): Promise<UpdateChatMessageResponse> {
  return api.post<UpdateChatMessageResponse>(
    `${messagePath(conversationId, messageId)}unpin/`,
    {},
    { auth },
  );
}

export function getChatParticipants(
  auth: AuthCredentials,
  conversationId: string,
): Promise<GetChatParticipantsResponse> {
  return api.get<GetChatParticipantsResponse>(
    `${conversationPath(conversationId)}participants/`,
    { auth },
  );
}

export function addChatParticipants(
  auth: AuthCredentials,
  conversationId: string,
  payload: AddChatParticipantsPayload,
): Promise<AddChatParticipantsResponse> {
  return api.post<AddChatParticipantsResponse>(
    `${conversationPath(conversationId)}participants/`,
    payload,
    { auth },
  );
}

export async function removeChatParticipant(
  auth: AuthCredentials,
  conversationId: string,
  userId: string,
): Promise<void> {
  await api.delete<void>(
    (
      `${conversationPath(conversationId)}participants/`
      + `${encodeURIComponent(userId)}/`
    ),
    { auth },
  );
}

export function searchChatUsers(
  auth: AuthCredentials,
  query: string,
  limit = 20,
): Promise<SearchChatUsersResponse> {
  return api.get<SearchChatUsersResponse>(
    `/chat/users/search/${buildQuery({
      q: query,
      limit,
    })}`,
    { auth },
  );
}
