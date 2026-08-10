'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag, Eye } from 'lucide-react';
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
  const [viewersOpen, setViewersOpen] = useState(false);

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

  // Al cambiar de estado se vuelve a empezar
  useEffect(() => {
    if (!visible || !status) return;
    setProductHidden(false);
    setViewersOpen(false);
    setProgress(0);
  }, [visible, index, status?.id]);

  // El popover de "Visto por" pausa el avance: al cerrarlo, el intervalo
  // arranca de nuevo desde el progreso acumulado, no desde cero.
  useEffect(() => {
    if (!visible || !status || viewersOpen) return;

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
  }, [visible, index, status?.id, viewersOpen]);

  if (!visible || !status) return null;

  const isPhoto = status.type === 'photo';
  const isOwnStatus = status.authorId === 'me' || !!status.viewedBy;
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
        <div className="absolute inset-0" style={{ background }} />
      )}

      {/* Tap navigation zones */}
      <div className="absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-pointer" onClick={goPrev} />
      <div className="absolute top-0 bottom-0 right-0 w-1/3 z-20 cursor-pointer" onClick={goNext} />

      {/* Overlay content */}
      <div className="relative z-30 flex-1 flex flex-col justify-between max-w-md mx-auto w-full p-4 pointer-events-none">
        {/* Header section */}
        <div className="pointer-events-auto space-y-2">
          <StatusProgressPills count={statuses.length} index={index} progressPercent={progress} onDark={onDark} />

          <div className="flex items-center justify-between pt-2 px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0" style={{ backgroundColor: status.authorColor }}>
                {status.authorInitials}
              </div>
              <div>
                <p className={`text-xs font-semibold ${onDark ? 'text-white' : 'text-neutral-900'}`}>{status.authorName}</p>
                <p className={`text-[10px] ${onDark ? 'text-white/70' : 'text-neutral-500'}`}>{status.timestamp}</p>
              </div>
            </div>

            <button type="button" onClick={onClose} className={`p-2 rounded-full ${onDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-neutral-100 text-neutral-800'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage area */}
        <div className="relative flex-1 my-4 flex items-center justify-center">
          {isPhoto && status.photoUrl && (
            <img src={status.photoUrl} alt="Status" className="w-full h-full max-h-[70vh] object-cover rounded-3xl shadow-2xl" />
          )}

          <div className="absolute w-[86%] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ top: `${textPos.y}%`, left: `${textPos.x}%`, textAlign: status.textAlign ?? 'center' }}>
            <p className="whitespace-pre-wrap break-words" style={{ fontSize: `${status.textSize ?? 24}px`, fontWeight: status.textWeight === '700' ? 700 : 400, color: status.textColor ?? '#FFFFFF', lineHeight: 1.3 }}>
              {status.text}
            </p>
          </div>
        </div>

        {/* Viewers counter bar for own status */}
        {isOwnStatus && (
          <div className="pointer-events-auto flex justify-center mb-2">
            <button
              type="button"
              onClick={() => setViewersOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/70 transition-colors shadow-lg"
            >
              <Eye className="w-4 h-4 text-brand-primary" />
              <span>Visto por {status.viewedBy?.length ?? 3}</span>
            </button>
          </div>
        )}

        {/* Product card footer */}
        {product && !productHidden && (
          <div className="pointer-events-auto bg-white rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 mb-2 animate-slide-up">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">{product.name}</p>
              <p className="text-[11px] text-neutral-500 font-normal">{product.price !== null ? formatPrice(product.price) : 'Cotización'}</p>
            </div>
            <button type="button" onClick={() => alert(`Solicitar: ${product.name}`)} className="px-3.5 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-dark transition-colors shrink-0">
              Solicitar
            </button>
          </div>
        )}
      </div>

      {/* Popover / Modal de Personas que Vieron el Estado */}
      {viewersOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-primary" />
                <h3 className="font-semibold text-sm text-neutral-900">Visto por {status.viewedBy?.length ?? 3}</h3>
              </div>
              <button type="button" onClick={() => setViewersOpen(false)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-neutral-100">
              {(status.viewedBy || [
                { contactId: 'c1', contactName: 'Carlos Mendoza', viewedAt: 'hace 45 min' },
                { contactId: 'c3', contactName: 'María Gómez', viewedAt: 'hace 30 min' },
                { contactId: 'c2', contactName: 'Eduardo Torres', viewedAt: 'hace 10 min' },
              ]).map((viewer, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-xs flex items-center justify-center">
                      {viewer.contactName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-800">{viewer.contactName}</p>
                      <p className="text-[10px] text-neutral-500 font-normal">{viewer.viewedAt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
