import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { withExternalActivity } from './locationPermissionAppLockGuard';

let activeRecording: Audio.Recording | null = null;
let activeSound: Audio.Sound | null = null;

export async function startAssistantRecording(): Promise<void> {
    const permission = await withExternalActivity(() => Audio.requestPermissionsAsync());
    if (!permission.granted) {
        throw new Error('Necesitamos el micrófono para escucharte.');
    }

    await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
    });
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    activeRecording = recording;
}

export type AssistantRecordingResult = {
    audioBase64: string;
    durationMs: number;
};

export async function stopAssistantRecording(): Promise<AssistantRecordingResult> {
    const recording = activeRecording;
    activeRecording = null;
    if (!recording) {
        throw new Error('No hay una grabación activa.');
    }

    let durationMs = 0;
    try {
        const status = await recording.getStatusAsync();
        if (
            status
            && typeof status.durationMillis === 'number'
        ) {
            durationMs = status.durationMillis;
        }
    } catch {
        // Si no hay estado, igual intentamos transcribir con duración 0.
    }

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
    });
    const uri = recording.getURI();
    if (!uri) {
        throw new Error('No se pudo guardar el audio.');
    }

    const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return {
        audioBase64,
        durationMs,
    };
}

export async function playAssistantSpeech(audioBase64: string): Promise<void> {
    if (activeSound) {
        await activeSound.unloadAsync();
        activeSound = null;
    }

    const uri = `${FileSystem.cacheDirectory}assistant-speech.mp3`;
    await FileSystem.writeAsStringAsync(uri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
    });
    const created = await Audio.Sound.createAsync({ uri });
    activeSound = created.sound;
    created.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
            void created.sound.unloadAsync();
            if (activeSound === created.sound) activeSound = null;
        }
    });
    await created.sound.playAsync();
}

export async function cancelAssistantRecording(): Promise<void> {
    const recording = activeRecording;
    activeRecording = null;
    if (!recording) return;
    try {
        await recording.stopAndUnloadAsync();
    } catch {
        // La grabación ya pudo haberse cerrado.
    }
}
