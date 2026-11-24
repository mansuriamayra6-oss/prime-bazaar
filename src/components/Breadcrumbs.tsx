import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbNode } from '../data/categories';

interface BreadcrumbsProps {
  items: BreadcrumbNode[];
  onNavigate: (categoryId: string, subcategoryId?: string | null) => void;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate, className = '' }) => {
  if (!items || items.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 overflow-x-auto no-scrollbar py-1 ${className}`}
    >
      <ol className="flex items-center gap-1.5 min-w-0">
        {items.map((node, index) => {
          const isLast = index === items.length - 1 || Boolean(node.isCurrent);
          const isHome = index === 0;

          return (
            <li key={`${node.label}-${index}`} className="flex items-center gap-1.5 min-w-0 shrink-0 last:shrink">
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />}
              {isLast || !node.categoryId ? (
                <span
                  aria-current="page"
                  className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px] sm:max-w-[280px]"
                  title={node.label}
                >
                  {node.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(node.categoryId!, node.subcategoryId ?? null)}
                  className="inline-flex items-center gap-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap font-medium focus:outline-none focus:underline"
                >
                  {isHome && <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  <span>{node.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
