import {
    syncCalendarIntegration,
    syncMail,
    } from '@beeapp/api-client';
import type {
    IntegrationCapability,
    IntegrationConnection,
    } from '@beeapp/shared-types';

import {
    getValidSessionCredentials,
    } from './authSession';
import {
    markMailInboxesNeedReload,
    } from '../stores/mailStore';

const listeners = new Set<() => void>();

let revision = 0;
let mailProviderSyncedAt = 0;

function isReadyStatus(
    status: string,
    ): boolean {
    return status === 'connected' || status === 'active';
}

function wantsCapability(
    capabilities: IntegrationCapability[],
    capability: IntegrationCapability,
    ): boolean {
    return (
        capabilities.length === 0
        || capabilities.includes(capability)
    );
}

export function getConnectedAccountsSyncRevision(): number {
    return revision;
}

export function subscribeConnectedAccountsSynced(
    listener: () => void,
    ): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function hasRecentMailProviderSync(
    maxAgeMs: number,
    ): boolean {
    return (
        mailProviderSyncedAt > 0
        && Date.now() - mailProviderSyncedAt < maxAgeMs
    );
}

export function notifyConnectedAccountsSynced(): void {
    revision += 1;
    listeners.forEach((listener) => {
        listener();
    });
}

export async function syncJustConnectedAccounts(
    previous: IntegrationConnection[],
    next: IntegrationConnection[],
    ): Promise<void> {
    const previouslyReady = new Set(
        previous
        .filter((connection) => isReadyStatus(connection.status))
        .map((connection) => connection.id),
    );
    const justConnected = next.filter((connection) => (
        isReadyStatus(connection.status)
        && !previouslyReady.has(connection.id)
    ));

    if (justConnected.length === 0) {
        return;
    }

    const auth = await getValidSessionCredentials();

    if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
    }

    const failures: string[] = [];
    let syncedMail = false;
    let syncedAnything = false;

    await Promise.all(justConnected.map(async (connection) => {
        const jobs: Array<Promise<void>> = [];

        if (wantsCapability(connection.capabilities, 'mail')) {
            jobs.push((async () => {
                const response = await syncMail(auth, {
                    integration_ids: [connection.id],
                });
                const failure = response.failures.find(
                    (item) => item.detail,
                );

                if (response.failed_integration_count > 0) {
                    throw new Error(
                        failure?.detail
                        || 'No fue posible sincronizar el correo.',
                    );
                }

                syncedMail = true;
                syncedAnything = true;
            })());
        }

        if (wantsCapability(connection.capabilities, 'calendar')) {
            jobs.push((async () => {
                await syncCalendarIntegration(
                    auth,
                    connection.id,
                );
                syncedAnything = true;
            })());
        }

        const results = await Promise.allSettled(jobs);

        results.forEach((result) => {
            if (result.status === 'rejected') {
                failures.push(
                    result.reason instanceof Error
                    ? result.reason.message
                    : 'No fue posible sincronizar la cuenta.',
                );
            }
        });
    }));

    if (syncedMail) {
        mailProviderSyncedAt = Date.now();
        markMailInboxesNeedReload();
    }

    if (syncedAnything) {
        notifyConnectedAccountsSynced();
    }

    if (failures.length > 0) {
        throw new Error(failures[0]);
    }
}
