'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function SlidePanel({ open, onClose, title, children }: SlidePanelProps) {
  if (!open) return null;

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <div className="slide-panel" onClick={(event) => event.stopPropagation()}>
        <div className="slide-panel-header">
          <span className="slide-panel-title">{title}</span>
          <button className="slide-panel-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="slide-panel-body">{children}</div>
      </div>
    </div>
  );
}
