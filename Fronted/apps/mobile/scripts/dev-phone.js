const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const localAppData = process.env.LOCALAPPDATA || '';
const adb = path.join(
  localAppData,
  'Android',
  'Sdk',
  'platform-tools',
  'adb.exe',
);

const env = {
  ...process.env,
  ANDROID_HOME: process.env.ANDROID_HOME
    || path.join(localAppData, 'Android', 'Sdk'),
  PATH: `${path.join(localAppData, 'Android', 'Sdk', 'platform-tools')};${process.env.PATH || ''}`,
};

function runAdb(args) {
  if (!require('node:fs').existsSync(adb)) {
    console.error('No se encontró adb. Instala Android SDK platform-tools.');
    process.exit(1);
  }
  const result = spawnSync(adb, args, { encoding: 'utf8', env });
  if (result.status !== 0 && result.stderr) {
    console.error(result.stderr.trim());
  }
  return result;
}

function deviceConnected() {
  const devices = runAdb(['devices']);
  return (devices.stdout || '')
    .split(/\r?\n/)
    .some((line) => line.endsWith('\tdevice'));
}

function ensureDevClientInstalled() {
  const check = runAdb(['shell', 'pm', 'path', 'com.beeapp.mobile']);
  if (check.stdout && check.stdout.includes('package:')) {
    return;
  }
  console.log('Primera vez: instalando cliente de desarrollo en el celular...');
  const install = spawnSync(
    process.execPath,
    [path.join(__dirname, 'install-android-debug-apk.js')],
    { cwd: mobileRoot, stdio: 'inherit', env },
  );
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

async function waitForMetro(port, maxAttempts = 180) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`);
      const body = await response.text();
      if (body.includes('packager-status:running')) {
        return;
      }
    } catch {
      // Metro aún no responde.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
  throw new Error('Metro no respondió a tiempo.');
}

async function warmAndroidBundle(port) {
  const params = new URLSearchParams({
    platform: 'android',
    dev: 'true',
    minify: 'false',
    lazy: 'false',
    hot: 'false',
  });
  const url = `http://127.0.0.1:${port}/index.bundle?${params.toString()}`;

  console.log('');
  console.log(
    'Preparando el bundle de Android (la primera vez puede tardar 1-2 min)...',
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Metro respondió ${response.status} al preparar el bundle.`);
    }
    await response.arrayBuffer();
    console.log('Bundle listo. Abriendo la app en el celular...');
  } finally {
    clearTimeout(timeout);
  }
}

function openAppOnDevice(port) {
  const devUrl = encodeURIComponent(`http://127.0.0.1:${port}`);
  runAdb([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `beeapp://expo-development-client/?url=${devUrl}`,
    'com.beeapp.mobile',
  ]);
}

if (!deviceConnected()) {
  console.error('Conecta el celular por USB y activa Depuración USB.');
  process.exit(1);
}

ensureDevClientInstalled();

const PORT = process.env.METRO_PORT || '8081';

runAdb(['reverse', `tcp:${PORT}`, `tcp:${PORT}`]);

console.log('');
console.log('Metro (hot reload):');
console.log('  r  → recargar la app');
console.log('  m  → menú de desarrollo');
console.log('  j  → abrir depurador');
console.log('');

const expo = spawn(
  'npx',
  ['expo', 'start', '--dev-client', '--localhost', '--port', PORT],
  {
    cwd: mobileRoot,
    stdio: 'inherit',
    env,
    shell: true,
  },
);

let launched = false;

void (async () => {
  try {
    await waitForMetro(PORT);
    await warmAndroidBundle(PORT);
    if (!launched) {
      launched = true;
      openAppOnDevice(PORT);
    }
  } catch (error) {
    console.error('');
    console.error(
      error instanceof Error
        ? error.message
        : 'No se pudo preparar la app en el celular.',
    );
    console.error(
      'Metro sigue corriendo: pulsa "a" en esta terminal o Reload en el celular.',
    );
  }
})();

expo.on('exit', (code) => {
  process.exit(code ?? 0);
});
