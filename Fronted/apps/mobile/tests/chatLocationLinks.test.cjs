const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/services/chatLocationLinks.ts');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const calls = [];
const platform = { OS: 'ios' };
let canOpen = async () => false;
let open = async () => {};
const mock = {
  Platform: platform,
  Linking: {
    canOpenURL: async (url) => { calls.push(['check', url]); return canOpen(url); },
    openURL: async (url) => { calls.push(['open', url]); return open(url); },
  },
};
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => name === 'react-native' ? mock : require(name);
loaded._compile(compiled, filename);
const { openChatLocation } = loaded.exports;
const position = { latitude: 4.711, longitude: -74.072 };

test('iOS prefers Google Maps when installed', async () => {
  platform.OS = 'ios';
  calls.length = 0;
  canOpen = async (url) => url.startsWith('comgooglemaps:');
  open = async () => {};
  await openChatLocation(position);
  assert.deepEqual(calls.map((call) => call[0]), ['check', 'open']);
  assert.match(calls[1][1], /comgooglemaps:.*4\.711%2C-74\.072/);
});

test('iOS falls back to Apple Maps', async () => {
  platform.OS = 'ios';
  calls.length = 0;
  canOpen = async (url) => url.startsWith('maps:');
  open = async () => {};
  await openChatLocation(position);
  assert.deepEqual(calls.map((call) => call[0]), ['check', 'check', 'open']);
  assert.match(calls[2][1], /^maps:.*4\.711%2C-74\.072/);
});

test('iOS falls back to browser', async () => {
  platform.OS = 'ios';
  calls.length = 0;
  canOpen = async () => false;
  open = async () => {};
  await openChatLocation(position);
  assert.equal(calls.at(-1)[0], 'open');
  assert.match(calls.at(-1)[1], /^https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
});

test('Android tries Google Maps before geo fallback', async () => {
  platform.OS = 'android';
  calls.length = 0;
  canOpen = async () => true;
  open = async (url) => {
    if (url.startsWith('intent:')) throw new Error('Google Maps unavailable');
  };
  await openChatLocation(position);
  assert.match(calls[0][1], /package=com\.google\.android\.apps\.maps/);
  assert.match(calls.at(-1)[1], /^geo:/);
});

test('Android uses browser if map apps fail', async () => {
  platform.OS = 'android';
  calls.length = 0;
  canOpen = async () => false;
  open = async (url) => {
    if (url.startsWith('intent:')) throw new Error('Google Maps unavailable');
  };
  await openChatLocation(position);
  assert.match(calls.at(-1)[1], /^https:\/\/www\.google\.com\/maps\/search\//);
});

test('invalid coordinates never open a link', async () => {
  platform.OS = 'ios';
  calls.length = 0;
  await assert.rejects(openChatLocation({ latitude: 91, longitude: 0 }));
  assert.equal(calls.length, 0);
});
