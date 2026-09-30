const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

test('un chat nuevo espera su primer mensaje y carga la página completa', async () => {
  const filename = path.resolve(__dirname, '../src/services/chatMessageSnapshotSync.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const rows = [
    { id: 'existing', own_participant: { identity_id: 'identity-a' },
      last_message: { id: 'old-message', status: 'sent' } },
  ];
  const prefetched = [];
  let notify;
  const mocks = {
    './authSession': {
      getValidSessionCredentials: async () => ({
        scheme: 'Bearer', token: 'test-token',
      }),
    },
    './chatInitialSync': {
      prefetchRecentChatMessages: async (_auth, selected) => {
        prefetched.push(...selected.map((row) => row.id));
      },
    },
    './chatInboxCache': {
      readCachedPrivateChatIdentityId: async () => 'identity-a',
      readCachedProtectedChatIds: async () => [],
      readChatInboxCache: async () => [],
    },
    './chatMessageSnapshotCache': {
      readChatMessageSnapshot: async () => null,
      removeChatMessageSnapshot: async () => {},
      writeChatMessageSnapshot: async () => true,
    },
    '../stores/chatStore': {
      getActiveChatStoreIdentityId: () => 'identity-a',
      getChatConversations: () => rows,
      getChatMessages: () => [],
      getChatMessagesCacheMetadata: () => ({}),
      hydrateChatConversations: async () => {},
      setChatMessages: () => {},
      subscribeChatStore: (callback) => {
        notify = callback;
        return () => { notify = undefined; };
      },
    },
  };
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (name) => mocks[name] || module.require(name);
  loaded._compile(compiled, filename);
  const sync = loaded.exports;
  try {
    await sync.startChatMessageSnapshotSync('user-a');
    notify({ type: 'conversations', conversationIds: ['existing'] });
    const created = {
      id: 'new-chat',
      own_participant: { identity_id: 'identity-a' },
      last_message: null,
    };
    rows.push(created);
    notify({ type: 'conversations', conversationIds: ['new-chat'] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(prefetched, []);
    created.last_message = { id: 'first-message', status: 'sent' };
    notify({ type: 'conversations', conversationIds: ['new-chat'] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(prefetched, ['new-chat']);
    notify({ type: 'conversations', conversationIds: ['new-chat'] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(prefetched, ['new-chat']);
  } finally {
    sync.stopChatMessageSnapshotSync();
  }
});
