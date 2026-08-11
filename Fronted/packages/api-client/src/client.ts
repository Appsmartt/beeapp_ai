const expoApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const nextApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const configuredApiBaseUrl = expoApiBaseUrl || nextApiBaseUrl;

if (!configuredApiBaseUrl) {
    throw new Error(
        `Backend URL is missing. EXPO_PUBLIC_API_BASE_URL=${String(
        expoApiBaseUrl
        )}, NEXT_PUBLIC_API_BASE_URL=${String(nextApiBaseUrl)}`
    );
}

export const API_BASE_URL: string = configuredApiBaseUrl;

export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    error?: string;
    [key: string]: unknown;
}

export interface ApiRequestOptions
    extends Omit<RequestInit, "body" | "headers"> {
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
}

function buildUrl(endpoint: string): string {
    const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
    const normalizedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    return `${normalizedBaseUrl}${normalizedEndpoint}`;
}

async function request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
    ): Promise<T> {
    const { body, token, headers, ...fetchOptions } = options;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        headers: {
        Accept: "application/json",
        ...(body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        let errorMessage = `Error ${response.status}: backend request failed.`;

        try {
        const errorData: ApiErrorResponse = await response.json();

        errorMessage =
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            errorMessage;
        } catch {
        // Keep the default message when the response is not JSON.
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const api = {
    get<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, "method"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "GET"
        });
    },

    post<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "POST",
        body
        });
    },

    put<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "PUT",
        body
        });
    },

    patch<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "PATCH",
        body
        });
    },

    delete<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, "method"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "DELETE"
        });
    }
};

export function getApiUrl(endpoint: string): string {
    return buildUrl(endpoint);
}