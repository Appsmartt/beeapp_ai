const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withMainApplication,
  withXcodeProject,
  IOSConfig,
} = require('@expo/config-plugins');

const CHANNEL_MARKER = 'createBuddyNotificationChannels';
const SOUND_FILE = 'incoming_call.mp3';

function soundSource(projectRoot) {
  return path.join(projectRoot, 'src', 'assets', 'sounds', SOUND_FILE);
}

function channelHelper() {
  return `
private fun createBuddyNotificationChannels(context: android.content.Context) {
  if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
    return
  }

  val manager = context.getSystemService(android.app.NotificationManager::class.java) ?: return
  val general = android.app.NotificationChannel(
    "default",
    "Notificaciones generales",
    android.app.NotificationManager.IMPORTANCE_HIGH,
  )
  general.description = "Avisos de correo, calendario, archivos y actividad de Buddy."
  general.enableVibration(true)
  general.vibrationPattern = longArrayOf(0, 250, 250, 250)
  general.enableLights(true)
  general.lightColor = 0xFF6025D2.toInt()
  manager.createNotificationChannel(general)

  val calls = android.app.NotificationChannel(
    "incoming-calls",
    "Llamadas entrantes",
    android.app.NotificationManager.IMPORTANCE_HIGH,
  )
  calls.description = "Avisos urgentes de llamadas entrantes de Buddy AI."
  calls.enableVibration(true)
  calls.vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 500)
  calls.enableLights(true)
  calls.lightColor = 0xFF6025D2.toInt()
  val sound = android.net.Uri.parse("android.resource://" + context.packageName + "/raw/incoming_call")
  val audio = android.media.AudioAttributes.Builder()
    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()
  calls.setSound(sound, audio)
  manager.createNotificationChannel(calls)
}
`;
}

function withAndroidChannels(config) {
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const rawDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw',
      );
      fs.mkdirSync(rawDir, { recursive: true });
      const source = soundSource(config.modRequest.projectRoot);

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(rawDir, SOUND_FILE));
      }

      return config;
    },
  ]);

  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes(CHANNEL_MARKER)) {
      return config;
    }

    contents = contents.replace(
      'super.onCreate()\n',
      `super.onCreate()\n    ${CHANNEL_MARKER}(this)\n`,
    );

    const closing = contents.lastIndexOf('\n}');

    if (closing !== -1) {
      contents = `${contents.slice(0, closing)}\n${channelHelper()}${contents.slice(closing)}`;
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

function withIosSound(config) {
  return withXcodeProject(config, (config) => {
    const source = soundSource(config.modRequest.projectRoot);
    const destination = path.join(
      config.modRequest.platformProjectRoot,
      SOUND_FILE,
    );

    if (!fs.existsSync(source)) {
      return config;
    }

    fs.copyFileSync(source, destination);

    const project = config.modResults;
    const alreadyAdded = project.hasFile
      ? project.hasFile(SOUND_FILE)
      : false;

    if (!alreadyAdded && IOSConfig.XcodeUtils.addResourceFileToGroup) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: destination,
        groupName: path.basename(config.modRequest.projectName || 'BuddyAI'),
        project,
        isBuildFile: true,
      });
    }

    return config;
  });
}

module.exports = function withNotificationChannels(config) {
  config = withAndroidChannels(config);
  config = withIosSound(config);
  return config;
};
