const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/services/locationPermissionAppLockGuard.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const guard = loaded.exports;

test('permission dialog skips one inactive return only', () => {
  guard.armLocationPermissionUnlockSkip();
  assert.equal(guard.consumeLocationPermissionUnlockSkip('inactive'), true);
  assert.equal(guard.consumeLocationPermissionUnlockSkip('inactive'), false);
});

test('a real background transition never skips app lock', () => {
  guard.armLocationPermissionUnlockSkip();
  guard.clearLocationPermissionUnlockSkip();
  assert.equal(guard.consumeLocationPermissionUnlockSkip('background'), false);
  assert.equal(guard.consumeLocationPermissionUnlockSkip('inactive'), false);
});

test('no permission request does not skip app lock', () => {
  guard.clearLocationPermissionUnlockSkip();
  assert.equal(guard.consumeLocationPermissionUnlockSkip('inactive'), false);
});

test('finished permission request expires the skip', async () => {
  guard.armLocationPermissionUnlockSkip();
  guard.finishLocationPermissionUnlockSkip();
  await new Promise((resolve) => setTimeout(resolve, 1600));
  assert.equal(guard.consumeLocationPermissionUnlockSkip('inactive'), false);
});
