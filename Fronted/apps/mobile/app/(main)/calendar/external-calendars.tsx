import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    AlertTriangle,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Eye,
    EyeOff,
    Link2,
    RefreshCw,
    Settings2,
    ShieldCheck,
    } from 'lucide-react-native';
import {
    colors,
    } from '@beeapp/design-system';
import type {
    CalendarIntegration,
    ExternalCalendar,
    } from '@beeapp/shared-types';


import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
    useModuleNav,
    } from '../../../src/components/embedded/EmbeddedNavContext';
import {
    useCalendarIntegrations,
    } from '../../../src/hooks/useCalendarIntegrations';


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
        name: 'Google Calendar',
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
        name: 'Calendario externo',
        initial: 'C',
        color: colors.brand.primary,
    };
}


function getIntegrationAccountLabel(
    integration: CalendarIntegration,
    ): string {
    return (
        integration.provider_display_name
        || integration.provider_email
        || integration.provider_account_id
        || 'Cuenta conectada'
    );
}


function getIntegrationStatusLabel(
    integration: CalendarIntegration,
    ): string {
    if (integration.requires_reauthorization) {
        return 'Requiere reconexión';
    }

    if (integration.status === 'active' && integration.can_sync) {
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

    if (integration.sync_status === 'reauthorize') {
        return 'Requiere reconexión';
    }

    if (integration.sync_status === 'unavailable') {
        return 'Sin sincronización disponible';
    }

    return integration.status_reason || 'Estado no disponible';
}


function getIntegrationStatusColor(
    integration: CalendarIntegration,
    ): string {
    if (integration.requires_reauthorization) {
        return '#D97706';
    }

    if (integration.status === 'active' && integration.can_sync) {
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


function getCalendarColor(
    calendar: ExternalCalendar,
    ): string {
    return (
        calendar.display_color
        || calendar.provider_color
        || calendar.account_color
        || colors.brand.primary
    );
}


function getCalendarSubtitle(
    calendar: ExternalCalendar,
    ): string {
    const details: string[] = [];

    if (calendar.is_primary) {
        details.push('Principal');
    }

    if (calendar.access_level) {
        if (calendar.access_level === 'owner') {
        details.push('Propietario');
        } else if (calendar.access_level === 'read_write') {
        details.push('Lectura y escritura');
        } else if (calendar.access_level === 'read') {
        details.push('Solo lectura');
        } else if (calendar.access_level === 'free_busy') {
        details.push('Disponibilidad');
        }
    }

    if (calendar.timezone) {
        details.push(calendar.timezone);
    }

    return details.length > 0
        ? details.join(' · ')
        : 'Calendario externo';
}


function getErrorMessage(
    error: unknown,
    ): string {
    return error instanceof Error
        ? error.message
        : 'Inténtalo nuevamente.';
}


export default function ExternalCalendarsScreen() {
    const router = useModuleNav();

    const {
        integrations,
        loading,
        refreshing,
        loadingExternalIntegrationId,
        discoveringIntegrationId,
        updatingExternalCalendarId,
        error,
        loadCalendarIntegrations,
        loadExternalCalendars,
        discoverCalendars,
        updateExternalCalendar,
        getExternalCalendarsForIntegration,
        clearError,
    } = useCalendarIntegrations();

    const [expandedIntegrationIds, setExpandedIntegrationIds] =
        useState<string[]>([]);

    const activeIntegrations = useMemo(
        () => integrations.filter((integration) => (
        integration.provider === 'google'
        || integration.provider === 'microsoft'
        )),
        [integrations],
    );


    const handleRefresh = useCallback(async () => {
        try {
        const refreshedIntegrations = await loadCalendarIntegrations(
            true,
        );

        const expandedIds = expandedIntegrationIds.filter(
            (integrationId) => refreshedIntegrations.some(
            (integration) => integration.id === integrationId,
            ),
        );

        await Promise.all(
            expandedIds.map((integrationId) =>
            loadExternalCalendars(
                integrationId,
                {
                force: true,
                },
            ),
            ),
        );
        } catch {
        // El hook conserva el error para mostrarlo en la pantalla.
        }
    }, [
        expandedIntegrationIds,
        loadCalendarIntegrations,
        loadExternalCalendars,
    ]);


    useEffect(() => {
        if (activeIntegrations.length !== 1) {
        return;
        }

        const integration = activeIntegrations[0];

        setExpandedIntegrationIds((currentIds) => {
        if (currentIds.includes(integration.id)) {
            return currentIds;
        }

        return [
            ...currentIds,
            integration.id,
        ];
        });

        void loadExternalCalendars(integration.id)
        .catch(() => {
            // El hook conserva el error.
        });
    }, [
        activeIntegrations,
        loadExternalCalendars,
    ]);


    const handleToggleIntegration = async (
        integration: CalendarIntegration,
    ) => {
        const isExpanded = expandedIntegrationIds.includes(
        integration.id,
        );

        if (isExpanded) {
        setExpandedIntegrationIds((currentIds) =>
            currentIds.filter(
            (integrationId) =>
                integrationId !== integration.id,
            ),
        );

        return;
        }

        setExpandedIntegrationIds((currentIds) => [
        ...currentIds,
        integration.id,
        ]);

        try {
        await loadExternalCalendars(integration.id);
        } catch {
        // El hook conserva el error.
        }
    };


    const handleDiscoverCalendars = (
        integration: CalendarIntegration,
    ) => {
        const provider = getProviderPresentation(
        integration.provider,
        );

        Alert.alert(
        `Buscar calendarios de ${provider.name}`,
        (
            'BeeApp consultará los calendarios disponibles en esta '
            + 'cuenta. No se crearán ni importarán eventos todavía.'
        ),
        [
            {
            text: 'Cancelar',
            style: 'cancel',
            },
            {
            text: 'Buscar calendarios',
            onPress: () => {
                void (async () => {
                try {
                    const calendars = await discoverCalendars(
                    integration.id,
                    );

                    setExpandedIntegrationIds((currentIds) => (
                    currentIds.includes(integration.id)
                        ? currentIds
                        : [
                        ...currentIds,
                        integration.id,
                        ]
                    ));

                    Alert.alert(
                    'Calendarios actualizados',
                    calendars.length === 1
                        ? 'Se encontró 1 calendario externo.'
                        : (
                        `Se encontraron ${calendars.length} `
                        + 'calendarios externos.'
                        ),
                    );
                } catch (discoverError) {
                    Alert.alert(
                    'No fue posible buscar calendarios',
                    getErrorMessage(discoverError),
                    );
                }
                })();
            },
            },
        ],
        );
    };


    const handleSelectionChange = (
        calendar: ExternalCalendar,
        isSelected: boolean,
    ) => {
        void (async () => {
        try {
            await updateExternalCalendar(
            calendar.id,
            {
                is_selected: isSelected,
            },
            );
        } catch (updateError) {
            Alert.alert(
            'No fue posible actualizar el calendario',
            getErrorMessage(updateError),
            );
        }
        })();
    };


    const handleVisibilityChange = (
        calendar: ExternalCalendar,
    ) => {
        const nextVisibility = calendar.is_visible === 'visible'
        ? 'hidden'
        : 'visible';

        void (async () => {
        try {
            await updateExternalCalendar(
            calendar.id,
            {
                is_visible: nextVisibility,
            },
            );
        } catch (updateError) {
            Alert.alert(
            'No fue posible actualizar la visibilidad',
            getErrorMessage(updateError),
            );
        }
        })();
    };


    const renderExternalCalendar = (
        calendar: ExternalCalendar,
    ) => {
        const isUpdating = (
        updatingExternalCalendarId === calendar.id
        );

        const isVisible = calendar.is_visible === 'visible';

        return (
        <View
            key={calendar.id}
            style={styles.externalCalendarCard}
        >
            <View style={styles.externalCalendarTopRow}>
            <View
                style={[
                styles.calendarColorDot,
                {
                    backgroundColor: getCalendarColor(calendar),
                },
                ]}
            />

            <View style={styles.externalCalendarInfo}>
                <Text
                style={styles.externalCalendarName}
                numberOfLines={1}
                >
                {calendar.name}
                </Text>

                <Text
                style={styles.externalCalendarSubtitle}
                numberOfLines={1}
                >
                {getCalendarSubtitle(calendar)}
                </Text>
            </View>

            {isUpdating ? (
                <ActivityIndicator
                size="small"
                color={colors.brand.primary}
                />
            ) : (
                <TouchableOpacity
                style={styles.visibilityButton}
                onPress={() => handleVisibilityChange(calendar)}
                activeOpacity={0.7}
                >
                {isVisible ? (
                    <Eye
                    size={19}
                    color={colors.brand.primary}
                    />
                ) : (
                    <EyeOff
                    size={19}
                    color={colors.neutral.gray500}
                    />
                )}
                </TouchableOpacity>
            )}
            </View>

            {calendar.description ? (
            <Text
                style={styles.externalCalendarDescription}
                numberOfLines={2}
            >
                {calendar.description}
            </Text>
            ) : null}

            <View style={styles.externalCalendarPreferences}>
            <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>
                Usar en Agenda
                </Text>

                <Text style={styles.preferenceDescription}>
                {calendar.is_selected
                    ? 'Este calendario está disponible en BeeApp.'
                    : 'Este calendario no se usará en BeeApp.'}
                </Text>
            </View>

            <Switch
                value={calendar.is_selected}
                onValueChange={(value) => {
                handleSelectionChange(calendar, value);
                }}
                disabled={isUpdating}
                trackColor={{
                false: colors.neutral.gray300,
                true: '#C4B5FD',
                }}
                thumbColor={
                calendar.is_selected
                    ? colors.brand.primary
                    : colors.neutral.white
                }
            />
            </View>

            <View style={styles.visibilityStatusRow}>
            {isVisible ? (
                <Eye
                size={14}
                color="#16A34A"
                />
            ) : (
                <EyeOff
                size={14}
                color={colors.neutral.gray500}
                />
            )}

            <Text
                style={[
                styles.visibilityStatusText,
                {
                    color: isVisible
                    ? '#15803D'
                    : colors.neutral.gray600,
                },
                ]}
            >
                {isVisible
                ? 'Visible en Agenda'
                : 'Oculto en Agenda'}
            </Text>
            </View>
        </View>
        );
    };


    const renderIntegration = (
        integration: CalendarIntegration,
    ) => {
        const provider = getProviderPresentation(
        integration.provider,
        );

        const isExpanded = expandedIntegrationIds.includes(
        integration.id,
        );

        const isLoadingExternal = (
        loadingExternalIntegrationId === integration.id
        );

        const isDiscovering = (
        discoveringIntegrationId === integration.id
        );

        const calendars = getExternalCalendarsForIntegration(
        integration.id,
        );

        const statusColor = getIntegrationStatusColor(
        integration,
        );

        return (
        <View
            key={integration.id}
            style={styles.integrationCard}
        >
            <TouchableOpacity
            style={styles.integrationHeader}
            onPress={() => {
                void handleToggleIntegration(integration);
            }}
            activeOpacity={0.75}
            >
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

            {isLoadingExternal ? (
                <ActivityIndicator
                size="small"
                color={colors.brand.primary}
                />
            ) : isExpanded ? (
                <ChevronUp
                size={21}
                color={colors.neutral.gray500}
                />
            ) : (
                <ChevronDown
                size={21}
                color={colors.neutral.gray500}
                />
            )}
            </TouchableOpacity>

            {isExpanded ? (
            <View style={styles.integrationExpandedContent}>
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

                <View style={styles.discoveryRow}>
                <View style={styles.discoveryText}>
                    <Text style={styles.discoveryTitle}>
                    Calendarios disponibles
                    </Text>

                    <Text style={styles.discoveryDescription}>
                    Busca los calendarios de esta cuenta y elige
                    cuáles deseas usar en tu Agenda.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                    styles.discoveryButton,
                    (
                        !integration.can_sync
                        || isDiscovering
                    ) && styles.discoveryButtonDisabled,
                    ]}
                    onPress={() => {
                    handleDiscoverCalendars(integration);
                    }}
                    disabled={
                    !integration.can_sync
                    || isDiscovering
                    }
                    activeOpacity={0.8}
                >
                    {isDiscovering ? (
                    <ActivityIndicator
                        size="small"
                        color={colors.neutral.white}
                    />
                    ) : (
                    <RefreshCw
                        size={16}
                        color={colors.neutral.white}
                    />
                    )}

                    <Text style={styles.discoveryButtonText}>
                    {isDiscovering
                        ? 'Buscando...'
                        : 'Buscar'}
                    </Text>
                </TouchableOpacity>
                </View>

                {!integration.can_sync ? (
                <View style={styles.syncUnavailableBox}>
                    <AlertTriangle
                    size={17}
                    color="#B45309"
                    />

                    <Text style={styles.syncUnavailableText}>
                    Esta cuenta no puede sincronizar calendarios
                    ahora. Reconéctala desde Integraciones externas.
                    </Text>
                </View>
                ) : null}

                {isLoadingExternal ? (
                <View style={styles.externalLoading}>
                    <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                    />

                    <Text style={styles.externalLoadingText}>
                    Cargando calendarios...
                    </Text>
                </View>
                ) : calendars.length > 0 ? (
                <View style={styles.externalCalendarList}>
                    {calendars.map(renderExternalCalendar)}
                </View>
                ) : (
                <View style={styles.externalEmptyState}>
                    <CalendarDays
                    size={23}
                    color={colors.brand.primary}
                    />

                    <Text style={styles.externalEmptyTitle}>
                    Aún no hay calendarios descubiertos
                    </Text>

                    <Text style={styles.externalEmptyText}>
                    Usa “Buscar” para consultar los calendarios de
                    esta cuenta.
                    </Text>
                </View>
                )}
            </View>
            ) : null}
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
                Calendarios externos
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
                Cargando calendarios externos...
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
                    Configura tu Agenda
                    </Text>

                    <Text style={styles.introText}>
                    Descubre los calendarios de tus cuentas conectadas
                    y decide cuáles usar o mostrar en BeeApp.
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
                    Cuentas de calendario
                </Text>

                <Text style={styles.sectionCount}>
                    {activeIntegrations.length}
                </Text>
                </View>

                {activeIntegrations.length > 0 ? (
                <View style={styles.integrationList}>
                    {activeIntegrations.map(renderIntegration)}
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
                    No hay cuentas de calendario conectadas
                    </Text>

                    <Text style={styles.noIntegrationsText}>
                    Conecta Google o Microsoft desde Integraciones
                    externas para configurar sus calendarios aquí.
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
                    <Text style={styles.goToIntegrationsButtonText}>
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
                    BeeApp solo recibe la información necesaria para
                    mostrar tus calendarios. Las credenciales OAuth no
                    aparecen ni se guardan en esta pantalla.
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
    integrationExpandedContent: {
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
    discoveryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 13,
    },
    discoveryText: {
        flex: 1,
        paddingRight: 10,
    },
    discoveryTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.neutral.text,
        marginBottom: 3,
    },
    discoveryDescription: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        color: colors.neutral.gray600,
    },
    discoveryButton: {
        minWidth: 94,
        minHeight: 39,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        backgroundColor: colors.brand.primary,
        paddingHorizontal: 11,
    },
    discoveryButtonDisabled: {
        backgroundColor: colors.neutral.gray400,
    },
    discoveryButtonText: {
        fontSize: 11,
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
    externalLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        paddingVertical: 24,
    },
    externalLoadingText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral.gray600,
    },
    externalCalendarList: {
        gap: 10,
    },
    externalCalendarCard: {
        borderRadius: 15,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        backgroundColor: colors.neutral.white,
        padding: 13,
    },
    externalCalendarTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    externalCalendarInfo: {
        flex: 1,
        minWidth: 0,
    },
    externalCalendarName: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.neutral.text,
        marginBottom: 2,
    },
    externalCalendarSubtitle: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.neutral.gray500,
    },
    visibilityButton: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: colors.neutral.gray50,
        marginLeft: 8,
    },
    externalCalendarDescription: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        color: colors.neutral.gray600,
        marginTop: 10,
    },
    externalCalendarPreferences: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.neutral.gray100,
        paddingTop: 11,
        marginTop: 11,
    },
    preferenceText: {
        flex: 1,
        paddingRight: 12,
    },
    preferenceTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.neutral.text,
        marginBottom: 2,
    },
    preferenceDescription: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.neutral.gray600,
    },
    visibilityStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
    },
    visibilityStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    externalEmptyState: {
        alignItems: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.neutral.gray300,
        borderRadius: 15,
        backgroundColor: colors.neutral.white,
        paddingHorizontal: 22,
        paddingVertical: 23,
    },
    externalEmptyTitle: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        color: colors.neutral.text,
        marginTop: 10,
        marginBottom: 4,
    },
    externalEmptyText: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        textAlign: 'center',
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
        alignItems: 'center',
        justifyContent: 'center',
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