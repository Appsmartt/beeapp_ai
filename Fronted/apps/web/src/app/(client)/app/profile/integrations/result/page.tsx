'use client';

import {
    useEffect,
    useMemo,
    useState,
    } from 'react';
import {
    useRouter,
    useSearchParams,
    } from 'next/navigation';
import {
    CheckCircle2,
    Loader2,
    XCircle,
    } from 'lucide-react';
import {
    confirmIntegrationOAuth,
    discoverCurrentWebExternalCalendars,
    getCurrentWebCalendarIntegrations,
    syncCurrentWebCalendarIntegration,
    syncMail,
    } from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/webAuth';

export default function IntegrationOAuthResultPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const outcome = searchParams.get('outcome') || '';
    const detail = searchParams.get('detail') || '';
    const requestId = searchParams.get('request_id') || '';
    const confirmationToken = searchParams.get('confirmation_token') || '';

    const [confirmationState, setConfirmationState] = useState<
        'pending' | 'success' | 'failure'
    >(outcome === 'success' ? 'pending' : 'failure');

    useEffect(() => {
        let cancelled = false;

        const confirmAuthorization = async () => {
            if (outcome !== 'success') {
                return;
            }

            try {
                const auth = await getWebAuth();

                if (requestId && confirmationToken) {
                    await confirmIntegrationOAuth(
                        requestId,
                        confirmationToken,
                        auth,
                    );
                }

                await Promise.allSettled([
                    syncMail(auth, {}),
                    getCurrentWebCalendarIntegrations().then(async (res) => {
                        for (const item of res.integrations ?? []) {
                            await discoverCurrentWebExternalCalendars(item.id).catch(() => undefined);
                            await syncCurrentWebCalendarIntegration(item.id, {}).catch(() => undefined);
                        }
                    }),
                ]);

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

    const isSuccess = outcome === 'success' && confirmationState === 'success';
    const isPending = outcome === 'success' && confirmationState === 'pending';
    const isFailure = outcome === 'failure' || confirmationState === 'failure';

    const message = useMemo(() => {
        if (isPending) {
            return 'Verificando la conexión segura y sincronizando tu cuenta...';
        }

        if (isSuccess) {
            return 'Cuenta conectada. Actualizando integraciones...';
        }

        if (isFailure) {
            return (
                'No fue posible completar la conexión. '
                + 'Volviendo a integraciones...'
            );
        }

        return 'Volviendo a integraciones...';
    }, [isFailure, isPending, isSuccess]);

    useEffect(() => {
        if (isPending) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            router.replace('/app/profile/integrations');
        }, isSuccess ? 1000 : 2200);

        return () => window.clearTimeout(timeout);
    }, [isPending, isSuccess, router]);

    return (
        <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-100 text-brand-primary flex items-center justify-center">
            {isSuccess ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            ) : isFailure ? (
                <XCircle className="w-8 h-8 text-red-600" />
            ) : (
                <Loader2 className="w-8 h-8 animate-spin" />
            )}
            </div>

            <h1 className="mt-5 text-xl font-bold text-neutral-900">
            Buddy Integraciones
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            {message}
            </p>

            {detail && isFailure ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                {detail}
            </p>
            ) : null}
        </section>
        </main>
    );
}