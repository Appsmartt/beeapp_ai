const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const options = { noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [], lib: ['lib.es2022.d.ts','lib.dom.d.ts'] };
const files = ['mail-index','oauth-google','oauth-microsoft'].map(name => path.join(__dirname, name + '.ts'));
const host = ts.createCompilerHost(options);
const read = host.readFile.bind(host);
host.readFile = function (name) {
  if (!files.includes(path.resolve(name))) return read(name);
  return fs.readFileSync(name.replace(/\.ts$/, '.input'), 'utf8')
    .replace(/import "jsr:[^"]+";/, 'declare const Deno: { env: { get(k: string): string | undefined }; serve(fn: (r: Request) => Promise<Response>): void };')
    .replace(/"npm:@supabase\/supabase-js@[^"]+"/, '"@supabase/supabase-js"');
};
const prog = ts.createProgram(files, options, host);
const diagnostics = ts.getPreEmitDiagnostics(prog);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName:x=>x, getCurrentDirectory:process.cwd, getNewLine:()=> '\n' }));
  process.exitCode = 1;
} else console.log('TypeScript OK for all three Edge functions');
