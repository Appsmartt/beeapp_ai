'use client';

import { getSupabase } from '@beeapp/api-client';

type MessageRow = {
  id: string;
  sender_id: string;
  body: string | null;
  kind: string;
  created_at: string;
};

export function subscribeConversationMessages(
  conversationId: string,
  onMessage: (row: MessageRow) => void,
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
        const row = payload.new as MessageRow;
        if (row?.id) onMessage(row);
      },
    )
    .subscribe();

  return () => {
    void getSupabase().removeChannel(channel);
  };
}
