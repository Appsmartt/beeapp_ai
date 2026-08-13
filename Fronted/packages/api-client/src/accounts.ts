import type {
    AuthCredentials,
    GetCurrentProfileResponse,
    GetDeviceSessionsResponse,
    LoginUserPayload,
    LoginUserResponse,
    PasswordResetConfirmPayload,
    PasswordResetConfirmResponse,
    PasswordResetRequestPayload,
    PasswordResetRequestResponse,
    PasswordResetVerifyPayload,
    PasswordResetVerifyResponse,
    QrLoginChallengeResponse,
    QrLoginChallengeStatusResponse,
    RegisterUserPayload,
    RegisterUserResponse,
    RequestPhoneOtpPayload,
    RequestPhoneOtpResponse,
    ScanQrLoginPayload,
    ScanQrLoginResponse,
    UpdateAssistantSettingsPayload,
    UpdateAssistantSettingsResponse,
    UpdateOnboardingProfilePayload,
    UpdateOnboardingProfileResponse,
    VerifyPhoneOtpMobileResponse,
    VerifyPhoneOtpPayload,
    WebSessionProfileResponse,
    RefreshSessionPayload,
    RefreshSessionResponse,
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

export function refreshSession(
    payload: RefreshSessionPayload,
    ): Promise<RefreshSessionResponse> {
    return api.post<RefreshSessionResponse>(
        '/accounts/session/refresh/',
        payload,
    );
}


export function requestPhoneOtp(
    payload: RequestPhoneOtpPayload,
    ): Promise<RequestPhoneOtpResponse> {
    return api.post<RequestPhoneOtpResponse>(
        '/accounts/login/phone/request-otp/',
        payload,
    );
}


export function verifyPhoneOtpMobile(
    payload: VerifyPhoneOtpPayload,
    ): Promise<VerifyPhoneOtpMobileResponse> {
    return api.post<VerifyPhoneOtpMobileResponse>(
        '/accounts/login/phone/verify-otp/mobile/',
        payload,
    );
}


export function requestPasswordReset(
    payload: PasswordResetRequestPayload,
    ): Promise<PasswordResetRequestResponse> {
    return api.post<PasswordResetRequestResponse>(
        '/accounts/password-reset/request/',
        payload,
    );
}


export function verifyPasswordReset(
    payload: PasswordResetVerifyPayload,
    ): Promise<PasswordResetVerifyResponse> {
    return api.post<PasswordResetVerifyResponse>(
        '/accounts/password-reset/verify/',
        payload,
    );
}


export function confirmPasswordReset(
    payload: PasswordResetConfirmPayload,
    ): Promise<PasswordResetConfirmResponse> {
    return api.post<PasswordResetConfirmResponse>(
        '/accounts/password-reset/confirm/',
        payload,
    );
}


export function getCurrentProfile(
    auth: AuthCredentials,
    ): Promise<GetCurrentProfileResponse> {
    return api.get<GetCurrentProfileResponse>(
        '/accounts/me/',
        {
        auth,
        },
    );
}


export function updateOnboardingProfile(
    auth: AuthCredentials,
    payload: UpdateOnboardingProfilePayload,
    ): Promise<UpdateOnboardingProfileResponse> {
    return api.patch<UpdateOnboardingProfileResponse>(
        '/accounts/me/profile/',
        payload,
        {
        auth,
        },
    );
}


export function updateAssistantSettings(
    auth: AuthCredentials,
    payload: UpdateAssistantSettingsPayload,
    ): Promise<UpdateAssistantSettingsResponse> {
    return api.patch<UpdateAssistantSettingsResponse>(
        '/accounts/me/assistant/',
        payload,
        {
        auth,
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
    auth: AuthCredentials,
    payload: ScanQrLoginPayload,
    ): Promise<ScanQrLoginResponse> {
    return api.post<ScanQrLoginResponse>(
        '/accounts/qr-login/scan/',
        payload,
        {
        auth,
        },
    );
}


export function getDeviceSessions(
    auth: AuthCredentials,
    ): Promise<GetDeviceSessionsResponse> {
    return api.get<GetDeviceSessionsResponse>(
        '/accounts/me/devices/',
        {
        auth,
        },
    );
}


export async function revokeDeviceSession(
    auth: AuthCredentials,
    deviceId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/accounts/me/devices/${deviceId}/`,
        {
        auth,
        },
    );
}


export async function revokeAllDeviceSessions(
    auth: AuthCredentials,
    ): Promise<void> {
    await api.delete<void>(
        '/accounts/me/devices/others/',
        {
        auth,
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