'use client';

import {
    useCallback,
    useEffect,
    useState,
    } from 'react';
import {
    ApiRequestError,
    deleteIntegrationConnectionRecord,
    disconnectIntegrationConnection,
    getIntegrationConnections,
    reauthorizeIntegrationConnection,
    startIntegrationAuthorization,
    } from '@beeapp/api-client';
import type {
    IntegrationCapability,
    IntegrationConnection,
    IntegrationProvider,
    } from '@beeapp/shared-types';

export interface UseWebIntegrationsResult {
    connections: IntegrationConnection[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    loadIntegrations: (
        showRefresh?: boolean,
    ) => Promise<void>;
    startAuthorization: (
        provider: IntegrationProvider,
        capabilities?: IntegrationCapability[],
    ) => Promise<string>;
    reauthorize: (
        connectionId: string,
        capabilities?: IntegrationCapability[],
    ) => Promise<string>;
    disconnect: (
        connectionId: string,
    ) => Promise<void>;
    removeConnectionRecord: (
        connectionId: string,
    ) => Promise<void>;
}

function getErrorMessage(error: unknown): string {
    if (
        error instanceof ApiRequestError
        && error.status === 401
    ) {
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'No fue posible completar la operación.';
}

export function useIntegrations(): UseWebIntegrationsResult {
    const [connections, setConnections] = useState<
        IntegrationConnection[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadIntegrations = useCallback(async (
        showRefresh = false,
    ) => {
        if (showRefresh) {
        setRefreshing(true);
        } else {
        setLoading(true);
        }

        setError(null);

        try {
        const response = await getIntegrationConnections();

        setConnections(response.connections);
        } catch (loadError) {
        setError(getErrorMessage(loadError));
        } finally {
        setLoading(false);
        setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadIntegrations();
    }, [loadIntegrations]);

    const startAuthorization = useCallback(async (
        provider: IntegrationProvider,
        capabilities: IntegrationCapability[] = [],
    ) => {
        const response = await startIntegrationAuthorization(
        provider,
        {
            capabilities,
            client_channel: 'web',
        },
        );

        return response.authorization_url;
    }, []);

    const reauthorize = useCallback(async (
        connectionId: string,
        capabilities: IntegrationCapability[] = [],
    ) => {
        const response = await reauthorizeIntegrationConnection(
        connectionId,
        capabilities,
        'web',
        );

        return response.authorization_url;
    }, []);

    const disconnect = useCallback(async (
        connectionId: string,
    ) => {
        await disconnectIntegrationConnection(connectionId);

        await loadIntegrations(true);
    }, [loadIntegrations]);

    const removeConnectionRecord = useCallback(async (
        connectionId: string,
    ) => {
        await deleteIntegrationConnectionRecord(connectionId);

        await loadIntegrations(true);
    }, [loadIntegrations]);

    return {
        connections,
        loading,
        refreshing,
        error,
        loadIntegrations,
        startAuthorization,
        reauthorize,
        disconnect,
        removeConnectionRecord,
    };
}