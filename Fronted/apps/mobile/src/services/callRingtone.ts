import {
  Audio,
  type AVPlaybackStatus,
} from 'expo-av';

const incomingCallSound = require(
  '../assets/sounds/incoming-call.mp3',
);

let ringtone: Audio.Sound | null = null;
let loadingRingtone: Promise<void> | null = null;

function isLoaded(
  status: AVPlaybackStatus,
): status is AVPlaybackStatus & {
  isLoaded: true;
} {
  return status.isLoaded;
}

export async function startIncomingCallRingtone(): Promise<void> {
  if (ringtone) {
    const status = await ringtone.getStatusAsync();

    if (isLoaded(status) && !status.isPlaying) {
      await ringtone.playAsync();
    }

    return;
  }

  if (loadingRingtone) {
    return loadingRingtone;
  }

  loadingRingtone = (async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
      });

      const created = await Audio.Sound.createAsync(
        incomingCallSound,
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        },
      );

      ringtone = created.sound;

      console.log('[VOX] Ringtone entrante iniciado.');
    } catch (error) {
      console.warn(
        '[VOX] No fue posible iniciar ringtone entrante.',
        error,
      );

      ringtone = null;
    } finally {
      loadingRingtone = null;
    }
  })();

  return loadingRingtone;
}

export async function stopIncomingCallRingtone(): Promise<void> {
  const currentRingtone = ringtone;

  ringtone = null;

  if (!currentRingtone) {
    return;
  }

  try {
    await currentRingtone.stopAsync();
  } catch {
    // Puede haberse detenido o descargado previamente.
  }

  try {
    await currentRingtone.unloadAsync();
  } catch {
    // La limpieza no debe afectar aceptar/rechazar/cerrar el modal.
  }

  console.log('[VOX] Ringtone entrante detenido.');
}
