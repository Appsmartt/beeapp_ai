import {
    useEffect,
    useMemo,
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
import { colors } from '@beeapp/design-system';


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
    }>();

    const outcome = getFirstParam(params.outcome);
    const detail = getFirstParam(params.detail);

    const message = useMemo(() => {
        if (outcome === 'success') {
        return 'Cuenta conectada. Actualizando integraciones...';
        }

        if (detail) {
        return (
            'No fue posible completar la conexión. '
            + 'Volviendo a integraciones...'
        );
        }

        return 'Volviendo a integraciones...';
    }, [detail, outcome]);

    useEffect(() => {
        const timeout = setTimeout(() => {
        router.replace('/(main)/profile/integrations');
        }, 900);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <View style={styles.container}>
        <View style={styles.card}>
            <Text style={styles.bee}>🐝</Text>

            <ActivityIndicator
            size="large"
            color={colors.brand.primary}
            />

            <Text style={styles.title}>
            BeeApp Integraciones
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