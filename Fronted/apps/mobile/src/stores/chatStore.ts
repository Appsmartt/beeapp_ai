import type {
  ChatConversation,
  ChatMessage,
} from '@beeapp/shared-types';

let conversations: ChatConversation[] = [];

let messagesByConversationId: Record<
  string,
  ChatMessage[]
> = {};

let protectedConversationIds: string[] = [];

export function getChatConversations(): ChatConversation[] {
  return conversations;
}

export function setChatConversations(
  nextConversations: ChatConversation[],
): void {
  conversations = nextConversations;
}

export function upsertChatConversation(
  conversation: ChatConversation,
): void {
  const exists = conversations.some(
    (item) => item.id === conversation.id,
  );

  conversations = exists
    ? conversations.map((item) => (
        item.id === conversation.id
          ? conversation
          : item
      ))
    : [conversation, ...conversations];
}

export function removeChatConversation(
  conversationId: string,
): void {
  conversations = conversations.filter(
    (item) => item.id !== conversationId,
  );

  delete messagesByConversationId[conversationId];

  protectedConversationIds = protectedConversationIds.filter(
    (id) => id !== conversationId,
  );
}

export function getChatMessages(
  conversationId: string,
): ChatMessage[] {
  return messagesByConversationId[conversationId] || [];
}

export function setChatMessages(
  conversationId: string,
  messages: ChatMessage[],
): void {
  messagesByConversationId = {
    ...messagesByConversationId,
    [conversationId]: messages,
  };
}

export function upsertChatMessage(
  conversationId: string,
  message: ChatMessage,
): void {
  const currentMessages = getChatMessages(conversationId);

  const exists = currentMessages.some(
    (item) => item.id === message.id,
  );

  const nextMessages = exists
    ? currentMessages.map((item) => (
        item.id === message.id
          ? message
          : item
      ))
    : [...currentMessages, message];

  setChatMessages(conversationId, nextMessages);
}

export function removeChatMessage(
  conversationId: string,
  messageId: string,
): void {
  setChatMessages(
    conversationId,
    getChatMessages(conversationId).filter(
      (item) => item.id !== messageId,
    ),
  );
}

export function getProtectedConversationIds(): string[] {
  return protectedConversationIds;
}

export function isChatConversationProtected(
  conversationId: string,
): boolean {
  return protectedConversationIds.includes(conversationId);
}

export function setChatConversationProtected(
  conversationId: string,
  value: boolean,
): void {
  if (value) {
    if (!protectedConversationIds.includes(conversationId)) {
      protectedConversationIds = [
        ...protectedConversationIds,
        conversationId,
      ];
    }

    return;
  }

  protectedConversationIds = protectedConversationIds.filter(
    (id) => id !== conversationId,
  );
}
