'use client';

import ModuleNotificationBell from '../ModuleNotificationBell';

/**
 * Barra vertical del módulo de Notas. La navegación pasó a ser por
 * categorías dentro del panel, así que aquí solo quedan las notificaciones.
 */
export default function NotesOptionsBar() {
  return (
    <div className="w-[56px] shrink-0 border-r border-neutral-200 bg-white flex flex-col items-center py-4 select-none">
      <div className="mt-auto">
        <ModuleNotificationBell moduleId="notes" />
      </div>
    </div>
  );
}
