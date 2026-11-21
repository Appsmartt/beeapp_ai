'use client';

import { getSupabase } from '@beeapp/api-client';

export type RealtimeMessageRow = {
  id: string;
  sender_id?: string | null;
  sender_identity_id?: string | null;
  body: string | null;
  content?: string | null;
  kind?: string | null;
  message_type?: string | null;
  status?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export function subscribeConversationMessages(
  conversationId: string,
  onMessage: (row: RealtimeMessageRow, eventType: 'INSERT' | 'UPDATE') => void,
): () => void {
  const channel = getSupabase()
    .channel(`web-messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as RealtimeMessageRow;
        if (row?.id) onMessage(row, 'INSERT');
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as RealtimeMessageRow;
        if (row?.id) onMessage(row, 'UPDATE');
      },
    )
    .subscribe();

  return () => {
    void getSupabase().removeChannel(channel);
  };
}
