import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { withExternalActivity } from './locationPermissionAppLockGuard';

let activeRecording: Audio.Recording | null = null;
let activeSound: Audio.Sound | null = null;
let recordingGate: Promise<void> = Promise.resolve();

const MIC_BUSY_MESSAGE = (
    'El micrófono sigue ocupado. Espera un momento e inténtalo de nuevo.'
);

function enqueueRecording<T>(task: () => Promise<T>): Promise<T> {
    const run = recordingGate.then(task, task);
    recordingGate = run.then(
        () => undefined,
        () => undefined,
    );
    return run;
}

function friendlyRecordingError(error: unknown): Error {
    const message = error instanceof Error ? error.message : '';

    if (/only one Recording object can be prepared/i.test(message)) {
        return new Error(MIC_BUSY_MESSAGE);
    }

    if (error instanceof Error && error.message.trim()) {
        return error;
    }

    return new Error('No se pudo usar el micrófono.');
}

async function stopAssistantSpeech(): Promise<void> {
    const sound = activeSound;
    activeSound = null;
    if (!sound) return;

    try {
        await sound.stopAsync();
    } catch {
        // El audio ya pudo haberse detenido.
    }

    try {
        await sound.unloadAsync();
    } catch {
        // El audio ya pudo haberse liberado.
    }
}

async function releaseRecording(
    recording: Audio.Recording | null,
): Promise<void> {
    if (!recording) return;

    try {
        await recording.stopAndUnloadAsync();
    } catch {
        // La grabación ya pudo haberse cerrado.
    }
}

export async function startAssistantRecording(): Promise<void> {
    return enqueueRecording(async () => {
        if (activeRecording) {
            return;
        }

        const permission = await withExternalActivity(() => (
            Audio.requestPermissionsAsync()
        ));
        if (!permission.granted) {
            throw new Error('Necesitamos el micrófono para escucharte.');
        }

        await stopAssistantSpeech();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        activeRecording = recording;

        try {
            await recording.prepareToRecordAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            await recording.startAsync();
        } catch (error) {
            if (activeRecording === recording) {
                activeRecording = null;
            }
            await releaseRecording(recording);
            throw friendlyRecordingError(error);
        }
    });
}

export type AssistantRecordingResult = {
    audioBase64: string;
    durationMs: number;
};

export async function stopAssistantRecording(): Promise<AssistantRecordingResult> {
    return enqueueRecording(async () => {
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

        try {
            await recording.stopAndUnloadAsync();
        } catch (error) {
            await releaseRecording(recording);
            throw friendlyRecordingError(error);
        }
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
    });
}

export async function playAssistantSpeech(audioBase64: string): Promise<void> {
    await stopAssistantSpeech();

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
    return enqueueRecording(async () => {
        const recording = activeRecording;
        activeRecording = null;
        await releaseRecording(recording);
    });
}
