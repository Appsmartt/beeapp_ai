type PendingPinRequest = {
  userId: string;
  conversationId: string;
  expiresAt: number;
};

const REQUEST_LIFETIME_MS = 30000;
const GRANT_LIFETIME_MS = 15000;

let pendingRequest: PendingPinRequest | null = null;
let openingGrant: PendingPinRequest | null = null;

export function requestChatPinAfterReturn(
  userId: string,
  conversationId: string,
): void {
  if (!userId || !conversationId) return;
  pendingRequest = {
    userId,
    conversationId,
    expiresAt: Date.now() + REQUEST_LIFETIME_MS,
  };
}

export function consumeChatPinAfterReturn(
  userId: string,
  availableConversationIds: string[],
): string | null {
  const request = pendingRequest;
  if (!request) return null;
  if (request.expiresAt <= Date.now() || request.userId !== userId) {
    pendingRequest = null;
    return null;
  }
  if (!availableConversationIds.includes(request.conversationId)) return null;
  pendingRequest = null;
  return request.conversationId;
}

export function grantVerifiedChatOpening(
  userId: string,
  conversationId: string,
): void {
  if (!userId || !conversationId) return;
  openingGrant = {
    userId,
    conversationId,
    expiresAt: Date.now() + GRANT_LIFETIME_MS,
  };
}

export function consumeVerifiedChatOpening(
  userId: string,
  conversationId: string,
): boolean {
  const grant = openingGrant;
  openingGrant = null;
  return Boolean(
    grant
    && grant.userId === userId
    && grant.conversationId === conversationId
    && grant.expiresAt > Date.now(),
  );
}
