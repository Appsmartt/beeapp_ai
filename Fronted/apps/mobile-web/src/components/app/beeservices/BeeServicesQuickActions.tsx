'use client';

import {
    BriefcaseBusiness,
    CalendarCheck2,
    ClipboardList,
    } from 'lucide-react';
import {
    BEE_SERVICES_QUICK_ACTIONS,
    BeeServicesQuickAction,
    } from '@/mocks/beeServicesExplore';

interface BeeServicesQuickActionsProps {
    activeAction: string | null;
    onPressAction: (action: BeeServicesQuickAction) => void;
}

const ACTION_ICONS = {
    requests: ClipboardList,
    orders: BriefcaseBusiness,
    reservations: CalendarCheck2,
};

export default function BeeServicesQuickActions({
    activeAction,
    onPressAction,
    }: BeeServicesQuickActionsProps) {
    return (
        <section>
        <h2 className="mb-3 text-base font-bold text-[#261743]">
            Gestión rápida
        </h2>

        <div className="grid grid-cols-3 gap-3">
            {BEE_SERVICES_QUICK_ACTIONS.map((action) => {
            const Icon = ACTION_ICONS[action.id];
            const isActive = activeAction === action.id;

            return (
                <button
                key={action.id}
                type="button"
                onClick={() => onPressAction(action)}
                className={`flex min-h-[104px] flex-col items-center justify-center rounded-2xl border px-2 transition-all ${
                    isActive
                    ? 'border-[#7427D5] bg-[#F6EAFE] shadow-[0_5px_16px_rgba(116,39,213,0.14)]'
                    : 'border-[#EEE8F1] bg-white shadow-[0_3px_8px_rgba(42,26,69,0.04)] hover:-translate-y-0.5 hover:border-[#E8D1F1]'
                }`}
                >
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#F6EAFE]">
                    <Icon className="h-[18px] w-[18px] text-[#7B2DD9]" />
                </span>

                <span className="text-center text-xs font-medium text-[#38294E]">
                    {action.label}
                </span>
                </button>
            );
            })}
        </div>
        </section>
    );
}