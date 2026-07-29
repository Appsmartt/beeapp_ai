'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { StatusItem } from '@/mocks/statuses';

interface StatusViewerProps {
  status: StatusItem;
  onClose: () => void;
}

export default function StatusViewer({ status, onClose }: StatusViewerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between max-w-[430px] mx-auto p-4 text-white overflow-hidden">
      
      {/* Top Header & Progress bar */}
      <div className="space-y-3 z-10">
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 font-bold text-xs flex items-center justify-center">
              {status.user.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold">{status.user}</p>
              <p className="text-[10px] text-white/60 font-normal">{status.timestamp}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Status Content Card */}
      <div
        className="flex-1 my-6 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-2xl relative"
        style={{ backgroundColor: status.bgColor || '#6025d2' }}
      >
        <p className="text-lg font-semibold leading-relaxed max-w-xs">
          {status.text || 'Sin contenido'}
        </p>

        {/* Linked Product Card if any */}
        {status.productLink && (
          <div className="absolute bottom-6 left-6 right-6 p-3 bg-white text-neutral-900 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">{status.productLink.title}</p>
                <p className="text-[10px] text-neutral-500 font-normal">{status.productLink.price}</p>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-xl">
              Ver
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
