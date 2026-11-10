const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolveAndroidJavaHome } = require('./resolve-android-java-home');

const mobileRoot = path.resolve(__dirname, '..');
const frontedRoot = path.resolve(mobileRoot, '..', '..');
const mobileRelativePath = path.relative(frontedRoot, mobileRoot);

// Reanimated's C++ build loops forever ("build.ninja still dirty")
// when compiled from a OneDrive path; a SUBST drive avoids it.
const substDrive = process.env.BEEAPP_BUILD_DRIVE || 'X:';

const localAppData = process.env.LOCALAPPDATA || '';
const env = {
  ...process.env,
  JAVA_HOME: resolveAndroidJavaHome(),
  ANDROID_HOME: process.env.ANDROID_HOME
    || path.join(localAppData, 'Android', 'Sdk'),
};

function ensureSubstDrive() {
  const query = spawnSync('subst', [], { encoding: 'utf8', shell: true });
  const mapping = (query.stdout || '')
    .split(/\r?\n/)
    .find((line) => line.toUpperCase().startsWith(`${substDrive.toUpperCase()}\\`));

  if (mapping) {
    const target = mapping.split('=>')[1]?.trim() || '';
    if (path.resolve(target).toLowerCase() === frontedRoot.toLowerCase()) {
      return;
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
}

if (process.platform === 'win32') {
  ensureSubstDrive();
}

const buildMobileRoot = process.platform === 'win32'
  ? path.join(`${substDrive}\\`, mobileRelativePath)
  : mobileRoot;
const androidDir = path.join(buildMobileRoot, 'android');
const gradlew = path.join(
  androidDir,
  process.platform === 'win32' ? 'gradlew.bat' : 'gradlew',
);

console.log(`Usando Java en ${env.JAVA_HOME}`);
console.log(`Compilando APK debug desde ${androidDir}...`);

const result = spawnSync(
  `"${gradlew}"`,
  ['assembleDebug'],
  {
    cwd: androidDir,
    env,
    stdio: 'inherit',
    shell: true,
  },
);

if (result.status !== 0) {
  console.error('\nEl build debug falló.');
  process.exit(result.status ?? 1);
}

const debugApk = path.join(
  mobileRoot,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);

if (!fs.existsSync(debugApk)) {
  console.error(`No se encontró el APK en:\n${debugApk}`);
  process.exit(1);
}

const distDir = path.join(mobileRoot, 'dist');
const distApk = path.join(distDir, 'BuddyAI-debug.apk');

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(debugApk, distApk);

console.log('\nAPK debug lista:');
console.log(distApk);
