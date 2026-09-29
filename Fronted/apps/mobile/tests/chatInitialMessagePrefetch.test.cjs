const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

test('precarga 20 directos, 20 grupos y fijados una sola vez', async () => {
  const filename = path.resolve(__dirname, '../src/services/chatInitialSync.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const snapshots = new Map();
  const stored = new Map();
  const metadata = new Map();
  const requests = [];
  const rows = [
    ...Array.from({ length: 23 }, (_, i) => ({
      id: `direct-${i}`, conversation_type: 'direct',
      is_pinned: false, own_participant: { identity_id: 'identity-a' },
      last_message_at: new Date(Date.UTC(2026, 8, 29, 12, 0, 0) - i * 1000).toISOString(),
    })),
    ...Array.from({ length: 23 }, (_, i) => ({
      id: `group-${i}`, conversation_type: 'group',
      is_pinned: false, own_participant: { identity_id: 'identity-a' },
      last_message_at: new Date(Date.UTC(2026, 8, 29, 11, 0, 0) - i * 1000).toISOString(),
    })),
    ...['direct-pinned', 'group-pinned'].map((id) => ({
      id, conversation_type: id.startsWith('direct') ? 'direct' : 'group',
      is_pinned: true, own_participant: { identity_id: 'identity-a' },
      last_message_at: '2026-01-01T00:00:00Z',
    })),
  ];
  const mocks = {
    '@beeapp/api-client': {
      getChatMessages: async (_auth, id, options) => {
        requests.push({ id, limit: options.limit });
        return {
          messages: Array.from({ length: 30 }, (_, index) => ({
            id: `${id}-${index}`, conversation_id: id,
            sequence_number: index + 1, created_at: '2026-09-29T00:00:00Z',
          })),
          next_before_sequence: 1,
        };
      },
    },
    './chatMessageReceipts': { getLatestIncomingChatMessage: () => null },
    './chatMessageSnapshotCache': {
      readChatMessageSnapshot: async (_user, _identity, id) => snapshots.get(id) || null,
      removeChatMessageSnapshot: async (_user, _identity, id) => { snapshots.delete(id); },
      writeChatMessageSnapshot: async (_user, _identity, id, value) => {
        snapshots.set(id, value);
        return value.messages.length === 30;
      },
    },
    './authSession': {},
    './chatAvatarCache': {},
    '../stores/chatStore': {
      getActiveChatStoreIdentityId: () => 'identity-a',
      getChatMessages: (id) => stored.get(id) || [],
      getChatMessagesCacheMetadata: (id) => metadata.get(id) || {},
      setChatMessages: (id, messages, info) => {
        stored.set(id, messages);
        metadata.set(id, info);
      },
    },
  };
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (name) => mocks[name] || module.require(name);
  loaded._compile(compiled, filename);
  const run = () => loaded.exports.prefetchRecentChatMessages(
    { scheme: 'Bearer', token: 'test-token' },
    rows,
    { userId: 'user-a', identityId: 'identity-a',
      protectedConversationIds: new Set() },
  );
  await run();
  assert.equal(requests.length, 42);
  assert.ok(requests.every((request) => request.limit === 30));
  assert.equal(snapshots.size, 42);
  assert.ok(snapshots.has('direct-pinned'));
  assert.ok(snapshots.has('group-pinned'));
  assert.ok(!snapshots.has('direct-20'));
  assert.ok(!snapshots.has('group-20'));
  await run();
  assert.equal(requests.length, 42);
});
