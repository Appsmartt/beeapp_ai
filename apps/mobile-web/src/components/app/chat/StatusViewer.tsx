'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { StatusItem } from '@/mocks/statuses';
import { formatPrice } from '@/mocks/myServices';
import StatusProgressPills from './StatusProgressPills';

const STATUS_DURATION = 6000;

interface StatusViewerProps {
  visible: boolean;
  statuses: StatusItem[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

export default function StatusViewer({
  visible,
  statuses,
  index,
  onChangeIndex,
  onClose,
}: StatusViewerProps) {
  const [progress, setProgress] = useState(0);
  const [productHidden, setProductHidden] = useState(false);

  const status = statuses[index];

  const goNext = () => {
    if (index < statuses.length - 1) {
      onChangeIndex(index + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      onChangeIndex(index - 1);
    }
  };

  useEffect(() => {
    if (!visible || !status) return;
    setProductHidden(false);
    setProgress(0);

    const step = 50;
    const increment = (step / STATUS_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          goNext();
          return 100;
        }
        return prev + increment;
      });
    }, step);

    return () => clearInterval(timer);
  }, [visible, index, status?.id]);

  if (!visible || !status) return null;

  const isPhoto = status.type === 'photo';
  const background = status.bgColor ?? '#1A1A2E';
  const onDark = isPhoto || background !== '#FFFFFF';
  const product = status.linkedProduct;
  const textPos = status.textPosition ?? { x: 50, y: 50 };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between select-none overflow-hidden">
      {/* Background layer */}
      {isPhoto ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-70"
            style={{ backgroundImage: `url(${status.photoUrl})` }}
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: background }} />
      )}

      {/* Tap navigation zones */}
      <div
        className="absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-pointer"
        onClick={goPrev}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-1/3 z-20 cursor-pointer"
        onClick={goNext}
      />

      {/* Overlay content */}
      <div className="relative z-30 flex-1 flex flex-col justify-between max-w-md mx-auto w-full p-4 pointer-events-none">
        {/* Header section */}
        <div className="pointer-events-auto space-y-2">
          <StatusProgressPills
            count={statuses.length}
            index={index}
            progressPercent={progress}
            onDark={onDark}
          />

          <div className="flex items-center justify-between pt-2 px-2">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                style={{ backgroundColor: status.authorColor }}
              >
                {status.authorInitials}
              </div>
              <div>
                <p className={`text-xs font-semibold ${onDark ? 'text-white' : 'text-neutral-900'}`}>
                  {status.authorName}
                </p>
                <p className={`text-[10px] ${onDark ? 'text-white/70' : 'text-neutral-500'}`}>
                  {status.timestamp}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full ${onDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-neutral-100 text-neutral-800'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage area */}
        <div className="relative flex-1 my-4 flex items-center justify-center">
          {isPhoto && status.photoUrl && (
            <img
              src={status.photoUrl}
              alt="Status"
              className="w-full h-full max-h-[70vh] object-cover rounded-3xl shadow-2xl"
            />
          )}

          <div
            className="absolute max-w-[86%] text-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              top: `${textPos.y}%`,
              left: `${textPos.x}%`,
            }}
          >
            <p
              style={{
                fontSize: `${status.textSize ?? 24}px`,
                fontWeight: status.textWeight === '700' ? 700 : 400,
                color: status.textColor ?? '#FFFFFF',
                lineHeight: 1.3,
              }}
            >
              {status.text}
            </p>
          </div>
        </div>

        {/* Product card footer */}
        {product && !productHidden && (
          <div className="pointer-events-auto bg-white rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 mb-2 animate-slide-up">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">{product.name}</p>
              <p className="text-[11px] text-neutral-500 font-normal">
                {product.price !== null ? formatPrice(product.price) : 'Cotización'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => alert(`Contactar por: ${product.name}`)}
              className="px-3.5 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-dark transition-colors shrink-0"
            >
              Contactar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
