import { getSupabase } from './supabase';

export async function setNetworkVisibility(
  visibility: 'public' | 'private' | 'contacts',
): Promise<void> {
  const { error } = await getSupabase().rpc('set_network_visibility', {
    p_visibility: visibility,
  });
  if (error) throw new Error(error.message);
}

export async function subscribeToPlan(
  planId: string,
  billingPeriod: 'monthly' | 'yearly' = 'monthly',
): Promise<unknown> {
  const { data, error } = await getSupabase().rpc('subscribe_to_plan', {
    p_plan_id: planId,
    p_billing_period: billingPeriod,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelSubscription(): Promise<unknown> {
  const { data, error } = await getSupabase().rpc('cancel_subscription');
  if (error) throw new Error(error.message);
  return data;
}

export async function reactivateSubscription(): Promise<unknown> {
  const { data, error } = await getSupabase().rpc('reactivate_subscription');
  if (error) throw new Error(error.message);
  return data;
}

export async function setConversationDisappearing(
  conversationId: string,
  ttlSeconds: number | null,
): Promise<void> {
  const { error } = await getSupabase().rpc('set_conversation_disappearing', {
    p_conversation_id: conversationId,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) throw new Error(error.message);
}

export async function toggleMessageReaction(
  messageId: string,
  reactionType: 'like' | 'love' | 'laugh',
): Promise<{ active: boolean }> {
  const { data, error } = await getSupabase().rpc('toggle_message_reaction', {
    p_message_id: messageId,
    p_reaction_type: reactionType,
  });
  if (error) throw new Error(error.message);
  return (data ?? { active: false }) as { active: boolean };
}

export async function setContactFlags(
  contactId: string,
  flags: { isBlocked?: boolean; isMuted?: boolean },
): Promise<void> {
  const { error } = await getSupabase().rpc('set_contact_flags', {
    p_contact_id: contactId,
    p_is_blocked: flags.isBlocked ?? null,
    p_is_muted: flags.isMuted ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function leaveCommunity(conversationId: string): Promise<void> {
  const { error } = await getSupabase().rpc('leave_community', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

export async function updateCommunityDetails(
  conversationId: string,
  input: { name?: string; description?: string; category?: string },
): Promise<void> {
  const { error } = await getSupabase().rpc('update_community_details', {
    p_conversation_id: conversationId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_category: input.category ?? null,
  });
  if (error) throw new Error(error.message);
}
