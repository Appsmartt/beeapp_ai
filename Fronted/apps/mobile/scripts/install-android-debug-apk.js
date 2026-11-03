const { spawnSync } = require('node:child_process');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const frontedRoot = path.resolve(mobileRoot, '..', '..');
const mobileRelativePath = path.relative(frontedRoot, mobileRoot);
const substDrive = process.env.BEEAPP_BUILD_DRIVE || 'X:';
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
  JAVA_HOME: process.env.JAVA_HOME
    || 'C:\\Program Files\\Android\\Android Studio\\jbr',
  ANDROID_HOME: process.env.ANDROID_HOME
    || path.join(localAppData, 'Android', 'Sdk'),
  PATH: `${path.join(localAppData, 'Android', 'Sdk', 'platform-tools')};${process.env.PATH || ''}`,
};

function ensureSubstDrive() {
  const query = spawnSync('subst', [], { encoding: 'utf8', shell: true });
  const mapping = (query.stdout || '')
    .split(/\r?\n/)
    .find((line) => line.toUpperCase().startsWith(`${substDrive.toUpperCase()}\\`));

  if (mapping) {
    const target = mapping.split('=>')[1]?.trim() || '';
    if (path.resolve(target).toLowerCase() === frontedRoot.toLowerCase()) {
      return `${substDrive}\\${mobileRelativePath.replace(/\//g, '\\')}\\android`;
    }
    spawnSync('subst', [substDrive, '/D'], { shell: true });
  }

  const created = spawnSync(
    'subst',
    [substDrive, `"${frontedRoot}"`],
    { stdio: 'inherit', shell: true },
  );

  if (created.status !== 0) {
    console.error(`No fue posible crear la unidad ${substDrive}.`);
    process.exit(1);
  }

  return `${substDrive}\\${mobileRelativePath.replace(/\//g, '\\')}\\android`;
}

function isPackageInstalled() {
  if (!require('node:fs').existsSync(adb)) {
    return false;
  }
  const result = spawnSync(
    adb,
    ['shell', 'pm', 'path', 'com.beeapp.mobile'],
    { encoding: 'utf8', env },
  );
  return Boolean(result.stdout && result.stdout.includes('package:'));
}

const androidDir = process.platform === 'win32'
  ? ensureSubstDrive()
  : path.join(mobileRoot, 'android');

if (isPackageInstalled()) {
  console.log('Buddy AI (dev) ya está instalada en el celular.');
  process.exit(0);
}

console.log(`Instalando cliente de desarrollo (arm64) desde ${androidDir}...`);
console.log('Solo hace falta una vez; después usas npm run dev:phone para hot reload.');

const gradle = path.join(androidDir, 'gradlew.bat');
const result = spawnSync(
  gradle,
  ['installDebug'],
  {
    cwd: androidDir,
    stdio: 'inherit',
    env,
    shell: true,
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Cliente de desarrollo instalado en el celular.');
