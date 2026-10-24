import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAssistantAudio } from '@beeapp/api-client';

import type { CommercialUiError } from './commercialErrors';
import { getValidSessionCredentials } from '../../services/authSession';
import {
    cancelAssistantRecording,
    startAssistantRecording,
    stopAssistantRecording,
} from '../../services/assistantAudio';
import {
    validateVoiceRecordingDuration,
    validateVoiceTranscript,
} from '../../services/voiceTranscriptValidation';

interface UseBuddyServicesAiSearchOptions {
    setSearch: (value: string) => void;
    runSearch: (value: string) => void;
    onSearched?: () => void;
    onError: (error: CommercialUiError) => void;
}

function voiceError(error: unknown, fallback: string): CommercialUiError {
    return {
        title: 'Búsqueda por voz',
        message: error instanceof Error ? error.message : fallback,
        retryable: false,
    };
}

export function useBuddyServicesAiSearch({
    setSearch,
    runSearch,
    onSearched,
    onError,
}: UseBuddyServicesAiSearchOptions) {
    const [listening, setListening] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const listeningRef = useRef(false);
    const transcribingRef = useRef(false);

    useEffect(() => () => {
        listeningRef.current = false;
        void cancelAssistantRecording();
    }, []);

    const toggleVoice = useCallback(async () => {
        if (transcribingRef.current) return;

        if (!listeningRef.current) {
            try {
                await startAssistantRecording();
                listeningRef.current = true;
                setListening(true);
            } catch (error) {
                listeningRef.current = false;
                setListening(false);
                onError(voiceError(
                    error,
                    'No se pudo usar el micrófono.',
                ));
            }
            return;
        }

        listeningRef.current = false;
        setListening(false);
        transcribingRef.current = true;
        setTranscribing(true);

        try {
            const { audioBase64, durationMs } = await stopAssistantRecording();
            const durationCheck = validateVoiceRecordingDuration(durationMs);
            if (!durationCheck.ok) {
                onError({
                    title: 'No se entendió el audio',
                    message: durationCheck.message,
                    retryable: false,
                });
                return;
            }

            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer') {
                onError({
                    title: 'Búsqueda por voz',
                    message: 'Tu sesión expiró. Inicia sesión nuevamente para buscar por voz.',
                    retryable: false,
                });
                return;
            }

            const transcript = await transcribeAssistantAudio(
                auth,
                audioBase64,
            );
            const validation = validateVoiceTranscript(transcript.text);
            if (!validation.ok) {
                onError({
                    title: 'No se entendió el audio',
                    message: validation.message,
                    retryable: false,
                });
                return;
            }

            setSearch(validation.text);
            runSearch(validation.text);
            onSearched?.();
        } catch (error) {
            onError(voiceError(
                error,
                'No se pudo transcribir el audio.',
            ));
        } finally {
            transcribingRef.current = false;
            setTranscribing(false);
        }
    }, [onError, onSearched, runSearch, setSearch]);

    return {
        listening,
        transcribing,
        toggleVoice,
    };
}
