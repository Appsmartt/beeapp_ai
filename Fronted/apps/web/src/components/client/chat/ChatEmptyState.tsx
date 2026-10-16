'use client';

import { MessageCircle, Users } from 'lucide-react';

interface ChatEmptyStateProps {
  /** true cuando el panel izquierdo está mostrando contactos o llamadas */
  inContacts: boolean;
}

/** Placeholder del panel derecho cuando no hay nada seleccionado (solo desktop) */
export default function ChatEmptyState({ inContacts }: ChatEmptyStateProps) {
  const Icon = inContacts ? Users : MessageCircle;

  return (
    <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center bg-neutral-50/50">
      <div className="space-y-3 max-w-xs">
        <Icon className="w-12 h-12 mx-auto text-neutral-300" />
        <h3 className="font-semibold text-sm text-neutral-700">
          {inContacts ? 'Ningún contacto seleccionado' : 'Ningún chat seleccionado'}
        </h3>
        <p className="text-xs text-neutral-500 font-normal">
          {inContacts
            ? 'Selecciona un contacto de la lista para ver su información y escribirle.'
            : 'Selecciona una conversación o comunidad de la lista de la izquierda para chatear.'}
        </p>
      </div>
    </div>
  );
}
