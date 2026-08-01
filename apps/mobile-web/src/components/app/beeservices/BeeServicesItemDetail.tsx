'use client';

import { Package, Wrench, Truck, Monitor } from 'lucide-react';
import { BusinessProduct, BusinessService } from '@/mocks/myServices';

export type CatalogItem = (BusinessProduct | BusinessService) & { isService: boolean };

interface BeeServicesItemDetailProps {
  item: CatalogItem;
}

export function BeeServicesItemDetail({ item }: BeeServicesItemDetailProps) {
  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            {item.isService ? <Wrench className="w-6 h-6" /> : <Package className="w-6 h-6" />}
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-primary">
              {item.isService ? 'Servicio' : 'Producto'}
            </span>
            <h3 className="font-semibold text-lg text-neutral-900 leading-tight">{item.name}</h3>
            <p className="text-base font-semibold text-neutral-900 mt-1">{item.price}</p>
          </div>
        </div>

        <div className="border-t border-neutral-200/60 pt-3 space-y-2">
          <h4 className="font-semibold text-xs text-neutral-700">Descripción</h4>
          <p className="text-xs text-neutral-600 font-normal leading-relaxed">{item.description}</p>
        </div>

        {'deliveryMethods' in item && item.deliveryMethods && item.deliveryMethods.length > 0 && (
          <div className="border-t border-neutral-200/60 pt-3 space-y-2">
            <h4 className="font-semibold text-xs text-neutral-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-neutral-500" /> Entrega
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.deliveryMethods.map((m, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-neutral-200/60 text-neutral-700 text-xs font-normal">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {'serviceModalities' in item && item.serviceModalities && item.serviceModalities.length > 0 && (
          <div className="border-t border-neutral-200/60 pt-3 space-y-2">
            <h4 className="font-semibold text-xs text-neutral-700 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-neutral-500" /> Modalidad
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.serviceModalities.map((m, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-neutral-200/60 text-neutral-700 text-xs font-normal">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
