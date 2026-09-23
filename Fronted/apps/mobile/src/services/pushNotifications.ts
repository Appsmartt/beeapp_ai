import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
    getAuthSession,
    getValidSessionCredentials,
    } from './authSession';
import {
    registerPushDevice,
    } from '@beeapp/api-client';

const ANDROID_NOTIFICATION_CHANNEL_ID = 'default';
const ANDROID_INCOMING_CALL_CHANNEL_ID = 'incoming-calls';

const PUSH_REGISTRATION_MAX_ATTEMPTS = 5;
const PUSH_REGISTRATION_RETRY_DELAY_MS = 500;

let lastRegisteredRegistrationKey = '';
let registrationInFlight: Promise<string | null> | null = null;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

function getEasProjectId(): string | null {
    const expoConfigProjectId = (
        Constants.expoConfig?.extra?.eas?.projectId
    );

    const easConfigProjectId = (
        Constants.easConfig?.projectId
    );

    const projectId = String(
        expoConfigProjectId
        || easConfigProjectId
        || '',
    ).trim();

    if (
        !projectId
        || projectId === 'TU_EAS_PROJECT_ID'
    ) {
        return null;
    }

    return projectId;
}

async function configureAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
        return;
    }

    await Notifications.setNotificationChannelAsync(
        ANDROID_NOTIFICATION_CHANNEL_ID,
        {
        name: 'Notificaciones generales',
        description: (
            'Avisos de correo, calendario, archivos y actividad de Buddy.'
        ),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6025D2',
        sound: 'default',
        lockscreenVisibility: (
            Notifications.AndroidNotificationVisibility.PUBLIC
        ),
        },
    );

    await Notifications.setNotificationChannelAsync(
        ANDROID_INCOMING_CALL_CHANNEL_ID,
        {
        name: 'Llamadas entrantes',
        description: (
            'Avisos urgentes de llamadas entrantes de BeeApp.'
        ),
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#6025D2',
        sound: 'default',
        lockscreenVisibility: (
            Notifications.AndroidNotificationVisibility.PUBLIC
        ),
        bypassDnd: false,
        },
    );
}

async function requestNotificationPermission(): Promise<boolean> {
    const currentPermissions = (
        await Notifications.getPermissionsAsync()
    );

    if (
        currentPermissions.granted
        || currentPermissions.ios?.status
        === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
        return true;
    }

    const requestedPermissions = (
        await Notifications.requestPermissionsAsync()
    );

    return (
        requestedPermissions.granted
        || requestedPermissions.ios?.status
        === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
}

async function getExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
        return null;
    }

    const projectId = getEasProjectId();

    if (!projectId) {
        return null;
    }

    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
        return null;
    }

    const tokenResponse = (
        await Notifications.getExpoPushTokenAsync({
        projectId,
        })
    );

    const token = tokenResponse.data.trim();

    return token || null;
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


export async function registerCurrentDeviceForPushNotifications(): Promise<
    string | null
    > {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return null;
    }

    if (registrationInFlight) {
        return registrationInFlight;
    }

    registrationInFlight = (async () => {
        try {
            await configureAndroidNotificationChannel();

            const expoPushToken = await getExpoPushToken();

            if (!expoPushToken) {
                return null;
            }

            const authSession = await getAuthSession();

            const deviceSessionId = String(
                authSession?.deviceSessionId || '',
            ).trim();

            if (!deviceSessionId) {
                return null;
            }

            const registrationKey = [
                deviceSessionId,
                expoPushToken,
            ].join(':');

            if (
                lastRegisteredRegistrationKey
                === registrationKey
            ) {
                return expoPushToken;
            }

            for (
                let attempt = 1;
                attempt <= PUSH_REGISTRATION_MAX_ATTEMPTS;
                attempt += 1
            ) {
                try {
                    const auth = await getValidSessionCredentials();

                    if (!auth) {
                        throw new Error(
                            'No hay una sesión válida para registrar push.',
                        );
                    }


                    await registerPushDevice(
                        auth,
                        {
                        expo_push_token: expoPushToken,
                        platform: Platform.OS,
                        device_id: getDeviceId(),
                        app_version: getAppVersion(),
                        },
                    );

                    lastRegisteredRegistrationKey = registrationKey;


                    return expoPushToken;
                } catch (error) {
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
        } catch (error) {

            return null;
        } finally {
            registrationInFlight = null;
        }
    })();

    return registrationInFlight;
}