import {
    useCallback,
    useEffect,
    useState,
    } from 'react';
import {
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

import {
    getValidSessionCredentials,
    } from '../services/authSession';


export interface UseIntegrationsResult {
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


async function getAuthCredentials() {
    const credentials = await getValidSessionCredentials();

    if (!credentials) {
        throw new Error(
        'Tu sesión expiró. Inicia sesión nuevamente.',
        );
    }

    return credentials;
}


export function useIntegrations(): UseIntegrationsResult {
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
        const auth = await getAuthCredentials();
        const response = await getIntegrationConnections(auth);

        setConnections(response.connections);
        } catch (loadError) {
        setError(
            loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar las integraciones.',
        );
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
        const auth = await getAuthCredentials();

        const response = await startIntegrationAuthorization(
        auth,
        provider,
        { capabilities },
        );

        return response.authorization_url;
    }, []);

    const reauthorize = useCallback(async (
        connectionId: string,
        capabilities: IntegrationCapability[] = [],
    ) => {
        const auth = await getAuthCredentials();

        const response = await reauthorizeIntegrationConnection(
        auth,
        connectionId,
        capabilities,
        );

        return response.authorization_url;
    }, []);

    const disconnect = useCallback(async (
        connectionId: string,
    ) => {
        const auth = await getAuthCredentials();

        await disconnectIntegrationConnection(
        auth,
        connectionId,
        );

        await loadIntegrations(true);
    }, [loadIntegrations]);

    const removeConnectionRecord = useCallback(async (
        connectionId: string,
    ) => {
        const auth = await getAuthCredentials();

        await deleteIntegrationConnectionRecord(
        auth,
        connectionId,
        );

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