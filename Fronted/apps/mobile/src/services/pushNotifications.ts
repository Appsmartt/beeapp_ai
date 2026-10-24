import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type {
    NotificationClickEvent,
    NotificationWillDisplayEvent,
    OSNotification,
    } from 'react-native-onesignal';
import {
    getAuthSession,
    getValidSessionCredentials,
    } from './authSession';
import {
    registerPushDevice,
    } from '@beeapp/api-client';

const PUSH_REGISTRATION_MAX_ATTEMPTS = 5;
const PUSH_REGISTRATION_RETRY_DELAY_MS = 500;

type PushData = Record<string, unknown>;
type PushHandler = (data: PushData) => void;

type OneSignalApi = typeof import('react-native-onesignal').OneSignal;

let lastRegisteredRegistrationKey = '';
let registrationInFlight: Promise<string | null> | null = null;
let initialized = false;
let openedSerial = 0;
let deliveredOpenedSerial = 0;
let lastOpened: PushData | null = null;
let coldStartTimer: ReturnType<typeof setTimeout> | null = null;

const receivedListeners = new Set<PushHandler>();
const openedListeners = new Set<PushHandler>();
const callNotificationIds = new Map<string, number>();

function getOneSignalAppId(): string {
    return String(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '').trim();
}

/** false cuando el APK no trae App ID (OneSignal no inicializa). */
export function isPushNotificationsConfigured(): boolean {
    return Boolean(getOneSignalAppId());
}

