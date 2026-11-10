import type { AssistantCard, AssistantMessage } from '@beeapp/shared-types';

import { readBusinessCart } from './businessCart';
import type { ChatMessage } from './chats';

function clock(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function mapAssistantMessagesToChat(messages: AssistantMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    isUser: message.role === 'user',
    type: 'text',
    text: message.content,
    time: clock(message.created_at),
    status: 'read',
    assistantCards: message.cards?.length ? message.cards : undefined,
  }));
}

export function providerDisplayName(item: Record<string, unknown>): string {
  return String(item.business_name || item.title || 'Proveedor');
}

export function buildChooseProviderMessage(item: Record<string, unknown>): string {
  const name = providerDisplayName(item);
  const title = String(item.title || name);
  return `Elige el proveedor ${item.business_id} (${name}). Envía esta solicitud: Hola, me interesa ${title}.`;
}

export function cardsFromAssistantResponse(cards: AssistantCard[] | undefined): AssistantCard[] {
  return Array.isArray(cards) ? cards : [];
}

export type AssistantDecision = 'confirmed' | 'cancelled';

export function assistantDecision(card: AssistantCard): AssistantDecision | undefined {
  const stored = String(card.resolved_status || '');
  if (stored === 'confirmed' || stored === 'cancelled') return stored;
  return undefined;
}

const ARCHIVE_EVENT = 'buddy-assistant-archive';
const ARCHIVE_KEY = 'beeapp.web.assistant-archives.v1';

export function assistantSendContext(): { cart: Record<string, unknown> | null } {
  const cart = readBusinessCart();
  if (!cart) return { cart: null };
  return {
    cart: {
      version: 1,
      commercialProfileId: cart.profileId,
      commercialProfileName: cart.profileName,
      profileId: cart.profileId,
      profileName: cart.profileName,
      lines: cart.lines.map((line) => ({
        id: line.offerId,
        commercialOfferId: line.offerId,
        commercialProfileId: cart.profileId,
        offerId: line.offerId,
        offerKind: line.kind,
        kind: line.kind,
        title: line.title,
        quantity: line.quantity,
        unitPriceAmount: line.unitPrice,
        unitPrice: line.unitPrice,
        currencyCode: 'COP',
        requiresBooking: line.requiresBooking,
      })),
    },
  };
}

export function plainAssistantSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function isAssistantPlanBlock(message: string): boolean {
  return /Límite:|Necesitas el plan/.test(message);
}

export function archivedChatsFromCards(
  cards: AssistantCard[] | undefined,
): Array<{ id: string; archived: boolean }> {
  if (!Array.isArray(cards)) return [];
  return cards.flatMap((card) => {
    if (card.type !== 'client_effect' || card.effect !== 'archive_chat' || !card.conversation_id) {
      return [];
    }
    return [{
      id: String(card.conversation_id),
      archived: card.archived !== false,
    }];
  });
}

function readPendingArchives(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(ARCHIVE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, boolean> : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function publishAssistantArchive(id: string, archived: boolean): void {
  if (typeof window === 'undefined' || !id) return;
  const current = readPendingArchives();
  current[id] = archived;
  window.sessionStorage.setItem(ARCHIVE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent(ARCHIVE_EVENT, { detail: { id, archived } }));
}

export function consumeAssistantArchives(): Array<{ id: string; archived: boolean }> {
  const current = readPendingArchives();
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(ARCHIVE_KEY);
  return Object.entries(current).map(([id, archived]) => ({ id, archived }));
}

export const ASSISTANT_ARCHIVE_EVENT = ARCHIVE_EVENT;

export function applyAssistantClientEffects(
  cards: AssistantCard[] | undefined,
  onArchive?: (conversationId: string, archived: boolean) => void,
): void {
  for (const item of archivedChatsFromCards(cards)) {
    publishAssistantArchive(item.id, item.archived);
    onArchive?.(item.id, item.archived);
  }
}

export function playAssistantAudio(
  audioBase64: string,
  mime = 'audio/mpeg',
): Promise<HTMLAudioElement> {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  return audio.play().then(() => audio);
}

export function stampResolvedCards(
  cards: AssistantCard[] | undefined,
  actionId: string,
  decision: AssistantDecision,
): AssistantCard[] | undefined {
  if (!cards?.length || !actionId) return cards;
  let changed = false;
  const next = cards.map((card) => {
    if (card.type !== 'confirm' || String(card.action_id || '') !== actionId) return card;
    changed = true;
    return { ...card, resolved_status: decision };
  });
  return changed ? next : cards;
}
