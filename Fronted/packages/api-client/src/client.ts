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
    detail?: unknown;
    message?: unknown;
    error?: unknown;
    non_field_errors?: unknown;
    [key: string]: unknown;
}

export class ApiRequestError extends Error {
    readonly status: number;
    readonly endpoint: string;
    readonly body: ApiErrorResponse | null;

    constructor(
        message: string,
        status: number,
        endpoint: string,
        body: ApiErrorResponse | null = null,
    ) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.endpoint = endpoint;
        this.body = body;
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

function getDefaultCredentials(
    auth?: AuthCredentials | null,
    token?: string | null,
    ): RequestCredentials | undefined {
    if (auth?.token || token) {
        return undefined;
    }

    if (typeof window !== 'undefined') {
        return 'include';
    }

    return undefined;
}

function normalizeErrorValue(
    value: unknown,
    ): string | null {
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized || null;
    }

    if (typeof value === 'number') {
        return String(value);
    }

    if (Array.isArray(value)) {
        const messages = value
        .map((item) => normalizeErrorValue(item))
        .filter((
            item,
        ): item is string => Boolean(item));

        return messages.length > 0
        ? messages.join(', ')
        : null;
    }

    if (
        value
        && typeof value === 'object'
    ) {
        const nestedMessages = Object.entries(
        value as Record<string, unknown>,
        )
        .map(([key, nestedValue]) => {
            const nestedMessage = normalizeErrorValue(
            nestedValue,
            );

            return nestedMessage
            ? `${formatErrorFieldName(key)}: ${nestedMessage}`
            : null;
        })
        .filter((
            item,
        ): item is string => Boolean(item));

        return nestedMessages.length > 0
        ? nestedMessages.join(' · ')
        : null;
    }

    return null;
}

function formatErrorFieldName(
    fieldName: string,
    ): string {
    const labels: Record<string, string> = {
        to: 'Para',
        cc: 'CC',
        bcc: 'CCO',
        subject: 'Asunto',
        body: 'Mensaje',
        file_ids: 'Adjuntos',
        integration_id: 'Cuenta de correo',
        non_field_errors: 'Correo',
        detail: 'Correo',
    };

    return (
        labels[fieldName]
        || fieldName
        .replace(/_/g, ' ')
        .replace(/^./, (character) => (
            character.toUpperCase()
        ))
    );
}

function getErrorMessageFromBody(
    body: ApiErrorResponse | null,
    fallback: string,
    ): string {
    if (!body) {
        return fallback;
    }

    const prioritizedKeys = [
        'detail',
        'message',
        'error',
        'non_field_errors',
    ];

    for (const key of prioritizedKeys) {
        const message = normalizeErrorValue(body[key]);

        if (message) {
        return message;
        }
    }

    const fieldMessages = Object.entries(body)
        .filter(([key]) => (
        !prioritizedKeys.includes(key)
        ))
        .map(([key, value]) => {
        const message = normalizeErrorValue(value);

        return message
            ? `${formatErrorFieldName(key)}: ${message}`
            : null;
        })
        .filter((
        item,
        ): item is string => Boolean(item));

    return fieldMessages.length > 0
        ? fieldMessages.join(' · ')
        : fallback;
}

async function getErrorBody(
    response: Response,
    ): Promise<ApiErrorResponse | null> {
    try {
        const body = await response.json();

        if (
        body
        && typeof body === 'object'
        && !Array.isArray(body)
        ) {
        return body as ApiErrorResponse;
        }

        if (typeof body === 'string') {
        return {
            detail: body,
        };
        }
    } catch {
        // El backend puede responder sin JSON.
    }

    return null;
}

async function parseApiResponse<T>(
    response: Response,
    endpoint: string,
    ): Promise<T> {
    if (!response.ok) {
        const fallbackMessage = (
        `Error ${response.status}: backend request failed.`
        );

        const errorBody = await getErrorBody(response);

        throw new ApiRequestError(
        getErrorMessageFromBody(
            errorBody,
            fallbackMessage,
        ),
        response.status,
        endpoint,
        errorBody,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    try {
        return await response.json() as T;
    } catch {
        throw new ApiRequestError(
        'El backend respondió correctamente, pero devolvió JSON inválido.',
        response.status,
        endpoint,
        null,
        );
    }
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
        credentials,
        ...fetchOptions
    } = options;

    const hasJsonBody = body !== undefined;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        credentials: (
        credentials
        ?? getDefaultCredentials(auth, token)
        ),
        headers: {
        Accept: 'application/json',
        ...(hasJsonBody
            ? {
            'Content-Type': 'application/json',
            }
            : {}),
        ...getAuthorizationHeader(token, auth),
        ...headers,
        },
        body: hasJsonBody
        ? JSON.stringify(body)
        : undefined,
    });

    return parseApiResponse<T>(
        response,
        endpoint,
    );
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
        credentials,
        ...fetchOptions
    } = options;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        method: 'POST',
        credentials: (
        credentials
        ?? getDefaultCredentials(auth, token)
        ),
        headers: {
        Accept: 'application/json',
        ...getAuthorizationHeader(token, auth),
        },
        body: formData,
    });

    return parseApiResponse<T>(
        response,
        endpoint,
    );
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