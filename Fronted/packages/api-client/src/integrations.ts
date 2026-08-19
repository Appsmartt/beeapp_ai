import type {
    AuthCredentials,
    GetIntegrationCatalogResponse,
    GetIntegrationConnectionResponse,
    GetIntegrationConnectionsResponse,
    IntegrationCapability,
    IntegrationOAuthClientChannel,
    IntegrationProvider,
    StartIntegrationAuthorizationPayload,
    StartIntegrationAuthorizationResponse,
    } from '@beeapp/shared-types';

import { api } from './client';

type IntegrationApiAuth = AuthCredentials | null;

function connectionPath(
    connectionId: string,
    ): string {
    return (
        '/integrations/connections/'
        + `${encodeURIComponent(connectionId)}/`
    );
}

function connectionRecordPath(
    connectionId: string,
    ): string {
    return `${connectionPath(connectionId)}record/`;
}

function buildAuthOptions(
    auth?: IntegrationApiAuth,
    ): { auth?: AuthCredentials } {
    return auth ? { auth } : {};
}

export function getIntegrationCatalog(
    auth?: IntegrationApiAuth,
    ): Promise<GetIntegrationCatalogResponse> {
    return api.get<GetIntegrationCatalogResponse>(
        '/integrations/catalog/',
        buildAuthOptions(auth),
    );
}

export function getIntegrationConnections(
    auth?: IntegrationApiAuth,
    ): Promise<GetIntegrationConnectionsResponse> {
    return api.get<GetIntegrationConnectionsResponse>(
        '/integrations/connections/',
        buildAuthOptions(auth),
    );
}

export function getIntegrationConnection(
    connectionId: string,
    auth?: IntegrationApiAuth,
    ): Promise<GetIntegrationConnectionResponse> {
    return api.get<GetIntegrationConnectionResponse>(
        connectionPath(connectionId),
        buildAuthOptions(auth),
    );
}

export function startIntegrationAuthorization(
    provider: IntegrationProvider,
    payload: StartIntegrationAuthorizationPayload = {},
    auth?: IntegrationApiAuth,
    ): Promise<StartIntegrationAuthorizationResponse> {
    return api.post<StartIntegrationAuthorizationResponse>(
        (
        '/integrations/connections/'
        + `${encodeURIComponent(provider)}/authorize/`
        ),
        payload,
        buildAuthOptions(auth),
    );
}

export function reauthorizeIntegrationConnection(
    connectionId: string,
    capabilities: IntegrationCapability[] = [],
    clientChannel: IntegrationOAuthClientChannel = 'mobile',
    auth?: IntegrationApiAuth,
    ): Promise<StartIntegrationAuthorizationResponse> {
    return api.post<StartIntegrationAuthorizationResponse>(
        `${connectionPath(connectionId)}reauthorize/`,
        {
        capabilities,
        client_channel: clientChannel,
        },
        buildAuthOptions(auth),
    );
}

export async function disconnectIntegrationConnection(
    connectionId: string,
    auth?: IntegrationApiAuth,
    ): Promise<void> {
    await api.delete<void>(
        connectionPath(connectionId),
        buildAuthOptions(auth),
    );
}

export async function deleteIntegrationConnectionRecord(
    connectionId: string,
    auth?: IntegrationApiAuth,
    ): Promise<void> {
    await api.delete<void>(
        connectionRecordPath(connectionId),
        buildAuthOptions(auth),
    );
}