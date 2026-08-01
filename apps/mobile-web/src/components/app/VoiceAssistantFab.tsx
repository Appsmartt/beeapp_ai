'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import VoiceAssistantModal from './VoiceAssistantModal';

export default function VoiceAssistantFab() {
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Position state (null before mount so initial fallback CSS can be left-6 bottom-6)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startLeft: number; startTop: number }>({
    mouseX: 0,
    mouseY: 0,
    startLeft: 24,
    startTop: 0,
  });
  const isClickRef = useRef(true);

  // Initialize position on client mount
  useEffect(() => {
    setPosition({
      left: 24,
      top: typeof window !== 'undefined' ? window.innerHeight - 88 : 600,
    });
  }, []);

  // Global mousemove and mouseup handlers
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

      const clampedLeft = Math.max(0, Math.min(window.innerWidth - 64, rawLeft));
      const clampedTop = Math.max(24, Math.min(window.innerHeight - 88, rawTop));

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

      // Snap to left (24px) or right (window.innerWidth - 88px)
      const currentLeft = position?.left ?? 24;
      const currentTop = position?.top ?? (window.innerHeight - 88);
      const isLeftHalf = currentLeft + 32 < window.innerWidth / 2;
      const targetLeft = isLeftHalf ? 24 : window.innerWidth - 88;
      const clampedTop = Math.max(24, Math.min(window.innerHeight - 88, currentTop));

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
    // Only handle primary left click
    if (e.button !== 0) return;
    const currentLeft = position?.left ?? 24;
    const currentTop = position?.top ?? (window.innerHeight - 88);

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

  return (
    <>
      <button
        type="button"
        onMouseDown={handleMouseDown}
        style={{
          left: position ? `${position.left}px` : '24px',
          top: position ? `${position.top}px` : undefined,
          bottom: position ? undefined : '24px',
        }}
        className={`fixed z-40 w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/40 select-none group ${
          isDragging
            ? 'cursor-grabbing opacity-80 scale-105 duration-100'
            : 'cursor-grab opacity-100 scale-100 duration-300'
        }`}
        aria-label="Asistente de IA por voz"
      >
        {/* Pulsing Glow Ring */}
        <span className="absolute inset-0 rounded-full bg-brand-primary opacity-40 animate-ping pointer-events-none" />
        <Mic className="w-7 h-7 relative z-10 pointer-events-none" />
      </button>

      <VoiceAssistantModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
      />
    </>
  );
}
