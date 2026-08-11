import type {
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