import {
    useEffect,
    useMemo,
    useState,
    } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
    } from 'react-native';
import {
    useLocalSearchParams,
    useRouter,
    } from 'expo-router';
import { confirmIntegrationOAuth } from '@beeapp/api-client';
import { colors } from '@beeapp/design-system';

import {
    getValidSessionCredentials,
    } from '../../src/services/authSession';


function getFirstParam(
    value: string | string[] | undefined,
    ): string {
    if (Array.isArray(value)) {
        return value[0] || '';
    }

    return value || '';
}


export default function IntegrationOAuthResultScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        outcome?: string | string[];
        detail?: string | string[];
        request_id?: string | string[];
        confirmation_token?: string | string[];
    }>();

    const outcome = getFirstParam(params.outcome);
    const detail = getFirstParam(params.detail);
    const requestId = getFirstParam(params.request_id);
    const confirmationToken = getFirstParam(
        params.confirmation_token,
    );

    const [confirmationState, setConfirmationState] = useState<
        'pending' | 'success' | 'failure'
    >(
        outcome === 'success'
        ? 'pending'
        : 'failure',
    );

    useEffect(() => {
        let cancelled = false;

        const confirmAuthorization = async () => {
            if (outcome !== 'success') {
                return;
            }

            if (!requestId || !confirmationToken) {
                if (!cancelled) {
                    setConfirmationState('failure');
                }
                return;
            }

            try {
                const auth = await getValidSessionCredentials();

                if (!auth) {
                    throw new Error('Missing active session.');
                }

                await confirmIntegrationOAuth(
                    requestId,
                    confirmationToken,
                    auth,
                );

                if (!cancelled) {
                    setConfirmationState('success');
                }
            } catch {
                if (!cancelled) {
                    setConfirmationState('failure');
                }
            }
        };

        void confirmAuthorization();

        return () => {
            cancelled = true;
        };
    }, [confirmationToken, outcome, requestId]);

    const message = useMemo(() => {
        if (
        outcome === 'success'
        && confirmationState === 'pending'
        ) {
        return 'Verificando la conexión segura...';
        }

        if (
        outcome === 'success'
        && confirmationState === 'success'
        ) {
        return 'Cuenta conectada. Actualizando integraciones...';
        }

        if (detail) {
        return (
            'No fue posible completar la conexión. '
            + 'Volviendo a integraciones...'
        );
        }

        return (
        'No fue posible confirmar la conexión. '
        + 'Volviendo a integraciones...'
        );
    }, [confirmationState, detail, outcome]);

    useEffect(() => {
        if (
        outcome === 'success'
        && confirmationState === 'pending'
        ) {
        return undefined;
        }

        const timeout = setTimeout(() => {
        router.replace('/(main)/profile/integrations');
        }, 1200);

        return () => clearTimeout(timeout);
    }, [confirmationState, outcome, router]);

    return (
        <View style={styles.container}>
        <View style={styles.card}>
            <Text style={styles.bee}>🐝</Text>

            <ActivityIndicator
            size="large"
            color={colors.brand.primary}
            />

            <Text style={styles.title}>
            Buddy Integraciones
            </Text>

            <Text style={styles.message}>
            {message}
            </Text>
        </View>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral.gray50,
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 32,
        gap: 14,
    },
    bee: {
        fontSize: 38,
        marginBottom: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.neutral.text,
    },
    message: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 19,
        textAlign: 'center',
        color: colors.neutral.gray600,
    },
});