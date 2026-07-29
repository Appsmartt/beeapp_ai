'use client';

import { useState } from 'react';
import { X, ShoppingBag, MessageCircle, ExternalLink } from 'lucide-react';

interface AiCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactSeller: (sellerName: string, productTitle: string) => void;
}

const MOCK_CATALOG_RESULTS = [
  {
    id: 'res-1',
    seller: 'Studio Creative Design',
    title: 'Diseño de Identidad Visual & Logotipo',
    price: '$250.00',
    description: 'Incluye manual de marca, paleta de colores y entrega de archivos en alta resolución.',
  },
  {
    id: 'res-2',
    seller: 'Innovatech Solutions',
    title: 'Desarrollo de Landing Page Responsive',
    price: '$400.00',
    description: 'Página optimizada para conversiones con integración de formulario y formulario de contacto.',
  },
];

export default function AiCatalogModal({ isOpen, onClose, onContactSeller }: AiCatalogModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4 max-h-[80vh] flex flex-col">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Resultados de BeeServices</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1">
          {MOCK_CATALOG_RESULTS.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-semibold text-brand-primary uppercase tracking-wider">{item.seller}</span>
                    <h3 className="text-xs font-semibold text-neutral-900 mt-0.5">{item.title}</h3>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 bg-white px-2.5 py-1 rounded-full border border-neutral-200">{item.price}</span>
                </div>

                {isExpanded && (
                  <p className="text-xs text-neutral-600 font-normal leading-relaxed pt-1 border-t border-neutral-200/60">
                    {item.description}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 h-8 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-normal flex items-center justify-center gap-1 hover:bg-white"
                  >
                    <span>{isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onContactSeller(item.seller, item.title);
                      onClose();
                    }}
                    className="flex-1 h-8 rounded-xl bg-brand-primary text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-brand-dark"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Contactar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
