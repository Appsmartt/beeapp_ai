import type {
    AuthCredentials,
    AssistantSettings,
    GetAssistantMessagesResponse,
    GetAssistantSettingsResponse,
    SendAssistantMessageResponse,
    } from '@beeapp/shared-types';

import { api } from './client';

export function getAssistantSettings(
    auth: AuthCredentials,
): Promise<GetAssistantSettingsResponse> {
    return api.get<GetAssistantSettingsResponse>('/assistant/settings/', { auth });
}

export function saveAssistantSettings(
    auth: AuthCredentials,
    payload: Partial<AssistantSettings>,
): Promise<GetAssistantSettingsResponse> {
    return api.patch<GetAssistantSettingsResponse>('/assistant/settings/', payload, { auth });
}

export function listAssistantMessages(
    auth: AuthCredentials,
): Promise<GetAssistantMessagesResponse> {
    return api.get<GetAssistantMessagesResponse>('/assistant/messages/', { auth });
}

export function sendAssistantMessage(
    auth: AuthCredentials,
    message: string,
    speak = false,
): Promise<SendAssistantMessageResponse> {
    return api.post<SendAssistantMessageResponse>('/assistant/messages/', {
        message,
        speak,
    }, { auth });
}

export function confirmAssistantAction(
    auth: AuthCredentials,
    actionId: string,
): Promise<SendAssistantMessageResponse> {
    return api.post<SendAssistantMessageResponse>(
        `/assistant/actions/${actionId}/confirm/`,
        {},
        { auth },
    );
}

export function cancelAssistantAction(
    auth: AuthCredentials,
    actionId: string,
): Promise<{ cancelled: boolean }> {
    return api.post<{ cancelled: boolean }>(
        `/assistant/actions/${actionId}/cancel/`,
        {},
        { auth },
    );
}

export function transcribeAssistantAudio(
    auth: AuthCredentials,
    audioBase64: string,
    mime = 'audio/m4a',
): Promise<{ text: string }> {
    return api.post<{ text: string }>('/assistant/voice/transcribe/', {
        audio_base64: audioBase64,
        mime,
    }, { auth });
}

export function speakAssistantText(
    auth: AuthCredentials,
    text: string,
): Promise<{ audio_base64: string; audio_mime: string }> {
    return api.post<{ audio_base64: string; audio_mime: string }>(
        '/assistant/voice/speak/',
        { text },
        { auth },
    );
}

export function askAssistantMail(
    auth: AuthCredentials,
    operation: 'draft' | 'summarize' | 'translate' | 'suggest_reply',
    payload: {
        subject?: string;
        from?: string;
        text?: string;
        prompt?: string;
        language?: string;
    },
): Promise<{ text: string }> {
    return api.post<{ text: string }>(`/assistant/mail/${operation}/`, payload, { auth });
}

export function clearAssistantMemory(
    auth: AuthCredentials,
): Promise<{ cleared: boolean }> {
    return api.delete<{ cleared: boolean }>('/assistant/memories/', { auth });
}
