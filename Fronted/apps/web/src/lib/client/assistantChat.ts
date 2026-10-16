import type { AssistantCard, AssistantMessage } from '@beeapp/shared-types';

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
