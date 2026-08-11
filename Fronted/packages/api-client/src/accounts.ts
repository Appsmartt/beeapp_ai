import type {
    LoginUserPayload,
    LoginUserResponse,
    RegisterUserPayload,
    RegisterUserResponse,
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