const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function javaMajor(javaHome) {
  const javaBin = path.join(
    javaHome,
    'bin',
    process.platform === 'win32' ? 'java.exe' : 'java',
  );

  if (!fs.existsSync(javaBin)) {
    return null;
  }

  const result = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const text = `${result.stderr || ''}\n${result.stdout || ''}`;
  const match = text.match(/version "(?:1\.)?(\d+)/);

  return match ? Number(match[1]) : null;
}

function resolveAndroidJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Java\\jdk-17',
  ].filter(Boolean);

  for (const home of candidates) {
    const major = javaMajor(home);
    if (major === 17 || major === 21) {
      return home;
    }
  }

  console.error(
    'Este proyecto usa React Native 0.74 y Gradle 8.8. '
    + 'Necesitan Java 17 o 21. Java 25 no puede generar el APK.',
  );
  process.exit(1);
}

module.exports = {
  resolveAndroidJavaHome,
};