function canUsePush(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getOneSignal(): OneSignalApi | null {
    if (!canUsePush()) {
        return null;
    }

    const imported = require('react-native-onesignal') as typeof import('react-native-onesignal');

    return imported.OneSignal;
}

function asPushData(value: unknown): PushData {
    if (
        value
        && typeof value === 'object'
        && !Array.isArray(value)
    ) {
        return value as PushData;
    }

    return {};
}

function rememberCallNotification(
    data: PushData,
    androidNotificationId: number | undefined,
): void {
    if (
        String(data.module || '').trim() !== 'calls'
        || String(data.type || '').trim() !== 'incoming_call'
        || typeof androidNotificationId !== 'number'
    ) {
        return;
    }

    const callId = String(data.call_id || '').trim();

    if (callId) {
        callNotificationIds.set(callId, androidNotificationId);
    }
}

function emitReceived(data: PushData): void {
    receivedListeners.forEach((listener) => {
        listener(data);
    });
}

function emitOpened(data: PushData): void {
    openedSerial += 1;
    lastOpened = data;

    if (openedListeners.size === 0) {
        return;
    }

    deliveredOpenedSerial = openedSerial;
    openedListeners.forEach((listener) => {
        listener(data);
    });
}

function deliverColdStartOpened(): void {
    if (
        !lastOpened
        || deliveredOpenedSerial === openedSerial
        || openedListeners.size === 0
    ) {
        return;
    }

    deliveredOpenedSerial = openedSerial;
    const data = lastOpened;
    openedListeners.forEach((listener) => {
        listener(data);
    });
}

function handleForeground(event: NotificationWillDisplayEvent): void {
    const notification = event.getNotification();
    const data = asPushData(notification.additionalData);

    rememberCallNotification(data, notification.androidNotificationId);
    emitReceived(data);
}

function handleClick(event: NotificationClickEvent): void {
    const notification: OSNotification = event.notification;
    const data = asPushData(notification.additionalData);

    rememberCallNotification(data, notification.androidNotificationId);
    emitOpened(data);
}

export function initializePushNotifications(): void {
    if (initialized || !canUsePush()) {
        return;
    }

    const appId = getOneSignalAppId();

    if (!appId) {
        return;
    }

    const oneSignal = getOneSignal();

    if (!oneSignal) {
        return;
    }

    oneSignal.initialize(appId);
    oneSignal.Notifications.addEventListener(
        'foregroundWillDisplay',
        handleForeground,
    );
    oneSignal.Notifications.addEventListener(
        'click',
        handleClick,
    );
    initialized = true;
}

export function subscribePushNotifications(handlers: {
    onReceived?: PushHandler;
    onOpened?: PushHandler;
}): () => void {
    initializePushNotifications();

    if (handlers.onReceived) {
        receivedListeners.add(handlers.onReceived);
    }

    if (handlers.onOpened) {
        openedListeners.add(handlers.onOpened);

        if (coldStartTimer) {
            clearTimeout(coldStartTimer);
        }

        coldStartTimer = setTimeout(() => {
            coldStartTimer = null;
            deliverColdStartOpened();
        }, 0);
    }

    return () => {
        if (handlers.onReceived) {
            receivedListeners.delete(handlers.onReceived);
        }

        if (handlers.onOpened) {
            openedListeners.delete(handlers.onOpened);
        }
    };
}

export function dismissIncomingCallNotification(callId: string): void {
    const oneSignal = getOneSignal();

    if (!oneSignal || !initialized) {
        return;
    }

    const androidNotificationId = callNotificationIds.get(callId);

    if (typeof androidNotificationId === 'number') {
        oneSignal.Notifications.removeNotification(androidNotificationId);
        callNotificationIds.delete(callId);
        return;
    }

    oneSignal.Notifications.clearAll();
}

export function logoutPush(): void {
    lastRegisteredRegistrationKey = '';
    callNotificationIds.clear();

    const oneSignal = getOneSignal();

    if (!oneSignal || !initialized) {
        return;
    }

    oneSignal.logout();
}

function getDeviceId(): string | undefined {
    const deviceId = (
        Constants.installationId
        || Constants.sessionId
        || ''
    ).trim();

    return deviceId || undefined;
}

function getAppVersion(): string | undefined {
    const version = String(
        Constants.expoConfig?.version
        || Constants.nativeAppVersion
        || '',
    ).trim();

    return version || undefined;
}

function waitForPushRegistrationRetry(
    attempt: number,
): Promise<void> {
    const delay = (
        PUSH_REGISTRATION_RETRY_DELAY_MS
        * attempt
    );

    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}

async function readSubscriptionId(
    oneSignal: OneSignalApi,
): Promise<string | null> {
    const subscriptionId = String(
        await oneSignal.User.pushSubscription.getIdAsync() || '',
    ).trim();

    return subscriptionId || null;
}

export async function registerCurrentDeviceForPushNotifications(): Promise<
    string | null
> {
    if (!canUsePush()) {
        return null;
    }

    if (registrationInFlight) {
        return registrationInFlight;
    }

    registrationInFlight = (async () => {
        try {
            initializePushNotifications();

            const oneSignal = getOneSignal();
            const appId = getOneSignalAppId();

            if (!oneSignal || !appId || !initialized) {
                return null;
            }

            const granted = await oneSignal.Notifications.requestPermission(
                true,
            );

            if (!granted) {
                return null;
            }

            const authSession = await getAuthSession();
            const userId = String(authSession?.user?.id || '').trim();
            const deviceSessionId = String(
                authSession?.deviceSessionId || '',
            ).trim();

            if (!userId || !deviceSessionId) {
                return null;
            }

            oneSignal.login(userId);
            oneSignal.User.pushSubscription.optIn();

            for (
                let attempt = 1;
                attempt <= PUSH_REGISTRATION_MAX_ATTEMPTS;
                attempt += 1
            ) {
                try {
                    const subscriptionId = await readSubscriptionId(
                        oneSignal,
                    );

                    if (!subscriptionId) {
                        throw new Error(
                            'OneSignal todavía no tiene subscription id.',
                        );
                    }

                    const registrationKey = [
                        deviceSessionId,
                        userId,
                        subscriptionId,
                    ].join(':');

                    if (
                        lastRegisteredRegistrationKey
                        === registrationKey
                    ) {
                        return subscriptionId;
                    }

                    const auth = await getValidSessionCredentials();

                    if (!auth) {
                        throw new Error(
                            'No hay una sesión válida para registrar push.',
                        );
                    }

                    await registerPushDevice(
                        auth,
                        {
                            onesignal_subscription_id: subscriptionId,
                            platform: Platform.OS === 'ios'
                                ? 'ios'
                                : 'android',
                            device_id: getDeviceId(),
                            device_session_id: deviceSessionId,
                            app_version: getAppVersion(),
                        },
                    );

                    lastRegisteredRegistrationKey = registrationKey;

                    return subscriptionId;
                } catch {
                    if (
                        attempt
                        < PUSH_REGISTRATION_MAX_ATTEMPTS
                    ) {
                        await waitForPushRegistrationRetry(
                            attempt,
                        );
                    }
                }
            }

            return null;
        } catch {
            return null;
        } finally {
            registrationInFlight = null;
        }
    })();

    return registrationInFlight;
}
