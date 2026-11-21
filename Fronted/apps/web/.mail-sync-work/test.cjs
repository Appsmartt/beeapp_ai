const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(join(__dirname, 'mail-index.input'), 'utf8');
const testable = source.replace(/^import .*;$/gm, '') +
  '\nglobalThis.api = { encryptToken, accessToken, syncGoogle, syncMicrosoft, syncPage, importMailbox };';
const compiled = ts.transpileModule(testable, { compilerOptions: { target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert.equal(compiled.diagnostics.length, 0);
let serve;
let providerFetch;
let client;
const context = {
  Request, Response, URL, URLSearchParams, AbortSignal, btoa, atob, crypto, TextEncoder, TextDecoder,
  createClient: () => client,
  fetch: (...args) => providerFetch(...args),
  Deno: { env: { get: () => 'local-test-only' }, serve: handler => { serve = handler; } },
};
vm.runInNewContext(compiled.outputText, context);
const { api } = context;
const owner = '00000000-0000-4000-9000-000000000001';
const id = '00000000-0000-4000-9000-000000000002';
const lease = '00000000-0000-4000-9000-000000000003';
const end = new Date().toISOString();
const window = { since: '2026-11-01T00:00:00.000Z', end, cursor: null, lease };
const row = { id, user_id: owner, provider: 'google', connected_at: '2026-10-20T10:00:00.000Z', updated_at: end };

function query(result, inspect = () => {}) {
  const builder = new Proxy({}, { get(_, name) {
    if (name === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return (...args) => { inspect(name, ...args); return builder; };
  } });
  return builder;
}
const request = (payload, headers = {}) => new Request('https://example.test/mail-sync', {
  method: 'POST', headers, body: JSON.stringify(payload),
});

(async () => {
  const preflight = await serve(new Request('https://example.test/mail-sync', { method: 'OPTIONS' }));
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/);
  assert.equal((await serve(request({}))).status, 401);
  assert.equal((await serve(request({ action: 'send' }))).status, 401);
  assert.equal((await serve(request({ action: 'scheduled', integration_id: id }))).status, 403);
  const filters = [];
  client = { from: table => {
    assert.equal(table, 'mail_sync_state');
    return query({ data: null, error: null }, (name, ...args) => filters.push([name, ...args]));
  }};
  assert.equal((await serve(request({ action: 'scheduled', integration_id: id, ticket: lease }))).status, 403);
  assert(filters.some(([method, key, value]) => method === 'eq' && key === 'dispatch_ticket' && value === lease));
  assert(filters.some(([method, key]) => method === 'gt' && key === 'next_attempt_at'));
  console.log('OK: browser preflight, user authentication and single-use dispatch guard');

  const existing = new Map([['old', { folder: 'trash', is_read: true, is_starred: true }]]);
  const providerAccount = {
    from: () => query({ data: [...existing.keys()].map(external_id => ({ external_id })), error: null }),
    rpc: async (name, params) => {
      assert.equal(name, 'store_imported_mail');
      assert.equal(params.p_lease_id, lease);
      let created = 0;
      for (const message of params.p_messages) {
        if (!existing.has(message.external_id)) { existing.set(message.external_id, message); created++; }
      }
      return { data: created, error: null };
    },
  };
  const gmailIds = Array.from({ length: 24 }, (_, index) => 'm' + index);
  let lists = 0;
  providerFetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith('/messages')) {
      lists++;
      assert.match(url.searchParams.get('q'), /after:.* before:/);
      const more = !url.searchParams.has('pageToken');
      return Response.json({ messages: (more ? ['old', ...gmailIds.slice(0,19)] : gmailIds.slice(19)).map(id => ({ id })),
        nextPageToken: more ? 'p2' : undefined });
    }
    return Response.json({ id: url.pathname.split('/').pop(), labelIds: ['INBOX', 'UNREAD'], payload: {} });
  };
  const p1 = await api.syncGoogle(providerAccount, row, 'test', window);
  const p2 = await api.syncGoogle(providerAccount, row, 'test', { ...window, cursor: p1.next });
  assert.equal(p1.created + p2.created, 24);
  assert.equal(p2.next, null);
  assert.equal((await api.syncGoogle(providerAccount, row, 'test', window)).created, 0);
  assert.deepEqual(existing.get('old'), { folder: 'trash', is_read: true, is_starred: true });
  assert.equal(lists, 3);
  console.log('OK: Gmail backlog past 20 messages, repeat imports and existing local state');

  providerFetch = async input => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://graph.microsoft.com');
    if (url.pathname.endsWith('/$batch')) return Response.json({ responses: [{ id: 'inbox', status: 200, body: { id: 'folder01' } }] });
    if (url.searchParams.get('$skip') === '20') return Response.json({ value: [] });
    assert.match(url.searchParams.get('$filter'), /receivedDateTime ge .* and receivedDateTime lt/);
    return Response.json({ value: [{ id: 'outlook1', parentFolderId: 'folder01' }],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=20' });
  };
  const ms1 = await api.syncMicrosoft(providerAccount, row, 'test', window);
  assert.equal(ms1.created, 1);
  assert.equal(existing.get('outlook1').folder, 'inbox');
  assert.equal((await api.syncMicrosoft(providerAccount, row, 'test', { ...window, cursor: ms1.next })).next, null);
  console.log('OK: Outlook pagination and mailbox folders');

  const tokenRow = { ...row, refresh_token_ciphertext: await api.encryptToken('fake-refresh') };
  const updates = [];
  const admin = { from: () => query({ data: [{ id, updated_at: end }], error: null }, (name, value) => {
    if (name === 'update') updates.push(value);
  }) };
  providerFetch = async () => Response.json({ error: 'temporarily_unavailable' }, { status: 503 });
  await assert.rejects(api.accessToken(admin, tokenRow), e => e.code === 'TOKEN_REFRESH_FAILED');
  assert.equal(updates.length, 0);
  providerFetch = async () => Response.json({ error: 'invalid_grant' }, { status: 400 });
  await assert.rejects(api.accessToken(admin, tokenRow), e => e.code === 'RECONNECT_REQUIRED');
  assert.equal(updates[0].status, 'error');
  providerFetch = async () => Response.json({ access_token: 'new-token', refresh_token: 'rotated', expires_in: 3600 });
  assert.equal(await api.accessToken(admin, tokenRow), 'new-token');
  console.log('OK: transient failure, revoked authorization and rotated token');

  const checkpoint = [];
  const finish = [];
  const failing = {
    from(name) { return name === 'mail_messages'
      ? query({ data: { received_at: window.since }, error: null })
      : query({ data: { integration_id: id }, error: null }, (name, value) => { if (name === 'update') checkpoint.push(value); }); },
    async rpc(name, params) { assert.equal(name, 'finish_mail_sync'); finish.push(params); return { data: true }; }
  };
  providerFetch = async () => Response.json({}, { status: 503 });
  await assert.rejects(api.importMailbox(failing, { ...row, access_token_ciphertext: await api.encryptToken('access'), token_expires_at: '2099-01-01' }, {}, lease));
  assert.equal(checkpoint.length, 1);
  assert.equal(finish[0].p_error_code, 'PROVIDER_UNAVAILABLE');
  assert.equal(finish[0].p_synced_through, null);
  console.log('OK: receive window saved before download, failed page never advances');
})().catch(error => { console.error(error); process.exitCode = 1; });
