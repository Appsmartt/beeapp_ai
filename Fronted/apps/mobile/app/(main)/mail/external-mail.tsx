import {
    useCallback,
    useMemo,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AlertTriangle,
    ChevronLeft,
    Link2,
    Mail,
    RefreshCw,
    RotateCw,
    Settings2,
    ShieldCheck,
} from 'lucide-react-native';
import {
    colors,
} from '@beeapp/design-system';
import type {
    MailIntegration,
    MailSyncIntegrationResult,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
    useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
    useMailIntegrations,
} from '../../../src/hooks/useMailIntegrations';


type ProviderPresentation = {
    name: string;
    initial: string;
    color: string;
};


function getProviderPresentation(
    provider: string,
): ProviderPresentation {
    if (provider === 'google') {
        return {
            name: 'Gmail',
            initial: 'G',
            color: '#4285F4',
        };
    }

    if (provider === 'microsoft') {
        return {
            name: 'Microsoft Outlook',
            initial: 'M',
            color: '#0078D4',
        };
    }

    return {
        name: 'Correo externo',
        initial: 'C',
        color: colors.brand.primary,
    };
}


function getIntegrationAccountLabel(
    integration: MailIntegration,
): string {
    return (
        integration.provider_email
        || integration.provider_display_name
        || integration.provider_account_id
        || 'Cuenta conectada'
    );
}


function getIntegrationStatusLabel(
    integration: MailIntegration,
): string {
    if (integration.requires_reauthorization) {
        return 'Requiere reconexión';
    }

    if (
        integration.status === 'active'
        && integration.can_sync
    ) {
        return 'Conectada y lista';
    }

    if (integration.status === 'pending') {
        return 'Conexión pendiente';
    }

    if (integration.status === 'disconnected') {
        return 'Cuenta desconectada';
    }

    if (integration.status === 'error') {
        return 'Error de conexión';
    }

    if (integration.status === 'inactive') {
        return 'Email no habilitado';
    }

    if (integration.sync_status === 'reauthorize') {
        return 'Requiere reconexión';
    }

    if (integration.sync_status === 'unavailable') {
        return 'Sin sincronización disponible';
    }

    return integration.status_reason || 'Estado no disponible';
}


function getIntegrationStatusColor(
    integration: MailIntegration,
): string {
    if (integration.requires_reauthorization) {
        return '#D97706';
    }

    if (
        integration.status === 'active'
        && integration.can_sync
    ) {
        return '#16A34A';
    }

    if (
        integration.status === 'error'
        || integration.status === 'disconnected'
    ) {
        return colors.semantic.error;
    }

    return colors.neutral.gray600;
}


function getErrorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'Inténtalo nuevamente.';
}


function formatDateTime(
    value: string | null,
): string | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(
        'es-CO',
        {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
        },
    ).format(date);
}


function isSyncWithoutChanges(
    result: MailSyncIntegrationResult,
): boolean {
    return (
        result.created_message_count === 0
        && result.updated_message_count === 0
        && result.skipped_message_count > 0
    );
}


function getSyncSummary(
    result: MailSyncIntegrationResult,
): string {
    if (isSyncWithoutChanges(result)) {
        return 'Sin cambios';
    }

    const parts = [
        `${result.created_message_count} nuevos`,
        `${result.updated_message_count} actualizados`,
    ];

    if (result.skipped_message_count > 0) {
        parts.push(
            `${result.skipped_message_count} omitidos`,
        );
    }

    return parts.join(' · ');
}


function getSyncDetail(
    result: MailSyncIntegrationResult,
): string {
    if (isSyncWithoutChanges(result)) {
        return (
            `${result.fetched_message_count} correos consultados. `
            + 'Tu cuenta ya está al día.'
        );
    }

    return (
        `${result.fetched_message_count} `
        + 'correos consultados.'
    );
}


function getSyncAlertMessage(
    result: MailSyncIntegrationResult,
): string {
    if (isSyncWithoutChanges(result)) {
        return (
            'Sin cambios.\n\n'
            + `${result.fetched_message_count} correos consultados. `
            + 'Tu cuenta ya está al día.'
        );
    }

    const parts = [
        `${result.created_message_count} nuevos`,
        `${result.updated_message_count} actualizados`,
    ];

    if (result.skipped_message_count > 0) {
        parts.push(
            `${result.skipped_message_count} omitidos`,
        );
    }

    return parts.join(' · ');
}


