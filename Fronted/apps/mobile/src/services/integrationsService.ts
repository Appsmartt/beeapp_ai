import type {
    IntegrationConnection,
    IntegrationConnectionStatus,
    IntegrationProvider,
    } from '@beeapp/shared-types';


export interface ProviderOption {
    provider: IntegrationProvider;
    name: string;
    description: string;
    iconLetter: string;
    iconColor: string;
    availability: 'available' | 'coming_soon';
    capabilitiesLabel: string;
    }


export interface IntegrationConnectionPresentation {
    id: string;
    provider: IntegrationProvider;
    providerName: string;
    providerIconLetter: string;
    providerIconColor: string;
    accountLabel: string;
    accountEmail: string | null;
    accountName: string | null;
    status: IntegrationConnectionStatus;
    statusLabel: string;
    statusColor: string;
    helperText: string;
    connection: IntegrationConnection;
    }


export const PROVIDER_OPTIONS: ProviderOption[] = [
    {
        provider: 'google',
        name: 'Google',
        description: (
        'Conecta Calendar, Gmail, Contactos y Drive '
        + 'cuando esos módulos estén disponibles.'
        ),
        iconLetter: 'G',
        iconColor: '#4285F4',
        availability: 'available',
        capabilitiesLabel: 'Calendar, Gmail y Contactos',
    },
    {
        provider: 'microsoft',
        name: 'Microsoft',
        description: (
        'Conecta Outlook, Microsoft 365 y servicios '
        + 'corporativos cuando la integración esté disponible.'
        ),
        iconLetter: 'M',
        iconColor: '#0078D4',
        availability: 'available',
        capabilitiesLabel: 'Outlook y Microsoft 365',
    },
];


export function getProviderOption(
    provider: IntegrationProvider,
    ): ProviderOption {
    return (
        PROVIDER_OPTIONS.find(
        (item) => item.provider === provider,
        )
        || {
        provider,
        name: 'Integración externa',
        description: 'Cuenta externa vinculada a BeeApp.',
        iconLetter: '•',
        iconColor: colorsForUnknownProvider(provider),
        availability: 'coming_soon',
        capabilitiesLabel: 'Servicios externos',
        }
    );
}


function colorsForUnknownProvider(
    provider: IntegrationProvider,
    ): string {
    const palette = [
        '#7C3AED',
        '#0891B2',
        '#059669',
        '#EA580C',
        '#DB2777',
    ];

    let hash = 0;

    for (let index = 0; index < provider.length; index += 1) {
        hash = (
        (hash << 5)
        - hash
        + provider.charCodeAt(index)
        ) | 0;
    }

    return palette[Math.abs(hash) % palette.length];
}


export function getConnectionAccountLabel(
    connection: IntegrationConnection,
    ): string {
    return (
        connection.provider_email
        || connection.provider_display_name
        || 'Cuenta vinculada'
    );
}


export function getConnectionStatusPresentation(
    status: IntegrationConnectionStatus,
    ): {
    label: string;
    color: string;
    helperText: string;
    } {
    switch (status) {
        case 'connected':
        return {
            label: 'Conectado',
            color: '#16A34A',
            helperText: 'Autorización cifrada y activa.',
        };

        case 'pending':
        return {
            label: 'Pendiente',
            color: '#D97706',
            helperText: 'La autorización todavía está en proceso.',
        };

        case 'reauth_required':
        return {
            label: 'Requiere reconexión',
            color: '#D97706',
            helperText: (
            'Vuelve a iniciar sesión para continuar '
            + 'usando esta cuenta.'
            ),
        };

        case 'revoked':
        return {
            label: 'Acceso revocado',
            color: '#DC2626',
            helperText: (
            'El proveedor revocó el acceso de BeeApp.'
            ),
        };

        case 'error':
        return {
            label: 'Error de conexión',
            color: '#DC2626',
            helperText: (
            'No fue posible usar esta autorización.'
            ),
        };

        case 'disconnected':
        return {
            label: 'Desconectado',
            color: '#64748B',
            helperText: (
            'Esta cuenta ya no tiene permisos en BeeApp.'
            ),
        };

        default:
        return {
            label: 'Estado desconocido',
            color: '#64748B',
            helperText: 'No fue posible determinar el estado.',
        };
    }
}


export function buildConnectionPresentations(
    connections: IntegrationConnection[],
    ): IntegrationConnectionPresentation[] {
    return [...connections]
        .sort((left, right) => (
        new Date(right.updated_at).getTime()
        - new Date(left.updated_at).getTime()
        ))
        .map((connection) => {
        const provider = getProviderOption(connection.provider);
        const status = getConnectionStatusPresentation(
            connection.status,
        );

        return {
            id: connection.id,
            provider: connection.provider,
            providerName: provider.name,
            providerIconLetter: provider.iconLetter,
            providerIconColor: provider.iconColor,
            accountLabel: getConnectionAccountLabel(connection),
            accountEmail: connection.provider_email,
            accountName: connection.provider_display_name,
            status: connection.status,
            statusLabel: status.label,
            statusColor: status.color,
            helperText: (
            connection.status === 'reauth_required'
            && connection.last_error_message
            )
            ? connection.last_error_message
            : status.helperText,
            connection,
        };
        });
}


export function isReconnectable(
    status: IntegrationConnectionStatus,
    ): boolean {
    return (
        status === 'disconnected'
        || status === 'reauth_required'
        || status === 'revoked'
        || status === 'error'
    );
}