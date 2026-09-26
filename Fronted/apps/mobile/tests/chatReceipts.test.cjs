const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadPureModule(relativePath) {
  const filename = path.resolve(__dirname, '..', 'src', 'services', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded._compile(compiled, filename);
  return loaded.exports;
}

function loadChatStore() {
  const filename = path.resolve(__dirname, '..', 'src', 'stores', 'chatStore.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (name) => (
    name === '@react-native-async-storage/async-storage'
      ? { getItem: async () => null, setItem: async () => {} }
      : module.require(name)
  );
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const { getChatMessageReceiptStatus } = loadPureModule('chatReceiptStatus.ts');
const { getLatestIncomingChatMessage } = loadPureModule('chatMessageReceipts.ts');
const message = {
  id: 'message-3',
  conversation_id: 'conversation-1',
  sender_id: 'user-own',
  sender_identity_id: 'identity-own',
  sequence_number: 3,
  message_type: 'text',
  content: 'hola',
  status: 'sent',
  created_at: '2026-09-02T00:00:00Z',
};
const recipient = {
  id: 'participant-2',
  identity_id: 'identity-other',
  user_id: 'user-other',
  joined_at: '2026-09-01T00:00:00Z',
  left_at: null,
  removed_at: null,
  last_delivered_message_id: null,
  last_read_message_id: null,
};

test('directo: sin cursor, entrega y lectura', () => {
  assert.equal(getChatMessageReceiptStatus(message, [recipient], 'identity-own', {}), 'sent');
  const delivered = { ...recipient, last_delivered_message_id: 'message-3' };
  assert.equal(getChatMessageReceiptStatus(message, [delivered], 'identity-own', { 'message-3': 3 }), 'delivered');
  assert.equal(getChatMessageReceiptStatus(message, [{ ...delivered, last_read_message_id: 'message-3' }], 'identity-own', { 'message-3': 3 }), 'read');
});

test('cursor fuera de página requiere secuencia comprobada', () => {
  const read = { ...recipient, last_read_message_id: 'message-older' };
  assert.equal(getChatMessageReceiptStatus(message, [read], 'identity-own', {}), 'sent');
  assert.equal(getChatMessageReceiptStatus(message, [read], 'identity-own', { 'message-older': 3 }), 'read');
});

test('grupo exige todos los participantes elegibles', () => {
  const read = { ...recipient, last_read_message_id: 'message-3' };
  const third = { ...recipient, id: 'participant-3', identity_id: 'identity-third' };
  assert.equal(getChatMessageReceiptStatus(message, [read, third], 'identity-own', { 'message-3': 3 }), 'sent');
  assert.equal(getChatMessageReceiptStatus(message, [read, { ...third, last_delivered_message_id: 'message-3' }], 'identity-own', { 'message-3': 3 }), 'delivered');
  assert.equal(getChatMessageReceiptStatus(message, [read, { ...third, last_read_message_id: 'message-3' }], 'identity-own', { 'message-3': 3 }), 'read');
});

test('ingreso posterior, salida y ausencia de secuencia no infieren recibo', () => {
  const later = { ...recipient, joined_at: '2026-09-03T00:00:00Z', last_read_message_id: 'message-3' };
  assert.equal(getChatMessageReceiptStatus(message, [later], 'identity-own', { 'message-3': 3 }), 'sent');
  assert.equal(getChatMessageReceiptStatus(message, [{ ...recipient, left_at: '2026-09-03T00:00:00Z' }], 'identity-own', {}), 'sent');
  assert.equal(getChatMessageReceiptStatus({ ...message, sequence_number: undefined }, [recipient], 'identity-own', {}), 'sent');
});

test('último entrante ignora propios, system y respeta identidad comercial', () => {
  const incoming = { ...message, id: 'incoming', sender_id: 'user-other', sender_identity_id: 'identity-other', sequence_number: 2 };
  const own = { ...message, id: 'own-latest', sequence_number: 3 };
  const system = { ...message, id: 'system-latest', message_type: 'system', sequence_number: 4 };
  assert.equal(getLatestIncomingChatMessage([incoming, own, system], 'identity-own', 'user-own')?.id, 'incoming');
  assert.equal(getLatestIncomingChatMessage([own, incoming], 'identity-business', 'user-own')?.id, 'own-latest');
  const businessOwn = { ...message, id: 'business-own', sender_identity_id: 'identity-business', sequence_number: 5 };
  assert.equal(getLatestIncomingChatMessage([businessOwn, incoming], 'identity-business', 'user-own')?.id, 'incoming');
});

test('store: upsert del mismo mensaje conserva recibo y participantes nuevos', () => {
  const store = loadChatStore();
  const base = {
    id: 'conversation-1',
    conversation_type: 'direct',
    name: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    last_message_at: '2026-09-02T00:00:00Z',
    unread_count: 0,
    last_message: message,
    participants: [recipient],
  };
  store.setChatConversations([base]);
  const newParticipants = [{ ...recipient, last_read_message_id: 'message-3' }];
  store.upsertChatConversation({
    ...base,
    participants: newParticipants,
    last_message: { ...message, status: 'read' },
  });
  assert.equal(store.getChatConversations()[0].last_message.status, 'read');
  assert.equal(
    store.getChatConversations()[0].participants[0].last_read_message_id,
    'message-3',
  );
  store.upsertChatConversation({
    ...base,
    last_message: { ...message, status: 'sent' },
  });
  assert.equal(store.getChatConversations()[0].last_message.status, 'read');
});

test('store: un mensaje realmente nuevo no hereda lectura del anterior', () => {
  const store = loadChatStore();
  const base = {
    id: 'conversation-1',
    conversation_type: 'direct',
    name: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    last_message_at: '2026-09-02T00:00:00Z',
    unread_count: 0,
    last_message: { ...message, status: 'read' },
  };
  store.setChatConversations([base]);
  store.upsertChatConversation({
    ...base,
    updated_at: '2026-09-03T00:00:00Z',
    last_message_at: '2026-09-03T00:00:00Z',
    last_message: {
      ...message,
      id: 'message-4',
      status: 'sent',
      created_at: '2026-09-03T00:00:00Z',
    },
  });
  assert.equal(store.getChatConversations()[0].last_message.id, 'message-4');
  assert.equal(store.getChatConversations()[0].last_message.status, 'sent');
});
