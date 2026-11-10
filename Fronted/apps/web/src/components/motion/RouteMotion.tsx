'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Envuelve la página con una animación de entrada al cambiar de ruta.
 *
 * `fill` es para las áreas que miden exactamente la ventana (la app de cliente):
 * el contenedor hereda el alto del padre y lo reparte a la página, y la animación
 * es solo de opacidad. Un `transform` residual o un `div` sin altura rompen el
 * scroll interno de todo lo que va debajo.
 */
export default function RouteMotion({
  children,
  fill = false,
}: {
  children: ReactNode;
  fill?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={
        fill
          ? 'motion-fade-in flex h-full min-h-0 min-w-0 flex-1 flex-col'
          : 'motion-page-enter'
      }
    >
      {children}
    </div>
  );
}
