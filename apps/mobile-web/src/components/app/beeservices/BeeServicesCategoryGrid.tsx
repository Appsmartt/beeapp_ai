'use client';

import {
    BriefcaseBusiness,
    Gavel,
    Scissors,
    Utensils,
    } from 'lucide-react';
import {
    BEE_SERVICES_POPULAR_CATEGORIES,
    BeeServicesCategory,
    } from '@/mocks/beeServicesExplore';

interface BeeServicesCategoryGridProps {
    selectedCategoryId: string | null;
    onPressCategory: (category: BeeServicesCategory) => void;
}

const CATEGORY_ICONS = {
    briefcase: BriefcaseBusiness,
    utensils: Utensils,
    scissors: Scissors,
    gavel: Gavel,
};

export default function BeeServicesCategoryGrid({
    selectedCategoryId,
    onPressCategory,
    }: BeeServicesCategoryGridProps) {
    return (
        <section>
        <h2 className="mb-3 text-base font-bold text-[#261743]">
            Categorías populares
        </h2>

        <div className="grid grid-cols-2 gap-3">
            {BEE_SERVICES_POPULAR_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            const isSelected = selectedCategoryId === category.id;

            return (
                <button
                key={category.id}
                type="button"
                onClick={() => onPressCategory(category)}
                className={`min-h-[142px] rounded-[18px] border p-4 text-left transition-all ${
                    isSelected
                    ? 'border-[#7427D5] bg-[#F6EAFE] shadow-[0_5px_16px_rgba(116,39,213,0.14)]'
                    : 'border-[#F0EAF3] bg-white shadow-[0_4px_9px_rgba(42,26,69,0.07)] hover:-translate-y-0.5 hover:border-[#E8D1F1]'
                }`}
                >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F6EAFE]">
                    <Icon className="h-[21px] w-[21px] text-[#7B2DD9]" />
                </span>

                <span className="block text-[15px] font-bold text-[#2D2141]">
                    {category.title}
                </span>

                <span className="mt-1 block text-[11px] leading-[15px] text-[#8A72B2]">
                    {category.subtitle}
                </span>
                </button>
            );
            })}
        </div>
        </section>
    );
}