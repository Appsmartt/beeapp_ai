'use client';

import Link from 'next/link';
import { useState } from 'react';
import { syncCalendarIntegration, syncMail } from '@beeapp/api-client';
import type { IntegrationCapability } from '@beeapp/shared-types';
import { useIntegrations } from '@/hooks/useIntegrations';
import { getWebAuth } from '@/lib/client/webAuth';

export default function ExternalAccountsBar({ capability }: { capability: Extract<IntegrationCapability, 'mail' | 'calendar'> }) {
  const { connections, disconnect } = useIntegrations();
  const [notice, setNotice] = useState('');
  const accounts = connections.filter((connection) => (
    connection.status === 'connected' && connection.capabilities.includes(capability)
  ));

  const sync = async (connectionId: string) => {
    try {
      const auth = await getWebAuth();
      if (capability === 'mail') await syncMail(auth, {});
      else await syncCalendarIntegration(auth, connectionId, {});
      setNotice('Sincronización iniciada.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No fue posible sincronizar.');
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-700">
          {capability === 'mail' ? 'Correo externo' : 'Agendas externas'}
        </p>
        <Link href="/app/profile/integrations" className="text-xs font-semibold text-brand-primary">
          Conectar
        </Link>
      </div>
      {accounts.length === 0 ? (
        <p className="mt-1 text-[11px] text-neutral-500">No hay cuentas conectadas.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-neutral-700">{account.provider_email || account.provider_display_name || account.provider}</span>
              <span className="flex shrink-0 items-center gap-2">
                {capability === 'calendar' ? null : (
                  <button type="button" className="font-semibold text-brand-primary" onClick={() => void sync(account.id)}>Sincronizar</button>
                )}
                <button type="button" className="text-rose-600" onClick={() => void disconnect(account.id)}>Desconectar</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {notice ? <p className="mt-1 text-[11px] text-neutral-600">{notice}</p> : null}
    </div>
  );
}
