import type { AuthCredentials } from '@beeapp/shared-types';
import { api } from './client';

export interface ChatCategoryRecord {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface ChatCategoryAssignment {
  conversation_id: string;
  category_id: string;
}

export function listChatCategories(
  auth: AuthCredentials,
  identityId: string,
): Promise<{ categories: ChatCategoryRecord[] }> {
  return api.get(
    `/chat/categories/?identity_id=${encodeURIComponent(identityId)}`,
    { auth },
  );
}

export function createChatCategory(
  auth: AuthCredentials,
  payload: {
    identity_id: string;
    name: string;
    icon: string;
    color: string;
  },
): Promise<{ category: ChatCategoryRecord }> {
  return api.post('/chat/categories/', payload, { auth });
}

export async function deleteChatCategory(
  auth: AuthCredentials,
  identityId: string,
  categoryId: string,
): Promise<void> {
  await api.delete(
    `/chat/categories/${encodeURIComponent(categoryId)}/?identity_id=${encodeURIComponent(identityId)}`,
    { auth },
  );
}

export function listChatCategoryAssignments(
  auth: AuthCredentials,
  identityId: string,
  conversationIds: string[],
): Promise<{ assignments: ChatCategoryAssignment[] }> {
  const params = new URLSearchParams();
  params.set('identity_id', identityId);
  conversationIds.slice(0, 100).forEach((id) => params.append('conversation_id', id));
  return api.get(`/chat/categories/assignments/?${params.toString()}`, { auth });
}

export function saveChatConversationCategories(
  auth: AuthCredentials,
  identityId: string,
  conversationId: string,
  categoryIds: string[],
): Promise<{ category_ids: string[] }> {
  return api.put(
    `/chat/conversations/${encodeURIComponent(conversationId)}/categories/`,
    { identity_id: identityId, category_ids: categoryIds },
    { auth },
  );
}
