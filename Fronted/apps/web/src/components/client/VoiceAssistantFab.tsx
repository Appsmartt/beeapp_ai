'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic } from 'lucide-react';
import VoiceAssistantModal from './VoiceAssistantModal';

const FAB_SIZE = 64;
const FAB_MARGIN = 24;

function defaultFabPosition() {
  if (typeof window === 'undefined') {
    return { left: FAB_MARGIN, top: 600 };
  }

  return {
    left: window.innerWidth - FAB_MARGIN - FAB_SIZE,
    top: window.innerHeight - FAB_MARGIN - FAB_SIZE,
  };
}

export default function VoiceAssistantFab() {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startLeft: number; startTop: number }>({
    mouseX: 0,
    mouseY: 0,
    startLeft: FAB_MARGIN,
    startTop: 0,
  });
  const isClickRef = useRef(true);

  useEffect(() => {
    setPortalRoot(document.body);
    setPosition(defaultFabPosition());
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        if (!current) {
          return defaultFabPosition();
        }

        return {
          left: Math.max(0, Math.min(window.innerWidth - FAB_SIZE, current.left)),
          top: Math.max(FAB_MARGIN, Math.min(window.innerHeight - FAB_SIZE, current.top)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isClickRef.current = false;
      }

      const rawLeft = dragStartRef.current.startLeft + deltaX;
      const rawTop = dragStartRef.current.startTop + deltaY;

      const clampedLeft = Math.max(0, Math.min(window.innerWidth - FAB_SIZE, rawLeft));
      const clampedTop = Math.max(FAB_MARGIN, Math.min(window.innerHeight - FAB_SIZE, rawTop));

      setPosition({ left: clampedLeft, top: clampedTop });
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (isClickRef.current) {
        setVoiceOpen(true);
        return;
      }

      const currentLeft = position?.left ?? defaultFabPosition().left;
      const currentTop = position?.top ?? defaultFabPosition().top;
      const isLeftHalf = currentLeft + FAB_SIZE / 2 < window.innerWidth / 2;
      const targetLeft = isLeftHalf
        ? FAB_MARGIN
        : window.innerWidth - FAB_MARGIN - FAB_SIZE;
      const clampedTop = Math.max(
        FAB_MARGIN,
        Math.min(window.innerHeight - FAB_SIZE, currentTop),
      );

      setPosition({ left: targetLeft, top: clampedTop });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const defaults = defaultFabPosition();
    const currentLeft = position?.left ?? defaults.left;
    const currentTop = position?.top ?? defaults.top;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startLeft: currentLeft,
      startTop: currentTop,
    };
    isDraggingRef.current = true;
    isClickRef.current = true;
    setIsDragging(true);
  };

  if (!portalRoot || !position) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        onMouseDown={handleMouseDown}
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
        }}
        className={`fixed z-[120] w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/40 select-none group ${
          isDragging
            ? 'cursor-grabbing opacity-80 scale-105 duration-100'
            : 'cursor-grab opacity-100 scale-100 duration-300'
        }`}
        aria-label="Asistente de IA por voz"
      >
        <span className="absolute inset-0 rounded-full bg-brand-primary opacity-40 animate-ping pointer-events-none" />
        <Mic className="w-7 h-7 relative z-10 pointer-events-none" />
      </button>

      <VoiceAssistantModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
      />
    </>,
    portalRoot,
  );
}
