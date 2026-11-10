'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ClipboardList,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Store,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  deleteCommercialProfile,
  getCommercialProfileDeletionStatus,
  updateCommercialProfilePublication,
} from '@beeapp/api-client';
import type { BusinessItem } from '@/lib/client/myServices';
import { beginAppNavigation } from '@/lib/client/navigationFeedback';
import { getWebAuth } from '@/lib/client/webAuth';

const PUBLICATION_LABEL = {
  published: 'Publicado',
  paused: 'En pausa',
  archived: 'Archivado',
  suspended: 'Suspendido',
} as const;

function publicationPresentation(status: NonNullable<BusinessItem['publicationStatus']>) {
  switch (status) {
    case 'published':
      return { label: PUBLICATION_LABEL.published, className: 'bg-[#C6F6D5] text-[#276749]' };
    case 'paused':
      return { label: PUBLICATION_LABEL.paused, className: 'bg-[#FEEBC8] text-[#C05621]' };
    case 'archived':
      return { label: PUBLICATION_LABEL.archived, className: 'bg-[#E2E8F0] text-[#4A5568]' };
    case 'suspended':
      return { label: PUBLICATION_LABEL.suspended, className: 'bg-[#FED7D7] text-[#9B1C1C]' };
    default:
      return { label: PUBLICATION_LABEL.paused, className: 'bg-[#F3E8FF] text-[#54209E]' };
  }
}

function businessInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export default function OwnedBusinessCard({
  business,
  onChanged,
}: {
  business: BusinessItem;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = business.publicationStatus || 'paused';
  const published = status === 'published';
  const publication = publicationPresentation(status);
  const productCount = business.products.length;
  const serviceCount = business.services.length;

  const openSpace = () => {
    beginAppNavigation();
    router.push(`/app/beeservices/manage/${business.id}`);
  };

  const go = (href: string) => {
    beginAppNavigation();
    router.push(href);
  };

  const togglePublication = async () => {
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      await updateCommercialProfilePublication(auth, business.id, {
        publication_status: published ? 'paused' : 'published',
      });
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible actualizar la publicación.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const statusResponse = await getCommercialProfileDeletionStatus(auth, business.id);
      if (!statusResponse.can_delete) {
        setError(
          `No se puede eliminar: tiene ${statusResponse.orders} solicitudes y ${statusResponse.chats} chats.`,
        );
        setConfirmingDelete(false);
        return;
      }
      await deleteCommercialProfile(auth, business.id);
      setConfirmingDelete(false);
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible eliminar el negocio.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex h-full min-w-0">
      <article className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.08)] transition hover:border-[#C9A8E8] hover:shadow-[0_14px_36px_rgba(116,39,213,0.12)]">
        <button
          type="button"
          onClick={openSpace}
          className="flex flex-1 flex-col p-4 text-left sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F6EAFE] to-white text-sm font-extrabold text-[#7427D5] shadow-sm ring-1 ring-[#E8D1F1]">
              {businessInitials(business.name)}
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${publication.className}`}>
              {publication.label}
            </span>
          </div>

          <h3 className="mt-4 text-base font-extrabold leading-snug text-[#261743] [overflow-wrap:anywhere] sm:text-lg">
            {business.name}
          </h3>
          <p className="mt-1 text-xs font-semibold text-[#8A72B2]">
            {business.category || 'Sin categoría'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {productCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F1EAF6] bg-[#FFFCF9] px-2.5 py-1 text-[11px] font-bold text-[#5E506B]">
                <Package className="h-3 w-3 text-[#7427D5]" aria-hidden />
                {productCount} {productCount === 1 ? 'producto' : 'productos'}
              </span>
            ) : null}
            {serviceCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F1EAF6] bg-[#FFFCF9] px-2.5 py-1 text-[11px] font-bold text-[#5E506B]">
                <Wrench className="h-3 w-3 text-[#7427D5]" aria-hidden />
                {serviceCount} {serviceCount === 1 ? 'servicio' : 'servicios'}
              </span>
            ) : null}
            {productCount === 0 && serviceCount === 0 ? (
              <span className="text-[11px] font-semibold text-[#B8A5D6]">Sin ofertas en catálogo</span>
            ) : null}
          </div>
        </button>

        <div className="flex items-center gap-2 border-t border-[#F1EAF6] bg-[#FFFCF9] p-3 sm:p-4">
          <button
            type="button"
            onClick={openSpace}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7427D5] px-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#5E1ABF]"
          >
            Administrar
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Más acciones de ${business.name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8D1F1] bg-white text-[#7C6AA5] transition hover:border-[#C9A8E8] hover:bg-[#F6EAFE] hover:text-[#7427D5]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-[#F1EAF6] bg-white px-3 py-3 sm:px-4">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Acciones rápidas</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Abrir espacio" icon={Store} onClick={openSpace} />
              <ActionButton label="Editar perfil" icon={Pencil} onClick={() => go(`/app/beeservices/manage/${business.id}/profile`)} />
              <ActionButton label="Ver ficha" icon={Eye} onClick={() => go(`/app/beeservices/profile/${business.id}`)} />
              <ActionButton
                label={published ? 'Pausar' : 'Publicar'}
                icon={ClipboardList}
                disabled={busy || status === 'suspended'}
                onClick={() => void togglePublication()}
              />
              <ActionButton label="Eliminar" icon={Trash2} onClick={() => setConfirmingDelete(true)} />
            </div>
          </div>
        ) : null}

        {confirmingDelete ? (
          <div className="border-t border-[#F3D0D0] bg-[#FFF5F5] px-3 py-3 text-sm text-[#7A2E2E] sm:px-4">
            <p className="text-xs font-semibold leading-relaxed [overflow-wrap:anywhere]">
              ¿Eliminar {business.name}? Esta acción no se puede deshacer.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="rounded-xl bg-[#C92A2A] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"
              >
                {busy ? 'Eliminando…' : 'Eliminar negocio'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl border border-[#E8D1F1] bg-white px-3 py-2 text-xs font-extrabold text-[#5E1ABF]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="border-t border-[#F1EAF6] px-3 py-2 text-xs text-rose-600 sm:px-4">{error}</p>
        ) : null}
      </article>
    </li>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: typeof Store;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E8D1F1] bg-white px-3 text-xs font-semibold text-[#5E1ABF] hover:bg-[#F6EAFE] disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
