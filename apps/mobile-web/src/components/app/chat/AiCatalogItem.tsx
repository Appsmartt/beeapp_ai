'use client';

import { useState } from 'react';
import { Star, MapPin, ChevronDown, ChevronUp, MessageSquare, CheckCircle2 } from 'lucide-react';
import { AiSearchResult } from '@/mocks/aiSearchResults';
import { formatPrice } from '@/mocks/myServices';

interface AiCatalogItemProps {
  item: AiSearchResult;
  onContact: () => void;
}

export default function AiCatalogItem({ item, onContact }: AiCatalogItemProps) {
  const [expanded, setExpanded] = useState(false);

  const priceLabel = item.price !== null ? formatPrice(item.price) : 'Precio por acordar';

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-3 shadow-xs">
      <div className="flex gap-3">
        {/* Placeholder Thumbnail */}
        <div className="w-16 h-16 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-semibold text-xl shrink-0">
          {item.productName.charAt(0)}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[11px] font-normal text-neutral-500 truncate">
              {item.sellerName}
            </span>
            {item.sellerVerified && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
          </div>

          <h3 className="text-xs font-semibold text-neutral-900 leading-tight mb-1">
            {item.productName}
          </h3>

          <p className="text-xs font-semibold text-brand-primary mb-1.5">{priceLabel}</p>

          <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-normal">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{item.rating}</span>
            </div>

            <div className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>{item.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded description block */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1">
          <p className="text-[11px] font-semibold text-neutral-800">Detalles del servicio:</p>
          <p className="text-xs text-neutral-600 leading-relaxed font-normal">{item.description}</p>
        </div>
      )}

      {/* Footer action buttons */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-neutral-600 font-normal hover:text-neutral-900"
        >
          <span>{expanded ? 'Ocultar detalle' : 'Ver detalle'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onContact}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-full hover:bg-brand-dark transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Solicitar</span>
        </button>
      </div>
    </div>
  );
}
