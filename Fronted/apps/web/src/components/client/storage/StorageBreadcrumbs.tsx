'use client';

import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbNode {
  id: string | null;
  name: string;
}

interface StorageBreadcrumbsProps {
  pathStack: BreadcrumbNode[];
  onNavigate: (index: number) => void;
}

export default function StorageBreadcrumbs({ pathStack, onNavigate }: StorageBreadcrumbsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 select-none text-xs font-normal text-neutral-500">
      {pathStack.map((node, index) => {
        const isLast = index === pathStack.length - 1;
        return (
          <div key={node.id || 'root'} className="flex items-center gap-1 shrink-0">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
            <button
              type="button"
              onClick={() => onNavigate(index)}
              className={`flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md ${
                isLast
                  ? 'font-semibold text-neutral-900 bg-neutral-100'
                  : 'hover:text-neutral-900 hover:underline'
              }`}
            >
              {index === 0 && <Home className="w-3.5 h-3.5 text-neutral-500" />}
              <span>{node.name}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
