'use client';

import { useState } from 'react';
import { CheckCircle2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { AI_SEARCH_RESULTS, AiSearchResult } from '@/mocks/aiSearchResults';

interface InlineProductCardsProps {
  results?: AiSearchResult[];
  onContact: (result: AiSearchResult) => void;
  darkTheme?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);

export default function InlineProductCards({
  results = AI_SEARCH_RESULTS,
  onContact,
  darkTheme = false,
}: InlineProductCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 w-full my-2">
      {results.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <div
            key={item.id}
            className={`w-[280px] shrink-0 rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
              darkTheme
                ? 'bg-[rgba(237,233,254,0.08)] border-[rgba(237,233,254,0.2)] text-white'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="space-y-2">
              {/* Vendedor */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                    darkTheme
                      ? 'bg-brand-primary text-white'
                      : 'bg-brand-primary/10 text-brand-primary'
                  }`}
                >
                  {item.sellerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold truncate ${darkTheme ? 'text-white' : 'text-neutral-900'}`}>
                      {item.sellerName}
                    </span>
                    {item.sellerVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-normal ${darkTheme ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {item.city}
                  </span>
                </div>
              </div>

              {/* Nombre de producto */}
              <h4 className={`text-xs font-normal leading-snug line-clamp-2 ${darkTheme ? 'text-neutral-200' : 'text-neutral-800'}`}>
                {item.productName}
              </h4>

              {/* Rating & Precio */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[11px] font-normal text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{item.rating}</span>
                </div>

                <span className="text-xs font-semibold text-brand-primary">
                  {item.price ? formatPrice(item.price) : 'Precio por acordar'}
                </span>
              </div>

              {/* Expandir detalle */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={`text-[11px] font-normal flex items-center gap-1 hover:underline ${
                    darkTheme ? 'text-[#C4B5FD]' : 'text-brand-primary'
                  }`}
                >
                  <span>{isExpanded ? 'Ocultar detalle' : 'Ver detalle'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isExpanded && (
                  <p className={`text-[11px] font-normal leading-relaxed mt-2 p-2 rounded-lg ${
                    darkTheme ? 'bg-black/20 text-neutral-300' : 'bg-neutral-50 text-neutral-600'
                  }`}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            {/* Botón Solicitar */}
            <div className="pt-3 border-t border-neutral-100/10 mt-2">
              <button
                type="button"
                onClick={() => onContact(item)}
                className="w-full py-2 rounded-full bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors text-center shadow-xs"
              >
                Solicitar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
