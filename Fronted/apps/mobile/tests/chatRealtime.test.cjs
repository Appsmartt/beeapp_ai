const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

test('broadcast nuevo actualiza mensajes, preview y contador del inbox', async () => {
  const filename = path.resolve(__dirname, '../src/services/chatRealtime.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';

  const message = {
    id: 'message-1', conversation_id: 'conversation-1',
    sender_id: 'user-other', sender_identity_id: 'identity-other',
    sequence_number: 1, message_type: 'text', content: 'hola',
    status: 'sent', created_at: '2026-09-26T14:00:00Z',
  };
  const conversations = [];
  const messages = [];
  let broadcast;
  let subscriptionStatus;
  let inboxLatest = message;
  let serverPage = [message];
  let inboxRequests = 0;
  let participantRows = [{
    id: 'participant-own', identity_id: 'identity-own',
    left_at: null, removed_at: null,
  }];
  const channel = {
    on(_type, _filter, listener) { broadcast = listener; return this; },
    subscribe(callback) { subscriptionStatus = callback; return this; },
  };
  const mocks = {
    '@supabase/supabase-js': {
      createClient: () => ({
        realtime: { setAuth() {} },
        channel: () => channel,
        removeChannel: async () => {},
      }),
    },
    '@beeapp/api-client': {
      getChatMessage: async () => ({ message }),
      getChatMessages: async () => ({ messages: serverPage }),
      getChatIdentities: async () => ({
        identities: [{ id: 'identity-own', is_active: true }],
      }),
      getChatParticipants: async () => ({ participants: participantRows }),
      markChatConversationDelivered: async () => ({ marked: true }),
      getChatInbox: async () => {
        inboxRequests += 1;
        return {
          conversations: [{
            id: 'conversation-1', conversation_type: 'direct',
            last_message: inboxLatest, last_message_at: inboxLatest.created_at,
            updated_at: message.created_at, unread_count: 1,
            participants: [], own_participant: {
              identity_id: 'identity-own', unread_count: 1,
            },
          }],
        };
      },
    },
    './authSession': {
      getValidAuthSession: async () => ({
        user: { id: 'user-own' },
        session: { access_token: 'test-token' },
      }),
      getSessionCredentials: () => ({ accessToken: 'test-token' }),
    },
    '../stores/chatStore': {
      getChatConversations: () => conversations,
      getChatMessages: () => messages,
      setChatMessages: (_id, rows) => {
        messages.splice(0, messages.length, ...rows);
      },
      upsertChatMessage: (_id, item) => { messages.push(item); },
      upsertChatConversation: (item) => {
        const index = conversations.findIndex((row) => row.id === item.id);
        if (index < 0) conversations.push(item);
        else conversations[index] = item;
      },
      updateChatConversationLastMessage: () => {},
    },
    './chatReceiptStatus': {
      getChatMessageReceiptStatus: (_message, participants) => {
        return participants.some((participant) => participant.last_read_message_id === 'message-2')
          ? 'read' : 'sent';
      },
    },
  };
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (name) => mocks[name] || module.require(name);
  try {
    loaded._compile(compiled, filename);
    await loaded.exports.startChatRealtime();
    assert.equal(typeof broadcast, 'function');
    broadcast({ payload: {
      type: 'message.created', conversation_id: 'conversation-1',
      message_id: 'message-1',
    } });
    for (let i = 0; i < 30 && inboxRequests === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(messages.length, 1);
    assert.equal(inboxRequests, 1);
    assert.equal(conversations[0].last_message.id, 'message-1');
    assert.equal(conversations[0].unread_count, 1);
    const ownMessage = {
      ...message, id: 'message-2', sequence_number: 2,
      sender_id: 'user-own', sender_identity_id: 'identity-own',
      content: 'respuesta', status: 'sent',
      created_at: '2026-09-26T14:01:00Z',
    };
    messages.push(ownMessage);
    conversations[0] = {
      ...conversations[0],
      last_message: ownMessage,
      last_message_at: ownMessage.created_at,
      own_participant: { identity_id: 'identity-own' },
    };
    participantRows = [
      { id: 'participant-own', identity_id: 'identity-own', left_at: null, removed_at: null },
      {
        id: 'participant-other', identity_id: 'identity-other',
        left_at: null, removed_at: null,
        last_read_message_id: 'message-2',
      },
    ];
    broadcast({ payload: {
      type: 'participant.upsert', conversation_id: 'conversation-1',
      payload: { reason: 'message_receipt' },
    } });
    for (let i = 0; i < 30 && conversations[0].last_message.status !== 'read'; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(
      conversations[0].last_message.status,
      'read',
      JSON.stringify({
        lastMessage: conversations[0].last_message,
        participants: conversations[0].participants,
        ownParticipant: conversations[0].own_participant,
        inboxRequests,
        storedMessageIds: messages.map((item) => item.id),
      }),
    );
    assert.equal(conversations[0].participants[1].last_read_message_id, 'message-2');
    const missedMessage = {
      ...message, id: 'message-3', sequence_number: 3,
      created_at: '2026-09-26T14:02:00Z',
      content: 'mensaje tras reconexión',
    };
    inboxLatest = missedMessage;
    serverPage = [message, ownMessage, missedMessage];
    subscriptionStatus('SUBSCRIBED');
    for (let i = 0; i < 40 && !messages.some((item) => item.id === 'message-3'); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(conversations[0].last_message.id, 'message-3');
    assert.ok(
      messages.some((item) => item.id === 'message-3'),
      JSON.stringify({
        inboxRequests,
        serverPageIds: serverPage.map((item) => item.id),
        ids: messages.map((item) => item.id),
        lastMessageId: conversations[0].last_message.id,
      }),
    );
    await loaded.exports.stopChatRealtime();
  } finally {
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  }
});
