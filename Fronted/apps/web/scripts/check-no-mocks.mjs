import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  {
    label: 'Mock / simulación / INITIAL_DEVICES',
    pattern: '(Mock)|simulación|INITIAL_DEVICES|Mock terms|MOCK',
    glob: 'src',
  },
  {
    label: 'alert() en componentes cliente',
    pattern: 'alert\\(',
    glob: 'src/components/client',
    ignore: ['NoteEdit.tsx', 'IntegrationsPanel.tsx'],
  },
  {
    label: 'Textos de funcionalidad no disponible en web',
    pattern: 'no disponible en web aún|no disponibles en web aún',
    glob: 'src/components/client',
  },
  {
    label: 'Datos demo en overview / calendario / estados',
    pattern: 'Carlos M\\.|Carlos Mendoza|Consultas recibidas|tareas sugeridas|Avance del proyecto Q3',
    glob: 'src/components/client',
  },
];

let failed = false;

for (const check of checks) {
  const ignoreArgs = (check.ignore ?? [])
    .map((file) => `--glob !**/${file}`)
    .join(' ');

  try {
    execSync(`rg -n "${check.pattern}" ${ignoreArgs} ${check.glob}`, {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    console.error(`[check:no-mocks] Falló: ${check.label}`);
    failed = true;
  } catch (error) {
    const status = error.status ?? error.code;
    if (status === 1) {
      console.log(`[check:no-mocks] OK: ${check.label}`);
    } else {
      console.error(`[check:no-mocks] Error ejecutando ripgrep: ${error.message}`);
      process.exit(2);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('[check:no-mocks] Sin mocks prohibidos detectados.');
