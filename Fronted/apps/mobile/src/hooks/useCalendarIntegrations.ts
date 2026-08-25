import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    discoverExternalCalendars,
    getCalendarIntegrations,
    getExternalCalendars,
    syncCalendarIntegration,
    updateExternalCalendarPreferences,
} from '@beeapp/api-client';
import type {
    CalendarIntegration,
    ExternalCalendar,
    ExternalCalendarVisibility,
    SyncCalendarIntegrationResponse,
} from '@beeapp/shared-types';

import {
    getValidSessionCredentials,
} from '../services/authSession';


export interface UseCalendarIntegrationsResult {
    integrations: CalendarIntegration[];
    externalCalendarsByIntegrationId: Record<
        string,
        ExternalCalendar[]
    >;
    lastSyncResultByIntegrationId: Record<
        string,
        SyncCalendarIntegrationResponse
    >;
    loading: boolean;
    refreshing: boolean;
    loadingExternalIntegrationId: string | null;
    discoveringIntegrationId: string | null;
    syncingIntegrationId: string | null;
    updatingExternalCalendarId: string | null;
    error: string | null;
    loadCalendarIntegrations: (
        showRefresh?: boolean,
    ) => Promise<CalendarIntegration[]>;
    loadExternalCalendars: (
        integrationId: string,
        options?: {
            force?: boolean;
        },
    ) => Promise<ExternalCalendar[]>;
    discoverCalendars: (
        integrationId: string,
    ) => Promise<ExternalCalendar[]>;
    syncIntegration: (
        integrationId: string,
        options?: {
            forceFullSync?: boolean;
        },
    ) => Promise<SyncCalendarIntegrationResponse>;
    updateExternalCalendar: (
        externalCalendarId: string,
        payload: {
            is_selected?: boolean;
            is_visible?: ExternalCalendarVisibility;
        },
    ) => Promise<ExternalCalendar>;
    getExternalCalendarsForIntegration: (
        integrationId: string,
    ) => ExternalCalendar[];
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


function replaceExternalCalendar(
    calendars: ExternalCalendar[],
    updatedCalendar: ExternalCalendar,
): ExternalCalendar[] {
    const calendarExists = calendars.some(
        (calendar) => calendar.id === updatedCalendar.id,
    );

    if (!calendarExists) {
        return [
            ...calendars,
            updatedCalendar,
        ];
    }

    return calendars.map((calendar) => (
        calendar.id === updatedCalendar.id
            ? updatedCalendar
            : calendar
    ));
}


function replaceIntegration(
    integrations: CalendarIntegration[],
    updatedIntegration: CalendarIntegration,
): CalendarIntegration[] {
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
 * Gestiona las integraciones externas y calendarios de Agenda.
 *
 * Endpoints utilizados:
 * - GET   /calendar/integrations/
 * - GET   /calendar/integrations/<integration_id>/external-calendars/
 * - POST  /calendar/integrations/<integration_id>/discover-calendars/
 * - POST  /calendar/integrations/<integration_id>/sync/
 * - PATCH /calendar/external-calendars/<external_calendar_id>/
 *
 * El cliente móvil solo utiliza la sesión Buddy. Los tokens OAuth se
 * mantienen exclusivamente en el backend y nunca se devuelven a esta UI.
 */
export function useCalendarIntegrations(): UseCalendarIntegrationsResult {
    const [integrations, setIntegrations] = useState<
        CalendarIntegration[]
    >([]);

    const [
        externalCalendarsByIntegrationId,
        setExternalCalendarsByIntegrationId,
    ] = useState<Record<string, ExternalCalendar[]>>(
        {},
    );

    const [
        lastSyncResultByIntegrationId,
        setLastSyncResultByIntegrationId,
    ] = useState<Record<
        string,
        SyncCalendarIntegrationResponse
    >>({});

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [
        loadingExternalIntegrationId,
        setLoadingExternalIntegrationId,
    ] = useState<string | null>(null);

    const [
        discoveringIntegrationId,
        setDiscoveringIntegrationId,
    ] = useState<string | null>(null);

    const [
        syncingIntegrationId,
        setSyncingIntegrationId,
    ] = useState<string | null>(null);

    const [
        updatingExternalCalendarId,
        setUpdatingExternalCalendarId,
    ] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    const externalCalendarRequestIds = useRef<
        Record<string, number>
    >({});

    const externalCalendarsCacheRef = useRef<
        Record<string, ExternalCalendar[]>
    >({});


    const getAuthCredentials = useCallback(async () => {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
            throw new Error(
                'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        return credentials;
    }, []);


    const setExternalCalendarsForIntegration = useCallback((
        integrationId: string,
        calendars: ExternalCalendar[],
    ) => {
        externalCalendarsCacheRef.current = {
            ...externalCalendarsCacheRef.current,
            [integrationId]: calendars,
        };

        setExternalCalendarsByIntegrationId(
            externalCalendarsCacheRef.current,
        );
    }, []);


    const loadCalendarIntegrations = useCallback(async (
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

            const response = await getCalendarIntegrations(auth);

            setIntegrations(response.integrations);

            return response.integrations;
        } catch (loadError) {
            const message = getErrorMessage(
                loadError,
                'No fue posible cargar las integraciones de Agenda.',
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


    const loadExternalCalendars = useCallback(async (
        integrationId: string,
        options: {
            force?: boolean;
        } = {},
    ) => {
        const normalizedIntegrationId = integrationId.trim();

        if (!normalizedIntegrationId) {
            throw new Error(
                'No fue posible identificar la integración de Agenda.',
            );
        }

        const cachedCalendars = (
            externalCalendarsCacheRef.current[
                normalizedIntegrationId
            ]
        );

        if (!options.force && cachedCalendars) {
            return cachedCalendars;
        }

        const requestId = (
            externalCalendarRequestIds.current[
                normalizedIntegrationId
            ] || 0
        ) + 1;

        externalCalendarRequestIds.current[
            normalizedIntegrationId
        ] = requestId;

        setLoadingExternalIntegrationId(
            normalizedIntegrationId,
        );

        setError(null);

        try {
            const auth = await getAuthCredentials();

            const response = await getExternalCalendars(
                auth,
                normalizedIntegrationId,
            );

            const fetchedCalendars = response.external_calendars;

            const requestIsCurrent = (
                externalCalendarRequestIds.current[
                    normalizedIntegrationId
                ] === requestId
            );

            if (!requestIsCurrent) {
                return (
                    externalCalendarsCacheRef.current[
                        normalizedIntegrationId
                    ] || fetchedCalendars
                );
            }

            setExternalCalendarsForIntegration(
                normalizedIntegrationId,
                fetchedCalendars,
            );

            return fetchedCalendars;
        } catch (loadError) {
            const message = getErrorMessage(
                loadError,
                'No fue posible cargar los calendarios externos.',
            );

            setError(message);

            throw loadError;
        } finally {
            setLoadingExternalIntegrationId((currentId) => (
                currentId === normalizedIntegrationId
                    ? null
                    : currentId
            ));
        }
    }, [
        getAuthCredentials,
        setExternalCalendarsForIntegration,
    ]);


    const discoverCalendars = useCallback(async (
        integrationId: string,
    ) => {
        const normalizedIntegrationId = integrationId.trim();

        if (!normalizedIntegrationId) {
            throw new Error(
                'No fue posible identificar la integración de Agenda.',
            );
        }

        setDiscoveringIntegrationId(normalizedIntegrationId);
        setError(null);

        try {
            const auth = await getAuthCredentials();

            const response = await discoverExternalCalendars(
                auth,
                normalizedIntegrationId,
            );

            setExternalCalendarsForIntegration(
                normalizedIntegrationId,
                response.external_calendars,
            );

            await loadCalendarIntegrations(true);

            return response.external_calendars;
        } catch (discoveryError) {
            const message = getErrorMessage(
                discoveryError,
                (
                    'No fue posible buscar calendarios en la '
                    + 'cuenta conectada.'
                ),
            );

            setError(message);

            throw discoveryError;
        } finally {
            setDiscoveringIntegrationId((currentId) => (
                currentId === normalizedIntegrationId
                    ? null
                    : currentId
            ));
        }
    }, [
        getAuthCredentials,
        loadCalendarIntegrations,
        setExternalCalendarsForIntegration,
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
                'No fue posible identificar la integración de Agenda.',
            );
        }

        setSyncingIntegrationId(normalizedIntegrationId);
        setError(null);

        try {
            const auth = await getAuthCredentials();

            const response = await syncCalendarIntegration(
                auth,
                normalizedIntegrationId,
                {
                    force_full_sync: Boolean(
                        options.forceFullSync,
                    ),
                },
            );

            setLastSyncResultByIntegrationId((currentResults) => ({
                ...currentResults,
                [normalizedIntegrationId]: response,
            }));

            setIntegrations((currentIntegrations) => (
                replaceIntegration(
                    currentIntegrations,
                    response.integration,
                )
            ));

            await loadExternalCalendars(
                normalizedIntegrationId,
                {
                    force: true,
                },
            );

            return response;
        } catch (syncError) {
            const message = getErrorMessage(
                syncError,
                'No fue posible sincronizar los calendarios externos.',
            );

            setError(message);

            throw syncError;
        } finally {
            setSyncingIntegrationId((currentId) => (
                currentId === normalizedIntegrationId
                    ? null
                    : currentId
            ));
        }
    }, [
        getAuthCredentials,
        loadExternalCalendars,
    ]);


    const updateExternalCalendar = useCallback(async (
        externalCalendarId: string,
        payload: {
            is_selected?: boolean;
            is_visible?: ExternalCalendarVisibility;
        },
    ) => {
        const normalizedExternalCalendarId = (
            externalCalendarId.trim()
        );

        if (!normalizedExternalCalendarId) {
            throw new Error(
                'No fue posible identificar el calendario externo.',
            );
        }

        if (
            payload.is_selected === undefined
            && payload.is_visible === undefined
        ) {
            throw new Error(
                'Selecciona una preferencia para actualizar.',
            );
        }

        setUpdatingExternalCalendarId(
            normalizedExternalCalendarId,
        );

        setError(null);

        try {
            const auth = await getAuthCredentials();

            const response = await updateExternalCalendarPreferences(
                auth,
                normalizedExternalCalendarId,
                payload,
            );

            const updatedCalendar = response.external_calendar;

            const currentCalendars = (
                externalCalendarsCacheRef.current[
                    updatedCalendar.integration_id
                ] || []
            );

            setExternalCalendarsForIntegration(
                updatedCalendar.integration_id,
                replaceExternalCalendar(
                    currentCalendars,
                    updatedCalendar,
                ),
            );

            return updatedCalendar;
        } catch (updateError) {
            const message = getErrorMessage(
                updateError,
                (
                    'No fue posible actualizar las preferencias '
                    + 'del calendario.'
                ),
            );

            setError(message);

            throw updateError;
        } finally {
            setUpdatingExternalCalendarId(null);
        }
    }, [
        getAuthCredentials,
        setExternalCalendarsForIntegration,
    ]);


    const getExternalCalendarsForIntegration = useCallback((
        integrationId: string,
    ) => {
        return (
            externalCalendarsByIntegrationId[integrationId] || []
        );
    }, [
        externalCalendarsByIntegrationId,
    ]);


    const clearError = useCallback(() => {
        setError(null);
    }, []);


    useEffect(() => {
        void loadCalendarIntegrations()
            .catch(() => {
                // El mensaje ya se conserva en el estado error del hook.
            });
    }, [
        loadCalendarIntegrations,
    ]);


    return {
        integrations,
        externalCalendarsByIntegrationId,
        lastSyncResultByIntegrationId,
        loading,
        refreshing,
        loadingExternalIntegrationId,
        discoveringIntegrationId,
        syncingIntegrationId,
        updatingExternalCalendarId,
        error,
        loadCalendarIntegrations,
        loadExternalCalendars,
        discoverCalendars,
        syncIntegration,
        updateExternalCalendar,
        getExternalCalendarsForIntegration,
        clearError,
    };
}