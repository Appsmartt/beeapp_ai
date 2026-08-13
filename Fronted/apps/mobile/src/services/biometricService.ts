import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricMethod =
    | 'fingerprint'
    | 'faceid';

export type BiometricAvailability = {
    fingerprint: boolean;
    faceid: boolean;
    hardwareAvailable: boolean;
    enrolled: boolean;
};

export type BiometricAuthenticationResult = {
    success: boolean;
    rejected: boolean;
    cancelled: boolean;
    error?: string;
};

function hasAuthenticationType(
    supportedTypes: LocalAuthentication.AuthenticationType[],
    type: LocalAuthentication.AuthenticationType,
    ): boolean {
    return supportedTypes.includes(type);
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
    const hardwareAvailable =
        await LocalAuthentication.hasHardwareAsync();

    if (!hardwareAvailable) {
        return {
        fingerprint: false,
        faceid: false,
        hardwareAvailable: false,
        enrolled: false,
        };
    }

    const enrolled =
        await LocalAuthentication.isEnrolledAsync();

    if (!enrolled) {
        return {
        fingerprint: false,
        faceid: false,
        hardwareAvailable: true,
        enrolled: false,
        };
    }

    const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
        fingerprint: hasAuthenticationType(
        supportedTypes,
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        ),
        faceid: hasAuthenticationType(
        supportedTypes,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        ),
        hardwareAvailable: true,
        enrolled: true,
    };
}

function isCancellationError(error?: string): boolean {
    return [
        'user_cancel',
        'system_cancel',
        'app_cancel',
        'not_enrolled',
        'not_available',
        'passcode_not_set',
    ].includes(error ?? '');
}

export async function authenticateWithBiometrics(
    method: BiometricMethod,
    ): Promise<BiometricAuthenticationResult> {
    const promptMessage =
        method === 'faceid'
        ? 'Usa Face ID para desbloquear BeeApp'
        : 'Usa tu huella dactilar para desbloquear BeeApp';

    const result =
        await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
        });

    if (result.success) {
        return {
        success: true,
        rejected: false,
        cancelled: false,
        };
    }

    const error = result.error;

    return {
        success: false,
        rejected: error === 'authentication_failed',
        cancelled: isCancellationError(error),
        error,
    };
}