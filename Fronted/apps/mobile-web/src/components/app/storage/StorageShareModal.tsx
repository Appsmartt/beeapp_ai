'use client';

import {
    useEffect,
    useMemo,
    useState,
    } from 'react';
import {
    ActivityIndicator,
    } from 'react';
import {
    Mail,
    Search,
    Share2,
    UserRound,
    X,
    } from 'lucide-react';
import {
    searchCurrentWebStorageShareRecipients,
    } from '@beeapp/api-client';
import type {
    FileSharePermission,
    StorageShareRecipient,
    } from '@beeapp/shared-types';

interface StorageShareModalProps {
    visible: boolean;
    fileName?: string;
    submitting?: boolean;
    onClose: () => void;
    onShare: (
        recipient: StorageShareRecipient,
        permission: FileSharePermission,
    ) => Promise<void>;
}

function getRecipientName(
    recipient: StorageShareRecipient,
    ): string {
    return [
        recipient.first_name,
        recipient.last_name,
    ]
        .filter(Boolean)
        .join(' ')
        || recipient.email
        || recipient.phone_number
        || 'Usuario';
}

function getRecipientContact(
    recipient: StorageShareRecipient,
    ): string {
    if (recipient.email) {
        return recipient.email;
    }

    return [
        recipient.phone_dial_code
        ? `+${recipient.phone_dial_code}`
        : '',
        recipient.phone_number || '',
    ]
        .join(' ')
        .trim();
}

export default function StorageShareModal({
    visible,
    fileName,
    submitting = false,
    onClose,
    onShare,
    }: StorageShareModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<
        StorageShareRecipient[]
    >([]);
    const [selectedRecipient, setSelectedRecipient] =
        useState<StorageShareRecipient | null>(null);

    const [permission, setPermission] =
        useState<FileSharePermission>('viewer');

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
        return;
        }

        setQuery('');
        setResults([]);
        setSelectedRecipient(null);
        setPermission('viewer');
        setErrorMessage(null);
    }, [visible]);

    useEffect(() => {
        const normalizedQuery = query.trim();

        if (!visible || normalizedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
        }

        let cancelled = false;

        const timer = window.setTimeout(() => {
        setLoading(true);
        setErrorMessage(null);

        void searchCurrentWebStorageShareRecipients(
            normalizedQuery,
        )
            .then((response) => {
            if (!cancelled) {
                setResults(response.recipients);
            }
            })
            .catch((error) => {
            if (!cancelled) {
                setResults([]);
                setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No fue posible buscar usuarios.',
                );
            }
            })
            .finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
            });
        }, 350);

        return () => {
        cancelled = true;
        window.clearTimeout(timer);
        };
    }, [query, visible]);

    const canSubmit = useMemo(
        () => Boolean(selectedRecipient) && !submitting,
        [selectedRecipient, submitting],
    );

    if (!visible) {
        return null;
    }

    const handleShare = async () => {
        if (!selectedRecipient || submitting) {
        return;
        }

        try {
        setErrorMessage(null);

        await onShare(
            selectedRecipient,
            permission,
        );
        } catch (error) {
        setErrorMessage(
            error instanceof Error
            ? error.message
            : 'No fue posible compartir el archivo.',
        );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 bg-black/60 backdrop-blur-xl"
            onClick={onClose}
        />

        <div className="relative z-10 flex w-full max-w-lg flex-col rounded-3xl border border-neutral-100 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Share2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900">
                    Compartir archivo
                </h3>

                {fileName && (
                    <p className="mt-1 truncate text-xs text-neutral-500">
                    {fileName}
                    </p>
                )}
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
            >
                <X className="h-5 w-5" />
            </button>
            </div>

            <label className="mb-2 text-xs font-medium text-neutral-700">
            Busca por correo, teléfono o nombre
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
            <Search className="h-4 w-4 text-neutral-400" />

            <input
                value={query}
                onChange={(event) =>
                setQuery(event.target.value)
                }
                placeholder="Ej. usuario@correo.com"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-10 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
            />

            {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
            )}
            </div>

            {errorMessage && (
            <p className="mt-2 text-xs text-red-600">
                {errorMessage}
            </p>
            )}

            <div className="my-3 min-h-24 max-h-52 overflow-y-auto">
            {query.trim().length < 2 ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                Escribe al menos dos caracteres para buscar.
                </p>
            ) : !loading && results.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                No encontramos usuarios con esa búsqueda.
                </p>
            ) : (
                <div className="space-y-2">
                {results.map((recipient) => {
                    const isSelected =
                    selectedRecipient?.id === recipient.id;

                    return (
                    <button
                        key={recipient.id}
                        type="button"
                        onClick={() =>
                        setSelectedRecipient(recipient)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                            ? 'border-brand-primary bg-brand-primary/10'
                            : 'border-neutral-200 hover:bg-neutral-50'
                        }`}
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                        <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">
                            {getRecipientName(recipient)}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-neutral-400" />

                            <p className="truncate text-xs text-neutral-500">
                            {getRecipientContact(recipient)}
                            </p>
                        </div>
                        </div>

                        {isSelected && (
                        <span className="text-sm font-bold text-brand-primary">
                            ✓
                        </span>
                        )}
                    </button>
                    );
                })}
                </div>
            )}
            </div>

            <label className="mb-2 text-xs font-medium text-neutral-700">
            Permiso
            </label>

            <div className="flex gap-3">
            <button
                type="button"
                onClick={() => setPermission('viewer')}
                className={`flex-1 rounded-xl border p-3 text-left ${
                permission === 'viewer'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-neutral-200'
                }`}
            >
                <p className={`text-sm font-semibold ${
                permission === 'viewer'
                    ? 'text-brand-primary'
                    : 'text-neutral-900'
                }`}>
                Puede ver
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                Puede abrir y descargar el archivo.
                </p>
            </button>

            <button
                type="button"
                onClick={() => setPermission('editor')}
                className={`flex-1 rounded-xl border p-3 text-left ${
                permission === 'editor'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-neutral-200'
                }`}
            >
                <p className={`text-sm font-semibold ${
                permission === 'editor'
                    ? 'text-brand-primary'
                    : 'text-neutral-900'
                }`}>
                Puede editar
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                Permiso preparado para futuras acciones.
                </p>
            </button>
            </div>

            <div className="mt-6 flex gap-3">
            <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-10 flex-1 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
                Cancelar
            </button>

            <button
                type="button"
                onClick={() => {
                void handleShare();
                }}
                disabled={!canSubmit}
                className="h-10 flex-1 rounded-full bg-brand-primary text-sm font-semibold text-white hover:bg-brand-dark disabled:bg-neutral-300"
            >
                {submitting
                ? 'Compartiendo...'
                : 'Compartir'}
            </button>
            </div>
        </div>
        </div>
    );
}