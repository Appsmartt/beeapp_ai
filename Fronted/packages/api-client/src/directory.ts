import { getSupabase } from './supabase';

export type ContactRecord = {
  id: string;
  owner_id: string;
  linked_user_id: string | null;
  display_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type CommunityRecord = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
};

export type CommunityMemberRecord = {
  community_id: string;
  user_id: string;
  member_role: string;
  created_at: string;
};

export type CommunityPostRecord = {
  id: string;
  community_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type NetworkProfile = {
  id: string;
  display_name: string;
  occupation: string;
};

export type CallLogRecord = {
  id: string;
  display_name: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  call_type: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

async function currentUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error || !data.user) {
    throw new Error(error?.message || 'Inicia sesión para continuar.');
  }

  return data.user.id;
}

export async function listMyContacts(): Promise<ContactRecord[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabase()
    .from('contacts')
    .select('id, owner_id, linked_user_id, display_name, phone, email, notes, created_at')
    .eq('owner_id', userId)
    .eq('kind', 'contact')
    .order('display_name');

  if (error) throw new Error(error.message);
  return (data || []) as ContactRecord[];
}

export async function deleteMyContact(contactId: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabase()
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('owner_id', userId);

  if (error) throw new Error(error.message);
}

export async function createMyContact(input: {
  displayName: string;
  phone?: string;
  email?: string;
  notes?: string;
  linkedUserId?: string | null;
}): Promise<ContactRecord> {
  const userId = await currentUserId();
  const { data, error } = await getSupabase()
    .from('contacts')
    .insert({
      owner_id: userId,
      display_name: input.displayName.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      linked_user_id: input.linkedUserId || null,
    })
    .select('id, owner_id, linked_user_id, display_name, phone, email, notes, created_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No fue posible crear el contacto.');
  return data as ContactRecord;
}

export async function discoverNetworkProfiles(search = ''): Promise<NetworkProfile[]> {
  const { data, error } = await getSupabase().rpc('discover_network_profiles', {
    p_search: search,
  });

  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data as NetworkProfile[] : [];
}

export async function listMyCallLogs(): Promise<CallLogRecord[]> {
  const { data, error } = await getSupabase().rpc('list_my_call_logs', {
    p_limit: 30,
  });

  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data as CallLogRecord[] : [];
}

export async function listMyCommunities(): Promise<Array<CommunityRecord & {
  members: CommunityMemberRecord[];
  posts: CommunityPostRecord[];
}>> {
  const { data, error } = await getSupabase()
    .from('conversations')
    .select('id, owner_id, name, description, category, created_at, conversation_members(user_id, role, joined_at), messages(id, sender_id, body, created_at)')
    .eq('kind', 'community')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row) => ({
    id: String(row.id),
    owner_id: String(row.owner_id || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    category: String(row.category || ''),
    created_at: String(row.created_at || ''),
    members: ((row.conversation_members || []) as Array<{
      user_id: string;
      role: string;
      joined_at: string;
    }>).map((member) => ({
      community_id: String(row.id),
      user_id: String(member.user_id),
      member_role: String(member.role || 'member'),
      created_at: String(member.joined_at || ''),
    })),
    posts: ((row.messages || []) as Array<{
      id: string;
      sender_id: string;
      body: string;
      created_at: string;
    }>).map((post) => ({
      id: String(post.id),
      community_id: String(row.id),
      author_id: String(post.sender_id || ''),
      body: String(post.body || ''),
      created_at: String(post.created_at || ''),
    })),
  }));
}

export async function createMyCommunity(input: {
  name: string;
  description: string;
  category: string;
}): Promise<CommunityRecord> {
  const userId = await currentUserId();
  const { data, error } = await getSupabase()
    .from('conversations')
    .insert({
      owner_id: userId,
      kind: 'community',
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
    })
    .select('id, owner_id, name, description, category, created_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No fue posible crear la comunidad.');

  await getSupabase().from('conversation_members').insert({
    conversation_id: data.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
  });

  return data as CommunityRecord;
}

export async function createCommunityPost(communityId: string, body: string): Promise<CommunityPostRecord> {
  const userId = await currentUserId();
  const { data, error } = await getSupabase()
    .from('messages')
    .insert({
      conversation_id: communityId,
      sender_id: userId,
      body: body.trim(),
      kind: 'text',
    })
    .select('id, conversation_id, sender_id, body, created_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No fue posible publicar.');
  return {
    id: data.id,
    community_id: data.conversation_id,
    author_id: data.sender_id,
    body: data.body,
    created_at: data.created_at,
  };
}
