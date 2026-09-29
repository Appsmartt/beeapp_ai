const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const values = new Map();
const storage = {
  async getItem(key) { return values.get(key) ?? null; },
  async setItem(key, value) { values.set(key, value); },
  async removeItem(key) { values.delete(key); },
  async getAllKeys() { return [...values.keys()]; },
  async multiRemove(keys) { keys.forEach((key) => values.delete(key)); },
};
const filename = path.resolve(__dirname, '../src/services/chatMessageSnapshotCache.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: filename,
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded.require = (name) => name === '@react-native-async-storage/async-storage'
  ? { default: storage } : module.require(name);
loaded._compile(compiled, filename);
const cache = loaded.exports;
const metadata = {
  nextBeforeSequence: 10,
  hasMore: true,
  lastSyncedAt: '2026-09-29T00:00:00Z',
};
const message = (number, conversationId = 'conversation-a') => ({
  id: `message-${number}`,
  conversation_id: conversationId,
  sequence_number: number,
  message_type: 'text',
  content: `private-${number}`,
  status: 'sent',
  created_at: '2026-09-29T00:00:00Z',
});

test('persiste exactamente los 30 mensajes más recientes y sus metadatos', async () => {
  values.clear();
  const messages = Array.from({ length: 35 }, (_, index) => message(index + 1));
  assert.equal(await cache.writeChatMessageSnapshot(
    'user-a', 'identity-a', 'conversation-a', { messages, metadata },
  ), true);
  const snapshot = await cache.readChatMessageSnapshot(
    'user-a', 'identity-a', 'conversation-a',
  );
  assert.equal(snapshot.messages.length, 30);
  assert.equal(snapshot.messages[0].id, 'message-6');
  assert.equal(snapshot.messages.at(-1).id, 'message-35');
  assert.deepEqual(snapshot.metadata, metadata);
});

test('separa usuario, identidad y conversación', async () => {
  assert.equal(await cache.readChatMessageSnapshot(
    'user-b', 'identity-a', 'conversation-a',
  ), null);
  assert.equal(await cache.readChatMessageSnapshot(
    'user-a', 'identity-b', 'conversation-a',
  ), null);
  assert.equal(await cache.readChatMessageSnapshot(
    'user-a', 'identity-a', 'conversation-b',
  ), null);
});

test('limpieza de sesión elimina snapshots sin tocar otras claves', async () => {
  values.set('unrelated-key', 'keep');
  await cache.clearChatMessageSnapshots();
  assert.equal(await cache.readChatMessageSnapshot(
    'user-a', 'identity-a', 'conversation-a',
  ), null);
  assert.equal(values.get('unrelated-key'), 'keep');
});

test('logout invalida una escritura pendiente', async () => {
  values.clear();
  const originalSetItem = storage.setItem;
  let release;
  let entered;
  const reachedSetItem = new Promise((resolve) => { entered = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  storage.setItem = async (key, value) => {
    entered();
    await gate;
    values.set(key, value);
  };
  try {
    const pendingWrite = cache.writeChatMessageSnapshot(
      'user-a', 'identity-a', 'conversation-a',
      { messages: [message(1)], metadata },
    );
    await reachedSetItem;
    await cache.clearChatMessageSnapshots();
    release();
    assert.equal(await pendingWrite, false);
    assert.equal(await cache.readChatMessageSnapshot(
      'user-a', 'identity-a', 'conversation-a',
    ), null);
  } finally {
    release();
    storage.setItem = originalSetItem;
  }
});
