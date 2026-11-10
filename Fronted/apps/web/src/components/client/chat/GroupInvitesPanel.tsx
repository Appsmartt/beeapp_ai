'use client';

import { useEffect, useState } from 'react';
import { getChatGroupInvites, respondToChatGroupInvite } from '@beeapp/api-client';
import type { ChatGroupInvite } from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';

export default function GroupInvitesPanel({ onAccepted }: { onAccepted: () => void }) {
  const [invites, setInvites] = useState<ChatGroupInvite[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getWebAuth()
      .then((auth) => getChatGroupInvites(auth, { status: 'pending', limit: 50 }))
      .then((response) => {
        setInvites(response.invites);
        setError('');
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las invitaciones.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (invite: ChatGroupInvite, accept: boolean) => {
    try {
      const auth = await getWebAuth();
      await respondToChatGroupInvite(auth, invite.id, accept);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
      if (accept) onAccepted();
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : 'No fue posible responder la invitación.');
    }
  };

  if (loading) return <p className="px-4 py-6 text-sm text-neutral-500">Cargando invitaciones…</p>;
  if (error) return <p className="px-4 py-6 text-sm text-rose-600">{error}</p>;
  if (invites.length === 0) return <p className="px-4 py-8 text-center text-sm text-neutral-500">No tienes invitaciones pendientes.</p>;

  return (
    <ul className="divide-y divide-neutral-100">
      {invites.map((invite) => (
        <li key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {invite.conversation?.name || 'Grupo'}
            </p>
            <p className="truncate text-xs text-neutral-500">
              Invitación de {invite.invited_by_identity?.display_name || 'un contacto'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className="rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void respond(invite, true)}>Aceptar</button>
            <button type="button" className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700" onClick={() => void respond(invite, false)}>Rechazar</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
