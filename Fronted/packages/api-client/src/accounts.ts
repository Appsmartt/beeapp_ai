import type {
    GetCurrentProfileResponse,
    LoginUserPayload,
    LoginUserResponse,
    RegisterUserPayload,
    RegisterUserResponse,
    UpdateAssistantSettingsPayload,
    UpdateAssistantSettingsResponse,
    UpdateOnboardingProfilePayload,
    UpdateOnboardingProfileResponse,
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