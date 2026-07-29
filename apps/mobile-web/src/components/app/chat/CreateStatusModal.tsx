'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (text: string, bgColor: string) => void;
}

const BG_COLORS = ['#6025d2', '#1A1A2E', '#4CAF50', '#FF9800', '#E91E63'];

export default function CreateStatusModal({ isOpen, onClose, onPublish }: CreateStatusModalProps) {
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#6025d2');

  if (!isOpen) return null;

  const handlePublish = () => {
    if (!text.trim()) return;
    onPublish(text, bgColor);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between max-w-[430px] mx-auto p-4 text-white">
      
      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <button
          onClick={handlePublish}
          disabled={!text.trim()}
          className="px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold disabled:opacity-50"
        >
          Publicar
        </button>
      </div>

      {/* Editor Surface */}
      <div
        className="flex-1 my-4 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative"
        style={{ backgroundColor: bgColor }}
      >
        <textarea
          placeholder="Escribe tu estado..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/60 outline-none text-center resize-none max-w-xs"
        />
      </div>

      {/* Toolbar - Color palette */}
      <div className="flex items-center justify-center gap-3 py-2 z-10">
        {BG_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setBgColor(c)}
            style={{ backgroundColor: c }}
            className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center"
          >
            {bgColor === c && <Check className="w-4 h-4 text-white" />}
          </button>
        ))}
      </div>

    </div>
  );
}
