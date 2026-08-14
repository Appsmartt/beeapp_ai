import type {
    AuthCredentials,
    AuthScheme,
    } from '@beeapp/shared-types';

const expoApiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL;

const nextApiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL;

const configuredApiBaseUrl =
    expoApiBaseUrl || nextApiBaseUrl;

if (!configuredApiBaseUrl) {
    throw new Error(
        'Backend URL is missing. '
        + 'EXPO_PUBLIC_API_BASE_URL or '
        + 'NEXT_PUBLIC_API_BASE_URL must be defined.',
    );
}

export const API_BASE_URL: string =
    configuredApiBaseUrl;

export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    error?: string;
    [key: string]: unknown;
}

export class ApiRequestError extends Error {
    readonly status: number;

    constructor(
        message: string,
        status: number,
    ) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
    }
}

export interface ApiRequestOptions
    extends Omit<RequestInit, 'body' | 'headers'> {
    body?: unknown;
    token?: string | null;
    auth?: AuthCredentials | null;
    headers?: Record<string, string>;
}

function buildUrl(endpoint: string): string {
    const normalizedBaseUrl =
        API_BASE_URL.replace(/\/$/, '');

    const normalizedEndpoint =
        endpoint.startsWith('/')
        ? endpoint
        : `/${endpoint}`;

    return `${normalizedBaseUrl}${normalizedEndpoint}`;
}

function getAuthorizationHeader(
    token?: string | null,
    auth?: AuthCredentials | null,
    ): Record<string, string> {
    if (auth?.token) {
        return {
        Authorization: `${auth.scheme} ${auth.token}`,
        };
    }

    if (token) {
        return {
        Authorization: `Bearer ${token}`,
        };
    }

    return {};
}

async function parseApiResponse<T>(
    response: Response,
    ): Promise<T> {
    if (!response.ok) {
        let errorMessage =
        `Error ${response.status}: backend request failed.`;

        try {
        const errorData =
            await response.json() as ApiErrorResponse;

        errorMessage =
            errorData.detail
            || errorData.message
            || errorData.error
            || errorMessage;
        } catch {
        // Response may not contain JSON.
        }

        throw new ApiRequestError(
        errorMessage,
        response.status,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

async function request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
    ): Promise<T> {
    const {
        body,
        token,
        auth,
        headers,
        ...fetchOptions
    } = options;

    const hasJsonBody = body !== undefined;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        headers: {
        Accept: 'application/json',
        ...(hasJsonBody
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...getAuthorizationHeader(token, auth),
        ...headers,
        },
        body: hasJsonBody
        ? JSON.stringify(body)
        : undefined,
    });

    return parseApiResponse<T>(response);
}

async function upload<T>(
    endpoint: string,
    formData: FormData,
    options: Omit<
        ApiRequestOptions,
        'method' | 'body' | 'headers'
    > = {},
    ): Promise<T> {
    const {
        token,
        auth,
        ...fetchOptions
    } = options;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        method: 'POST',
        headers: {
        Accept: 'application/json',
        ...getAuthorizationHeader(token, auth),
        },
        body: formData,
    });

    return parseApiResponse<T>(response);
}

export const api = {
    get<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, 'method'> = {},
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: 'GET',
        });
    },

    post<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<
        ApiRequestOptions,
        'method' | 'body'
        > = {},
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: 'POST',
        body,
        });
    },

    put<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<
        ApiRequestOptions,
        'method' | 'body'
        > = {},
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: 'PUT',
        body,
        });
    },

    patch<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<
        ApiRequestOptions,
        'method' | 'body'
        > = {},
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body,
        });
    },

    delete<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, 'method'> = {},
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: 'DELETE',
        });
    },

    upload,
};

export function getApiUrl(endpoint: string): string {
    return buildUrl(endpoint);
}

export function createAuthCredentials(
    token: string,
    scheme: AuthScheme = 'Bearer',
    ): AuthCredentials {
    return {
        token,
        scheme,
    };
}