export default function ExternalMailScreen() {
    const router = useModuleNav();

    const {
        integrations,
        lastSyncResultByIntegrationId,
        loading,
        refreshing,
        syncingIntegrationId,
        error,
        loadMailIntegrations,
        syncIntegration,
        clearError,
    } = useMailIntegrations();


    const activeProviders = useMemo(
        () => integrations.filter((integration) => (
            integration.provider === 'google'
            || integration.provider === 'microsoft'
        )),
        [integrations],
    );


    const handleRefresh = useCallback(async () => {
        try {
            await loadMailIntegrations(true);
        } catch {
            // El hook conserva el error para mostrarlo en la pantalla.
        }
    }, [
        loadMailIntegrations,
    ]);


    const handleSyncIntegration = (
        integration: MailIntegration,
    ) => {
        if (!integration.can_sync) {
            Alert.alert(
                'Sincronización no disponible',
                (
                    integration.status_reason
                    || (
                        'Reconecta esta cuenta desde Integraciones '
                        + 'externas para sincronizarla.'
                    )
                ),
            );

            return;
        }

        const provider = getProviderPresentation(
            integration.provider,
        );

        Alert.alert(
            `Sincronizar ${provider.name}`,
            (
                'BeeApp consultará los correos recientes de esta '
                + 'cuenta y actualizará tu bandeja de entrada.'
            ),
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Sincronizar ahora',
                    onPress: () => {
                        void (async () => {
                            try {
                                const result = await syncIntegration(
                                    integration.id,
                                );

                                Alert.alert(
                                    'Sincronización completada',
                                    getSyncAlertMessage(result),
                                );
                            } catch (syncError) {
                                Alert.alert(
                                    'No fue posible sincronizar',
                                    getErrorMessage(syncError),
                                );
                            }
                        })();
                    },
                },
            ],
        );
    };


    const renderIntegration = (
        integration: MailIntegration,
    ) => {
        const provider = getProviderPresentation(
            integration.provider,
        );

        const isSyncing = (
            syncingIntegrationId === integration.id
        );

        const lastSyncResult = (
            lastSyncResultByIntegrationId[integration.id]
        );

        const statusColor = getIntegrationStatusColor(
            integration,
        );

        return (
            <View
                key={integration.id}
                style={styles.integrationCard}
            >
                <View style={styles.integrationHeader}>
                    <View
                        style={[
                            styles.providerAvatar,
                            {
                                backgroundColor: provider.color,
                            },
                        ]}
                    >
                        <Text style={styles.providerAvatarText}>
                            {provider.initial}
                        </Text>
                    </View>

                    <View style={styles.integrationInfo}>
                        <Text
                            style={styles.integrationProvider}
                            numberOfLines={1}
                        >
                            {provider.name}
                        </Text>

                        <Text
                            style={styles.integrationAccount}
                            numberOfLines={1}
                        >
                            {getIntegrationAccountLabel(integration)}
                        </Text>

                        <View style={styles.integrationStatusRow}>
                            <View
                                style={[
                                    styles.statusDot,
                                    {
                                        backgroundColor: statusColor,
                                    },
                                ]}
                            />

                            <Text
                                style={[
                                    styles.integrationStatus,
                                    {
                                        color: statusColor,
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {getIntegrationStatusLabel(integration)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.integrationContent}>
                    {integration.status_reason ? (
                        <View style={styles.integrationNotice}>
                            <AlertTriangle
                                size={16}
                                color="#B45309"
                            />

                            <Text style={styles.integrationNoticeText}>
                                {integration.status_reason}
                            </Text>
                        </View>
                    ) : null}

                    {integration.can_sync ? (
                        <TouchableOpacity
                            style={[
                                styles.syncButton,
                                isSyncing
                                    && styles.syncButtonDisabled,
                            ]}
                            onPress={() => {
                                handleSyncIntegration(integration);
                            }}
                            disabled={isSyncing}
                            activeOpacity={0.8}
                        >
                            {isSyncing ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.neutral.white}
                                />
                            ) : (
                                <RotateCw
                                    size={16}
                                    color={colors.neutral.white}
                                />
                            )}

                            <Text style={styles.syncButtonText}>
                                {isSyncing
                                    ? 'Sincronizando...'
                                    : 'Sincronizar correos'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <View style={styles.syncUnavailableBox}>
                                <AlertTriangle
                                    size={17}
                                    color="#B45309"
                                />

                                <Text style={styles.syncUnavailableText}>
                                    Esta cuenta no puede sincronizar correos
                                    ahora. Reconéctala desde Integraciones
                                    externas.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.goToIntegrationsButton}
                                onPress={() => {
                                    router.push(
                                        '/(main)/profile/integrations',
                                    );
                                }}
                                activeOpacity={0.8}
                            >
                                <Settings2
                                    size={16}
                                    color={colors.neutral.white}
                                />

                                <Text
                                    style={
                                        styles.goToIntegrationsButtonText
                                    }
                                >
                                    Ir a Integraciones
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {lastSyncResult ? (
                        <View style={styles.syncSummaryCard}>
                            <View style={styles.syncSummaryHeader}>
                                <RotateCw
                                    size={16}
                                    color="#15803D"
                                />

                                <Text style={styles.syncSummaryTitle}>
                                    Última sincronización en esta sesión
                                </Text>
                            </View>

                            <Text style={styles.syncSummaryText}>
                                {getSyncSummary(lastSyncResult)}
                            </Text>

                            <Text style={styles.syncSummaryDetail}>
                                {getSyncDetail(lastSyncResult)}
                            </Text>

                            {lastSyncResult.initial_sync ? (
                                <Text style={styles.initialSyncText}>
                                    Esta fue la sincronización inicial
                                    de la cuenta.
                                </Text>
                            ) : null}
                        </View>
                    ) : integration.last_successful_sync_at ? (
                        <View style={styles.lastSyncRow}>
                            <RotateCw
                                size={14}
                                color={colors.neutral.gray500}
                            />

                            <Text style={styles.lastSyncText}>
                                Última sincronización: {
                                    formatDateTime(
                                        integration.last_successful_sync_at,
                                    )
                                    || 'recientemente'
                                }
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.noSyncRow}>
                            <Mail
                                size={14}
                                color={colors.neutral.gray500}
                            />

                            <Text style={styles.noSyncText}>
                                Esta cuenta aún no se ha sincronizado.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };


    return (
        <ScreenSafeArea style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft
                            size={24}
                            color={colors.neutral.text}
                        />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>
                        Correo externo
                    </Text>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => {
                            void handleRefresh();
                        }}
                        disabled={refreshing}
                        activeOpacity={0.7}
                    >
                        {refreshing ? (
                            <ActivityIndicator
                                size="small"
                                color={colors.brand.primary}
                            />
                        ) : (
                            <RefreshCw
                                size={19}
                                color={colors.brand.primary}
                            />
                        )}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator
                            size="large"
                            color={colors.brand.primary}
                        />

                        <Text style={styles.loadingText}>
                            Cargando cuentas de correo...
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={(
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {
                                    void handleRefresh();
                                }}
                                tintColor={colors.brand.primary}
                            />
                        )}
                    >
                        <View style={styles.introCard}>
                            <View style={styles.introIcon}>
                                <Settings2
                                    size={22}
                                    color={colors.brand.primary}
                                />
                            </View>

                            <View style={styles.introContent}>
                                <Text style={styles.introTitle}>
                                    Configura tu correo
                                </Text>

                                <Text style={styles.introText}>
                                    Revisa el estado de tus cuentas conectadas.
                                    Cada sincronización consulta correos
                                    recientes y actualiza solo los elementos
                                    nuevos o cambiados.
                                </Text>
                            </View>
                        </View>

                        {error ? (
                            <TouchableOpacity
                                style={styles.errorBox}
                                onPress={() => {
                                    clearError();
                                    void handleRefresh();
                                }}
                                activeOpacity={0.8}
                            >
                                <AlertTriangle
                                    size={19}
                                    color="#B45309"
                                />

                                <View style={styles.errorContent}>
                                    <Text style={styles.errorTitle}>
                                        No fue posible actualizar
                                    </Text>

                                    <Text style={styles.errorText}>
                                        {error}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ) : null}

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Cuentas de correo
                            </Text>

                            <Text style={styles.sectionCount}>
                                {activeProviders.length}
                            </Text>
                        </View>

                        {activeProviders.length > 0 ? (
                            <View style={styles.integrationList}>
                                {activeProviders.map(renderIntegration)}
                            </View>
                        ) : (
                            <View style={styles.noIntegrationsCard}>
                                <View style={styles.noIntegrationsIcon}>
                                    <Link2
                                        size={25}
                                        color={colors.brand.primary}
                                    />
                                </View>

                                <Text style={styles.noIntegrationsTitle}>
                                    No hay cuentas de correo conectadas
                                </Text>

                                <Text style={styles.noIntegrationsText}>
                                    Conecta Google o Microsoft desde
                                    Integraciones externas para usar
                                    Gmail u Outlook en BeeApp.
                                </Text>

                                <TouchableOpacity
                                    style={styles.goToIntegrationsButton}
                                    onPress={() => {
                                        router.push(
                                            '/(main)/profile/integrations',
                                        );
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Settings2
                                        size={16}
                                        color={colors.neutral.white}
                                    />

                                    <Text
                                        style={
                                            styles.goToIntegrationsButtonText
                                        }
                                    >
                                        Ir a Integraciones
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.securityCard}>
                            <ShieldCheck
                                size={21}
                                color="#15803D"
                            />

                            <View style={styles.securityContent}>
                                <Text style={styles.securityTitle}>
                                    Tus credenciales permanecen protegidas
                                </Text>

                                <Text style={styles.securityText}>
                                    BeeApp solo recibe la información
                                    necesaria para mostrar y sincronizar
                                    tus correos. Las credenciales OAuth
                                    no aparecen ni se guardan en esta
                                    pantalla.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                )}
            </View>
        </ScreenSafeArea>
    );
}


const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.neutral.gray50,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.neutral.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    headerButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        color: colors.neutral.text,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.gray600,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    introCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#DDD6FE',
        backgroundColor: '#F3E8FF',
        padding: 15,
        marginBottom: 18,
    },
    introIcon: {
        width: 43,
        height: 43,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: colors.neutral.white,
        marginRight: 12,
    },
    introContent: {
        flex: 1,
    },
    introTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.neutral.text,
        marginBottom: 4,
    },
    introText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 17,
        color: colors.neutral.gray600,
    },
    errorBox: {
        flexDirection: 'row',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
        padding: 13,
        marginBottom: 18,
    },
    errorContent: {
        flex: 1,
    },
    errorTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#92400E',
        marginBottom: 3,
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 17,
        color: '#B45309',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: colors.neutral.gray600,
    },
    sectionCount: {
        minWidth: 23,
        height: 20,
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: '#F3E8FF',
        color: colors.brand.primary,
        fontSize: 11,
        fontWeight: '800',
        lineHeight: 20,
        textAlign: 'center',
    },
    integrationList: {
        gap: 12,
    },
    integrationCard: {
        overflow: 'hidden',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        backgroundColor: colors.neutral.white,
    },
    integrationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    providerAvatar: {
        width: 45,
        height: 45,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        marginRight: 12,
    },
    providerAvatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.neutral.white,
    },
    integrationInfo: {
        flex: 1,
        minWidth: 0,
    },
    integrationProvider: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.neutral.text,
        marginBottom: 2,
    },
    integrationAccount: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.neutral.gray600,
        marginBottom: 5,
    },
    integrationStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    integrationStatus: {
        fontSize: 11,
        fontWeight: '700',
    },
    integrationContent: {
        borderTopWidth: 1,
        borderTopColor: colors.neutral.gray100,
        padding: 14,
        backgroundColor: colors.neutral.gray50,
    },
    integrationNotice: {
        flexDirection: 'row',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
        padding: 11,
        marginBottom: 12,
    },
    integrationNoticeText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        color: '#92400E',
    },
    syncButton: {
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 12,
        backgroundColor: colors.brand.primary,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    syncButtonDisabled: {
        backgroundColor: colors.neutral.gray400,
    },
    syncButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.neutral.white,
    },
    syncUnavailableBox: {
        flexDirection: 'row',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
        padding: 11,
        marginBottom: 12,
    },
    syncUnavailableText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        color: '#92400E',
    },
    syncSummaryCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        backgroundColor: '#F0FDF4',
        padding: 11,
    },
    syncSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 5,
    },
    syncSummaryTitle: {
        flex: 1,
        fontSize: 11,
        fontWeight: '800',
        color: '#166534',
    },
    syncSummaryText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#166534',
        marginBottom: 3,
    },
    syncSummaryDetail: {
        fontSize: 10,
        fontWeight: '500',
        lineHeight: 15,
        color: '#15803D',
    },
    initialSyncText: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: '600',
        lineHeight: 15,
        color: '#15803D',
    },
    lastSyncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    lastSyncText: {
        flex: 1,
        fontSize: 10,
        fontWeight: '600',
        color: colors.neutral.gray600,
    },
    noSyncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    noSyncText: {
        flex: 1,
        fontSize: 10,
        fontWeight: '600',
        color: colors.neutral.gray600,
    },
    noIntegrationsCard: {
        alignItems: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.neutral.gray300,
        borderRadius: 19,
        backgroundColor: colors.neutral.white,
        paddingHorizontal: 25,
        paddingVertical: 28,
    },
    noIntegrationsIcon: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#F3E8FF',
        marginBottom: 12,
    },
    noIntegrationsTitle: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        color: colors.neutral.text,
        marginBottom: 6,
    },
    noIntegrationsText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 17,
        textAlign: 'center',
        color: colors.neutral.gray600,
    },
    goToIntegrationsButton: {
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 12,
        backgroundColor: colors.brand.primary,
        paddingHorizontal: 16,
        marginTop: 17,
    },
    goToIntegrationsButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.neutral.white,
    },
    securityCard: {
        flexDirection: 'row',
        gap: 11,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 16,
        backgroundColor: '#F0FDF4',
        padding: 14,
        marginTop: 20,
    },
    securityContent: {
        flex: 1,
    },
    securityTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#166534',
        marginBottom: 3,
    },
    securityText: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        color: '#166534',
    },
    bottomSpacer: {
        height: 48,
    },
});