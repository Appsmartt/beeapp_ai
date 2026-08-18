import type {
    AuthCredentials,
    GetIntegrationCatalogResponse,
    GetIntegrationConnectionResponse,
    GetIntegrationConnectionsResponse,
    IntegrationCapability,
    IntegrationProvider,
    StartIntegrationAuthorizationPayload,
    StartIntegrationAuthorizationResponse,
    } from '@beeapp/shared-types';

import { api } from './client';


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


export function getIntegrationCatalog(
    auth: AuthCredentials,
    ): Promise<GetIntegrationCatalogResponse> {
    return api.get<GetIntegrationCatalogResponse>(
        '/integrations/catalog/',
        { auth },
    );
}


export function getIntegrationConnections(
    auth: AuthCredentials,
    ): Promise<GetIntegrationConnectionsResponse> {
    return api.get<GetIntegrationConnectionsResponse>(
        '/integrations/connections/',
        { auth },
    );
}


export function getIntegrationConnection(
    auth: AuthCredentials,
    connectionId: string,
    ): Promise<GetIntegrationConnectionResponse> {
    return api.get<GetIntegrationConnectionResponse>(
        connectionPath(connectionId),
        { auth },
    );
}


export function startIntegrationAuthorization(
    auth: AuthCredentials,
    provider: IntegrationProvider,
    payload: StartIntegrationAuthorizationPayload = {},
    ): Promise<StartIntegrationAuthorizationResponse> {
    return api.post<StartIntegrationAuthorizationResponse>(
        (
        '/integrations/connections/'
        + `${encodeURIComponent(provider)}/authorize/`
        ),
        payload,
        { auth },
    );
}


export function reauthorizeIntegrationConnection(
    auth: AuthCredentials,
    connectionId: string,
    capabilities: IntegrationCapability[] = [],
    ): Promise<StartIntegrationAuthorizationResponse> {
    return api.post<StartIntegrationAuthorizationResponse>(
        `${connectionPath(connectionId)}reauthorize/`,
        { capabilities },
        { auth },
    );
}


export async function disconnectIntegrationConnection(
    auth: AuthCredentials,
    connectionId: string,
    ): Promise<void> {
    await api.delete<void>(
        connectionPath(connectionId),
        { auth },
    );
}


export async function deleteIntegrationConnectionRecord(
    auth: AuthCredentials,
    connectionId: string,
    ): Promise<void> {
    await api.delete<void>(
        connectionRecordPath(connectionId),
        { auth },
    );
}