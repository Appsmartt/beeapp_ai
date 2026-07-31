'use client';

import { useState, useEffect } from 'react';
import { Package, Wrench, Check, X } from 'lucide-react';
import { getMyItems, formatPrice } from '@/mocks/myServices';
import { StatusProductLink } from '@/mocks/statuses';

interface ProductLinkSelectorProps {
  visible: boolean;
  selectedId?: string;
  onLink: (product: StatusProductLink) => void;
  onClose: () => void;
}

export default function ProductLinkSelector({
  visible,
  selectedId,
  onLink,
  onClose,
}: ProductLinkSelectorProps) {
  const [selected, setSelected] = useState<string | undefined>(selectedId);
  const items = getMyItems();

  useEffect(() => {
    if (visible) setSelected(selectedId);
  }, [visible, selectedId]);

  if (!visible) return null;

  const handleLink = () => {
    const item = items.find((i) => i.id === selected);
    if (item) {
      const numPrice = typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) || null : item.price;
      onLink({ id: item.id, name: item.name, price: numPrice });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="font-semibold text-sm text-neutral-900">Vincular producto</h2>
            <p className="text-xs text-neutral-500 font-normal">
              Elige qué publicaste en BeeServices para mostrarlo en tu estado.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {items.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              Todavía no tienes productos ni servicios publicados.
            </p>
          ) : (
            items.map((item) => {
              const isProduct = item.type === 'product';
              const Icon = isProduct ? Package : Wrench;
              const isSelected = selected === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className={`py-3 px-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-xl transition-colors ${
                    isSelected ? 'bg-brand-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-neutral-500 font-normal">
                        {item.price !== null ? formatPrice(item.price) : 'Cotización'}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          disabled={!selected}
          onClick={handleLink}
          className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          Vincular
        </button>
      </div>
    </div>
  );
}
