'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '@beeapp/api-client';
import BeeAppLogo from '@/components/BeeAppLogo';

type QrLoginStatus =
  | 'LOADING'
  | 'READY'
  | 'APPROVING'
  | 'EXPIRED'
  | 'ERROR';

type CreateQrLoginChallengeResponse = {
  challenge_token: string;
  expires_at: string;
};

type GetQrLoginChallengeStatusResponse = {
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'CONSUMED'
    | 'EXPIRED'
    | 'CANCELLED';
  expires_at: string;
};

const STEPS = [
  'Abre BeeApp AI en tu teléfono',
  'Ve a Menú > Dispositivos',
  'Escanea el código QR',
];

function getRemainingSeconds(expiresAt: string): number {
  const expiresAtMilliseconds = new Date(expiresAt).getTime();
  const remainingMilliseconds = expiresAtMilliseconds - Date.now();

  return Math.max(0, Math.ceil(remainingMilliseconds / 1000));
}

export default function QrLogin() {
  const router = useRouter();

  const [loginStatus, setLoginStatus] =
    useState<QrLoginStatus>('LOADING');

  const [challengeToken, setChallengeToken] = useState<string | null>(
    null,
  );

  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(0);

  const [message, setMessage] = useState(
    'Generando código QR seguro...',
  );

  const challengeTokenRef = useRef<string | null>(null);

  const createQrLoginChallenge = async () => {
    try {
      setLoginStatus('LOADING');
      setMessage('Generando código QR seguro...');
      setChallengeToken(null);
      setExpiresAt(null);
      setSecondsLeft(0);

      const response =
        await api.post<CreateQrLoginChallengeResponse>(
          '/accounts/qr-login/challenges/',
        );

      challengeTokenRef.current = response.challenge_token;

      setChallengeToken(response.challenge_token);
      setExpiresAt(response.expires_at);
      setSecondsLeft(getRemainingSeconds(response.expires_at));
      setMessage(
        'Escanea el código desde BeeApp AI en tu teléfono.',
      );
      setLoginStatus('READY');
    } catch (error) {
      setLoginStatus('ERROR');

      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible generar el código QR.',
      );
    }
  };

  useEffect(() => {
    void createQrLoginChallenge();
  }, []);

  useEffect(() => {
    if (!expiresAt || loginStatus !== 'READY') {
      return;
    }

    const updateTimer = () => {
      const remainingSeconds = getRemainingSeconds(expiresAt);

      setSecondsLeft(remainingSeconds);

      if (remainingSeconds === 0) {
        setLoginStatus('EXPIRED');
        setMessage(
          'El código QR venció. Genera uno nuevo para continuar.',
        );
      }
    };

    updateTimer();

    const timer = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [expiresAt, loginStatus]);

  useEffect(() => {
    if (loginStatus !== 'READY') {
      return;
    }

    const pollChallengeStatus = async () => {
      const currentChallengeToken = challengeTokenRef.current;

      if (!currentChallengeToken) {
        return;
      }

      try {
        const response =
          await api.get<GetQrLoginChallengeStatusResponse>(
            `/accounts/qr-login/challenges/${encodeURIComponent(
              currentChallengeToken,
            )}/`,
          );

        if (response.status === 'APPROVED') {
          setLoginStatus('APPROVING');
          setMessage(
            'Sesión aprobada. Preparando BeeApp Web...',
          );

          await api.post(
            '/accounts/web-session/activate/',
            {
              challenge_token: currentChallengeToken,
            },
            {
              credentials: 'include',
            },
          );

          router.replace('/app');
          return;
        }

        if (
          response.status === 'EXPIRED' ||
          response.status === 'CANCELLED'
        ) {
          setLoginStatus('EXPIRED');
          setMessage(
            'El código QR venció. Genera uno nuevo para continuar.',
          );
        }
      } catch {
        return;
      }
    };

    const pollingInterval = window.setInterval(
      () => {
        void pollChallengeStatus();
      },
      1500,
    );

    return () => {
      window.clearInterval(pollingInterval);
    };
  }, [loginStatus, router]);

  const qrValue = challengeToken
    ? `beeapp://web-login?token=${encodeURIComponent(
        challengeToken,
      )}`
    : '';

  const canShowQr =
    loginStatus === 'READY' && Boolean(challengeToken);

  const canRetry =
    loginStatus === 'EXPIRED' || loginStatus === 'ERROR';

  return (
    <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl sm:border sm:border-neutral-200/80 sm:shadow-xl space-y-6">
      <div className="flex flex-col items-center text-center space-y-3">
        <Link href="/" className="mb-1">
          <BeeAppLogo height={52} />
        </Link>

        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          Inicia sesión en BeeApp Web
        </h1>

        <p className="text-sm text-neutral-600 font-normal max-w-xs">
          Escanea el código QR desde la app de BeeApp AI en tu
          teléfono para iniciar sesión.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="rounded-2xl border border-neutral-200 p-4 bg-white min-h-[250px] min-w-[250px] flex items-center justify-center">
          {canShowQr ? (
            <QRCodeSVG
              value={qrValue}
              size={218}
              level="M"
              marginSize={0}
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-neutral-600">{message}</p>

        {loginStatus === 'READY' ? (
          <p className="text-xs text-neutral-500">
            Este código vence en {secondsLeft} segundos.
          </p>
        ) : null}

        {canRetry ? (
          <button
            type="button"
            onClick={() => {
              void createQrLoginChallenge();
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Generar nuevo código
          </button>
        ) : null}
      </div>

      <ol className="space-y-2">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-start gap-2.5 text-xs text-neutral-500 font-normal"
          >
            <span className="shrink-0 w-4 h-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-normal flex items-center justify-center mt-px">
              {index + 1}
            </span>

            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="text-center pt-4 border-t border-neutral-100">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-normal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>
    </div>
  );
}