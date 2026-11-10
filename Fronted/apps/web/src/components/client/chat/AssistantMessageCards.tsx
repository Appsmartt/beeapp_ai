'use client';

import type { AssistantCard } from '@beeapp/shared-types';
import { assistantDecision } from '@/lib/client/assistantChat';

interface AssistantMessageCardsProps {
  cards: AssistantCard[];
  busy: boolean;
  onConfirm: (card: AssistantCard, confirm: boolean) => void;
  onChooseProvider: (item: Record<string, unknown>) => void;
  onOpenChat: (conversationId: string) => void;
}

function providerName(item: Record<string, unknown>): string {
  return String(item.business_name || item.title || 'Proveedor');
}

export default function AssistantMessageCards({
  cards,
  busy,
  onConfirm,
  onChooseProvider,
  onOpenChat,
}: AssistantMessageCardsProps) {
  return (
    <div className="mt-2 space-y-2 max-w-[min(100%,28rem)]">
      {cards.map((card, index) => {
        if (card.type === 'confirm') {
          const decision = assistantDecision(card);
          const details = Array.isArray(card.details) ? card.details : [];
          return (
            <div
              key={`${card.action_id || index}-confirm`}
              className="rounded-2xl border border-neutral-200 bg-white p-3 text-xs shadow-sm"
            >
              <p className="font-semibold text-neutral-900">{String(card.title || 'Confirmar acción a realizar')}</p>
              <p className="mt-1 text-neutral-700">{String(card.summary || '')}</p>
              {details.length > 0 ? (
                <dl className="mt-2 space-y-1 rounded-xl bg-neutral-50 px-2.5 py-2">
                  {details.map((detail, detailIndex) => (
                    <div key={`${detail.label}-${detailIndex}`} className="flex gap-2">
                      <dt className="font-semibold text-neutral-500">{detail.label}:</dt>
                      <dd className="min-w-0 text-neutral-800">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {decision ? (
                <p className={`mt-3 inline-flex rounded-xl px-2.5 py-1.5 text-[12px] font-semibold ${
                  decision === 'confirmed'
                    ? 'bg-[#ECFDF5] text-[#047857]'
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {decision === 'confirmed' ? 'Acción ejecutada («Hazlo»)' : 'Acción cancelada («Cancela»)'}
                </p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConfirm(card, false)}
                    className="flex-1 rounded-xl border border-neutral-200 py-2 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Cancela
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConfirm(card, true)}
                    className="flex-1 rounded-xl bg-brand-primary py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Hazlo
                  </button>
                </div>
              )}
            </div>
          );
        }

        if (card.type === 'providers') {
          const items = Array.isArray(card.items) ? card.items : [];
          return (
            <div
              key={`${card.action_id || index}-providers`}
              className="rounded-2xl border border-neutral-200 bg-white p-3 text-xs shadow-sm"
            >
              <p className="font-semibold text-neutral-900">Proveedores</p>
              <div className="mt-2 space-y-2">
                {items.map((item) => (
                  <div
                    key={String(item.offer_id || item.business_id)}
                    className="flex items-start justify-between gap-2 rounded-xl bg-neutral-50 p-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">{providerName(item)}</p>
                      <p className="text-neutral-600 truncate">
                        {String(item.title || '')}
                        {item.city ? ` · ${String(item.city)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onChooseProvider(item)}
                      className="shrink-0 rounded-lg bg-brand-primary px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Elegir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (card.type === 'event' || card.type === 'note') {
          const label = card.type === 'event' ? 'Agenda' : 'Nota';
          return (
            <div
              key={`${card.action_id || index}-${card.type}`}
              className="rounded-2xl border border-neutral-200 bg-white p-3 text-xs shadow-sm"
            >
              <p className="font-semibold text-neutral-900">{label}</p>
              <p className="mt-1 text-neutral-700">
                {String(card.title || card.summary || 'Listo')} · {String(card.action || '')}
              </p>
            </div>
          );
        }

        if (card.type === 'request' && card.conversation_id) {
          return (
            <button
              key={`${card.conversation_id}-request`}
              type="button"
              onClick={() => onOpenChat(String(card.conversation_id))}
              className="w-full rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-3 text-left text-xs hover:bg-brand-primary/10"
            >
              <p className="font-semibold text-brand-primary">Solicitud enviada</p>
              <p className="mt-1 text-neutral-700">Abrir el chat con el proveedor</p>
            </button>
          );
        }

        return null;
      })}
    </div>
  );
}
