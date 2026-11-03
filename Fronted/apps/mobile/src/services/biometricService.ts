import { Platform } from 'react-native';
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
    ].includes(error ?? '');
}

export function getBiometricErrorMessage(
    error?: string,
): string | null {
    if (!error || isCancellationError(error)) {
        return null;
    }

    const messages: Record<string, string> = {
        authentication_failed:
            'No se reconoció tu huella o rostro. Inténtalo de nuevo.',
        not_enrolled:
            'No hay huellas registradas en el teléfono. Agrégalas en Ajustes.',
        not_available:
            'La biometría no está disponible en este momento.',
        passcode_not_set:
            'Configura un bloqueo de pantalla en Ajustes para usar biometría.',
        lockout:
            'Demasiados intentos. Espera un momento e inténtalo otra vez.',
        lockout_permanent:
            'Biometría bloqueada. Usa el PIN del teléfono o cierra sesión.',
        unable_to_process:
            'No se pudo abrir el lector biométrico. Toca de nuevo.',
        no_space:
            'No hay espacio para guardar credenciales biométricas.',
        timeout:
            'Tiempo agotado. Toca de nuevo para desbloquear.',
    };

    return messages[error]
        ?? 'No fue posible verificar tu identidad. Inténtalo nuevamente.';
}

export async function authenticateWithBiometrics(
    method: BiometricMethod,
    ): Promise<BiometricAuthenticationResult> {
    const hardwareAvailable =
        await LocalAuthentication.hasHardwareAsync();

    if (!hardwareAvailable) {
        return {
            success: false,
            rejected: false,
            cancelled: true,
            error: 'not_available',
        };
    }

    const enrolled =
        await LocalAuthentication.isEnrolledAsync();

    if (!enrolled) {
        return {
            success: false,
            rejected: false,
            cancelled: true,
            error: 'not_enrolled',
        };
    }

    const promptMessage =
        method === 'faceid'
        ? 'Usa Face ID para desbloquear Buddy'
        : 'Usa tu huella dactilar para desbloquear Buddy';

    const result =
        await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar PIN del teléfono',
        disableDeviceFallback: Platform.OS === 'ios',
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