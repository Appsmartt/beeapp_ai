import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import {
    getMailIntegrations,
    syncMail,
} from '@beeapp/api-client';
import type {
    MailIntegration,
    MailSyncIntegrationResult,
    MailSyncResponse,
} from '@beeapp/shared-types';

import {
    getValidSessionCredentials,
} from '../services/authSession';


export interface UseMailIntegrationsResult {
    integrations: MailIntegration[];
    lastSyncResultByIntegrationId: Record<
        string,
        MailSyncIntegrationResult
    >;
    loading: boolean;
    refreshing: boolean;
    syncingIntegrationId: string | null;
    error: string | null;
    loadMailIntegrations: (
        showRefresh?: boolean,
    ) => Promise<MailIntegration[]>;
    syncIntegration: (
        integrationId: string,
        options?: {
            forceFullSync?: boolean;
        },
    ) => Promise<MailSyncIntegrationResult>;
    clearError: () => void;
}


function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}


function replaceIntegration(
    integrations: MailIntegration[],
    updatedIntegration: MailIntegration,
): MailIntegration[] {
    const integrationExists = integrations.some(
        (integration) => integration.id === updatedIntegration.id,
    );

    if (!integrationExists) {
        return integrations;
    }

    return integrations.map((integration) => (
        integration.id === updatedIntegration.id
            ? updatedIntegration
            : integration
    ));
}


/**
 * Gestiona el estado operativo de las cuentas externas de Email.
 *
 * Endpoints utilizados:
 * - GET  /mail/integrations/
 * - POST /mail/sync/
 *
 * Esta capa no lee ni expone tokens OAuth. El backend usa la sesión
 * BeeApp para localizar las credenciales cifradas de cada cuenta.
 */
export function useMailIntegrations(): UseMailIntegrationsResult {
    const [integrations, setIntegrations] = useState<
        MailIntegration[]
    >([]);

    const [
        lastSyncResultByIntegrationId,
        setLastSyncResultByIntegrationId,
    ] = useState<Record<
        string,
        MailSyncIntegrationResult
    >>({});

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [
        syncingIntegrationId,
        setSyncingIntegrationId,
    ] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);


    const getAuthCredentials = useCallback(async () => {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
            throw new Error(
                'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        return credentials;
    }, []);


    const loadMailIntegrations = useCallback(async (
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

            const response = await getMailIntegrations(
                auth,
                {
                    include_inactive: true,
                },
            );

            setIntegrations(response.integrations);

            return response.integrations;
        } catch (loadError) {
            const message = getErrorMessage(
                loadError,
                'No fue posible cargar las cuentas de Email.',
            );

            setError(message);

            throw loadError;
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [
        getAuthCredentials,
    ]);


    const syncIntegration = useCallback(async (
        integrationId: string,
        options: {
            forceFullSync?: boolean;
        } = {},
    ) => {
        const normalizedIntegrationId = integrationId.trim();

        if (!normalizedIntegrationId) {
            throw new Error(
                'No fue posible identificar la cuenta de Email.',
            );
        }

        setSyncingIntegrationId(normalizedIntegrationId);
        setError(null);

        try {
            const auth = await getAuthCredentials();

            const response: MailSyncResponse = await syncMail(
                auth,
                {
                    integration_ids: [
                        normalizedIntegrationId,
                    ],
                    force_full_sync: Boolean(
                        options.forceFullSync,
                    ),
                },
            );

            const syncResult = response.results.find(
                (result) => (
                    result.integration_id
                    === normalizedIntegrationId
                ),
            );

            if (!syncResult) {
                const failure = response.failures.find(
                    (item) => (
                        item.integration_id
                        === normalizedIntegrationId
                    ),
                );

                throw new Error(
                    failure?.detail
                    || (
                        'La cuenta no pudo sincronizarse. '
                        + 'Verifica la autorización e inténtalo nuevamente.'
                    ),
                );
            }

            setLastSyncResultByIntegrationId(
                (currentResults) => ({
                    ...currentResults,
                    [normalizedIntegrationId]: syncResult,
                }),
            );

            const refreshedIntegrations = await loadMailIntegrations(
                true,
            );

            const refreshedIntegration = refreshedIntegrations.find(
                (integration) => (
                    integration.id === normalizedIntegrationId
                ),
            );

            if (refreshedIntegration) {
                setIntegrations((currentIntegrations) => (
                    replaceIntegration(
                        currentIntegrations,
                        refreshedIntegration,
                    )
                ));
            }

            return syncResult;
        } catch (syncError) {
            const message = getErrorMessage(
                syncError,
                'No fue posible sincronizar la cuenta de Email.',
            );

            setError(message);

            throw syncError;
        } finally {
            setSyncingIntegrationId((currentIntegrationId) => (
                currentIntegrationId === normalizedIntegrationId
                    ? null
                    : currentIntegrationId
            ));
        }
    }, [
        getAuthCredentials,
        loadMailIntegrations,
    ]);


    const clearError = useCallback(() => {
        setError(null);
    }, []);


    useEffect(() => {
        void loadMailIntegrations()
            .catch(() => {
                // El error se mantiene en el estado local del hook.
            });
    }, [
        loadMailIntegrations,
    ]);


    return {
        integrations,
        lastSyncResultByIntegrationId,
        loading,
        refreshing,
        syncingIntegrationId,
        error,
        loadMailIntegrations,
        syncIntegration,
        clearError,
    };
}