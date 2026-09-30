const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../../../packages/api-client/src/chat.ts');
const source = fs.readFileSync(filename, 'utf8');
const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.find(
  (statement) => ts.isFunctionDeclaration(statement)
    && statement.name?.text === 'toSharedInboxConversation',
);
assert.ok(declaration, 'Inbox conversation adapter must exist');

const compiled = ts.transpileModule(declaration.getText(ast), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
  fileName: filename,
}).outputText;
const toSharedInboxConversation = new Function(
  'splitIdentityDisplayName',
  'toUiMessageType',
  `${compiled}; return toSharedInboxConversation;`,
)(
  (name) => ({ firstName: name || '', lastName: '' }),
  (type) => type || 'text',
);

function inboxRow(overrides = {}) {
  return {
    conversation_id: 'conversation-1',
    conversation_type: 'direct',
    group_name: null,
    group_description: null,
    group_image_file_id: null,
    other_identity_id: 'identity-other',
    other_identity_type: 'profile',
    other_profile_id: 'user-other',
    other_commercial_profile_id: null,
    other_display_name: 'Contacto',
    other_logo_file_id: null,
    avatar_url: null,
    last_message_id: 'message-1',
    last_message_type: 'text',
    last_message_preview: 'prueba',
    last_message_at: '2026-09-29T20:00:00Z',
    last_message_sender_identity_id: 'identity-own',
    last_message_receipt_status: 'sent',
    unread_count: 0,
    last_read_message_id: null,
    last_read_at: null,
    notifications_enabled: true,
    cleared_at: null,
    ...overrides,
  };
}

test('inbox: mensaje propio persistido pasa de sent a delivered', () => {
  const row = toSharedInboxConversation(inboxRow(), 'identity-own');
  assert.equal(row.last_message.status, 'delivered');
  assert.equal(row.last_message.id, 'message-1');
});

test('inbox: mensaje ajeno o sin remitente no recibe entrega propia', () => {
  for (const sender of ['identity-other', null]) {
    const row = toSharedInboxConversation(
      inboxRow({ last_message_sender_identity_id: sender }),
      'identity-own',
    );
    assert.equal(row.last_message.status, 'sent');
  }
});

test('inbox: lectura prevalece sobre entrega', () => {
  const row = toSharedInboxConversation(
    inboxRow({ last_message_receipt_status: 'read' }),
    'identity-own',
  );
  assert.equal(row.last_message.status, 'read');
});

test('inbox: grupos muestran entrega de mensaje propio persistido', () => {
  const row = toSharedInboxConversation(
    inboxRow({
      conversation_type: 'group',
      group_name: 'Grupo de prueba',
      other_identity_id: null,
    }),
    'identity-own',
  );
  assert.equal(row.last_message.status, 'delivered');
});
