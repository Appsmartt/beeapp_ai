'use client';

import {
    useEffect,
    useMemo,
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

export default function IntegrationOAuthResultPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const outcome = searchParams.get('outcome') || '';
    const detail = searchParams.get('detail') || '';

    const isSuccess = outcome === 'success';
    const isFailure = outcome === 'failure';

    const message = useMemo(() => {
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
    }, [isFailure, isSuccess]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
        router.replace('/app/profile/integrations');
        }, isSuccess ? 1000 : 2200);

        return () => window.clearTimeout(timeout);
    }, [isSuccess, router]);

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
            BeeApp Integraciones
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