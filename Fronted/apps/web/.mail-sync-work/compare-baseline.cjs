const { execFileSync } = require('node:child_process');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve('../../..');
const current = process.cwd();
const config = ts.readConfigFile(path.join(current, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, current);
const options = { ...parsed.options, noEmit: true, incremental: false };
const originals = new Map();
for (const name of [
  'Fronted/apps/web/src/components/client/mail/MailModule.tsx',
  'Fronted/apps/web/src/hooks/useMail.ts',
  'Fronted/packages/api-client/src/gateway/mail.ts',
  'Fronted/packages/shared-types/src/index.ts',
]) {
  originals.set(path.resolve(root, name).toLowerCase(), execFileSync('git', ['-C',root,'show','HEAD:' + name], { encoding: 'utf8', maxBuffer: 10_000_000 }));
}
function errors(useOriginals) {
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  if (useOriginals) host.readFile = name => originals.get(path.resolve(name).toLowerCase()) ?? read(name);
  const program = ts.createProgram(parsed.fileNames, options, host);
  return ts.getPreEmitDiagnostics(program).map(d => [path.relative(root,d.file?.fileName || current), d.start, d.code, ts.flattenDiagnosticMessageText(d.messageText,' ')].join('|')).sort();
}
const before = errors(true);
const after = errors(false);
console.log('HEAD:', before.length, 'diagnostics. Working tree:', after.length, 'diagnostics. Identical:', JSON.stringify(before) === JSON.stringify(after));
if (JSON.stringify(before)!==JSON.stringify(after)) process.exitCode=1;
