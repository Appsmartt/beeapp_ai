import type {
    GetCurrentProfileResponse,
    GetDeviceSessionsResponse,
    LoginUserPayload,
    LoginUserResponse,
    QrLoginChallengeResponse,
    QrLoginChallengeStatusResponse,
    RegisterUserPayload,
    RegisterUserResponse,
    ScanQrLoginPayload,
    ScanQrLoginResponse,
    UpdateAssistantSettingsPayload,
    UpdateAssistantSettingsResponse,
    UpdateOnboardingProfilePayload,
    UpdateOnboardingProfileResponse,
    WebSessionProfileResponse,
    } from '@beeapp/shared-types';

import { api } from './client';


export function registerUser(
    payload: RegisterUserPayload,
    ): Promise<RegisterUserResponse> {
    return api.post<RegisterUserResponse>(
        '/accounts/register/',
        payload,
    );
}


export function loginUser(
    payload: LoginUserPayload,
    ): Promise<LoginUserResponse> {
    return api.post<LoginUserResponse>(
        '/accounts/login/',
        payload,
    );
}


export function getCurrentProfile(
    accessToken: string,
    ): Promise<GetCurrentProfileResponse> {
    return api.get<GetCurrentProfileResponse>(
        '/accounts/me/',
        {
        token: accessToken,
        },
    );
}


export function updateOnboardingProfile(
    accessToken: string,
    payload: UpdateOnboardingProfilePayload,
    ): Promise<UpdateOnboardingProfileResponse> {
    return api.patch<UpdateOnboardingProfileResponse>(
        '/accounts/me/profile/',
        payload,
        {
        token: accessToken,
        },
    );
}


export function updateAssistantSettings(
    accessToken: string,
    payload: UpdateAssistantSettingsPayload,
    ): Promise<UpdateAssistantSettingsResponse> {
    return api.patch<UpdateAssistantSettingsResponse>(
        '/accounts/me/assistant/',
        payload,
        {
        token: accessToken,
        },
    );
}


export function createQrLoginChallenge(): Promise<QrLoginChallengeResponse> {
    return api.post<QrLoginChallengeResponse>(
        '/accounts/qr-login/challenges/',
    );
}


export function getQrLoginChallengeStatus(
    challengeToken: string,
    ): Promise<QrLoginChallengeStatusResponse> {
    return api.get<QrLoginChallengeStatusResponse>(
        `/accounts/qr-login/challenges/${encodeURIComponent(
        challengeToken,
        )}/`,
    );
}


export function scanQrLogin(
    accessToken: string,
    payload: ScanQrLoginPayload,
    ): Promise<ScanQrLoginResponse> {
    return api.post<ScanQrLoginResponse>(
        '/accounts/qr-login/scan/',
        payload,
        {
        token: accessToken,
        },
    );
}


export function getDeviceSessions(
    accessToken: string,
    ): Promise<GetDeviceSessionsResponse> {
    return api.get<GetDeviceSessionsResponse>(
        '/accounts/me/devices/',
        {
        token: accessToken,
        },
    );
}


export async function revokeDeviceSession(
    accessToken: string,
    deviceId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/accounts/me/devices/${deviceId}/`,
        {
        token: accessToken,
        },
    );
}


export async function revokeAllDeviceSessions(
    accessToken: string,
    ): Promise<void> {
    await api.delete<void>(
        '/accounts/me/devices/others/',
        {
        token: accessToken,
        },
    );
}


export async function activateWebSession(
    challengeToken: string,
    ): Promise<void> {
    await api.post<void>(
        '/accounts/web-session/activate/',
        {
        challenge_token: challengeToken,
        },
        {
        credentials: 'include',
        },
    );
}


export function getWebSessionProfile(): Promise<WebSessionProfileResponse> {
    return api.get<WebSessionProfileResponse>(
        '/accounts/web-session/me/',
        {
        credentials: 'include',
        },
    );
}


export async function logoutWebSession(): Promise<void> {
    await api.post<void>(
        '/accounts/web-session/logout/',
        undefined,
        {
        credentials: 'include',
        },
    );
}