'use client';

import { createContext, useContext, useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { Mic } from 'lucide-react';
import VoiceAssistantModal from './VoiceAssistantModal';

const HideVoiceFabContext = createContext<Dispatch<SetStateAction<boolean>> | null>(null);

export function HideVoiceFabOnChats({ active }: { active: boolean }) {
  const setHidden = useContext(HideVoiceFabContext);

  useEffect(() => {
    if (!setHidden) return undefined;
    setHidden(active);
    return () => setHidden(false);
  }, [active, setHidden]);

  return null;
}

export function VoiceFabVisibility({
  children,
  hidden,
  onHiddenChange,
}: {
  children: React.ReactNode;
  hidden: boolean;
  onHiddenChange: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <HideVoiceFabContext.Provider value={onHiddenChange}>
      {children}
      <VoiceAssistantFab hidden={hidden} />
    </HideVoiceFabContext.Provider>
  );
}

const FAB_SIZE = 64;
const FAB_MARGIN = 24;

/**
 * El botón vive anclado a una esquina (lado + distancia al borde inferior), no a una
 * posición en píxeles. Así, al cambiar el zoom o el tamaño de la ventana sigue pegado
 * a su esquina en lugar de quedarse a la mitad de la pantalla.
 */
type FabAnchor = { side: 'left' | 'right'; bottom: number };

type DragState = {
  pointerX: number;
  pointerY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

export default function VoiceAssistantFab({ hidden = false }: { hidden?: boolean }) {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState<FabAnchor>({ side: 'right', bottom: FAB_MARGIN });
  const [dragPosition, setDragPosition] = useState<{ left: number; top: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (hidden) setVoiceOpen(false);
  }, [hidden]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.moved && Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
    drag.moved = true;

    setDragPosition({
      left: Math.max(0, Math.min(window.innerWidth - FAB_SIZE, drag.startLeft + deltaX)),
      top: Math.max(FAB_MARGIN, Math.min(window.innerHeight - FAB_SIZE, drag.startTop + deltaY)),
    });
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!drag.moved) {
      setDragPosition(null);
      if (!cancelled) setVoiceOpen(true);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const side = rect.left + FAB_SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right';
      const bottom = Math.max(
        FAB_MARGIN,
        Math.min(window.innerHeight - FAB_SIZE - FAB_MARGIN, window.innerHeight - rect.bottom),
      );
      setAnchor({ side, bottom });
    }
    setDragPosition(null);
  };

  if (!portalRoot) {
    return null;
  }

  const style: React.CSSProperties = dragPosition
    ? { left: `${dragPosition.left}px`, top: `${dragPosition.top}px` }
    : {
        [anchor.side]: `${FAB_MARGIN}px`,
        bottom: `min(${anchor.bottom}px, calc(100dvh - ${FAB_SIZE + FAB_MARGIN}px))`,
      };

  return createPortal(
    <>
      {hidden ? null : (
        <button
          ref={buttonRef}
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
          style={{ ...style, touchAction: 'none' }}
          className={`group fixed z-[120] flex h-16 w-16 select-none items-center justify-center rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/40 ${
            dragPosition
              ? 'scale-105 cursor-grabbing opacity-80 duration-100'
              : 'scale-100 cursor-grab opacity-100 duration-300'
          }`}
          aria-label="Asistente de IA por voz"
        >
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-brand-primary opacity-40" />
          <Mic className="pointer-events-none relative z-10 h-7 w-7" />
        </button>
      )}

      <VoiceAssistantModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
      />
    </>,
    portalRoot,
  );
}
