'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <div className={`confirm-dialog-icon-wrap ${tone === 'danger' ? 'danger' : ''}`}>
          <AlertTriangle size={20} />
        </div>
        <span className="confirm-dialog-title">{title}</span>
        <p className="confirm-dialog-description">{description}</p>
        {children}
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`confirm-dialog-btn-confirm ${tone === 'danger' ? 'danger' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
