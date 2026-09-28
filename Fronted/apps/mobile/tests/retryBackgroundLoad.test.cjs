const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/utils/retryBackgroundLoad.ts');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: filename,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleUnderTest = { exports: {} };
new Function('module', 'exports', compiled)(
  moduleUnderTest,
  moduleUnderTest.exports,
);
const { retryBackgroundLoad } = moduleUnderTest.exports;

test('successful load runs only once', async () => {
  let calls = 0;
  const result = await retryBackgroundLoad(async () => {
    calls += 1;
    return 'loaded';
  });
  assert.equal(result, 'loaded');
  assert.equal(calls, 1);
});

test('transient failure recovers without exposing an error', async () => {
  let calls = 0;
  const result = await retryBackgroundLoad(async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary connection failure');
    return 'recovered';
  });
  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('persistent failure is returned only after three attempts', async () => {
  let calls = 0;
  await assert.rejects(
    retryBackgroundLoad(async () => {
      calls += 1;
      throw new Error('connection unavailable');
    }),
    /connection unavailable/,
  );
  assert.equal(calls, 3);
});

test('cancellation prevents further attempts', async () => {
  let calls = 0;
  let active = true;
  await assert.rejects(
    retryBackgroundLoad(async () => {
      calls += 1;
      active = false;
      throw new Error('cancelled load');
    }, () => active),
    /cancelled load/,
  );
  assert.equal(calls, 1);
});
