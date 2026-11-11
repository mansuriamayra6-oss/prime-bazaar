import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Sparkles, Shirt, Flame, Compass, Footprints, Watch } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Collections', icon: Sparkles },
  { id: 'ethnic', label: 'Ethnic & Festive', icon: Compass },
  { id: 'streetwear', label: 'Streetwear & Cargo', icon: Flame },
  { id: 'western', label: 'Western & Workwear', icon: Shirt },
  { id: 'footwear', label: 'Footwear & Kicks', icon: Footprints },
  { id: 'accessories', label: 'Bags & Jewellery', icon: Watch }
];

export const CategoryBar: React.FC = () => {
  const { selectedCategory, setSelectedCategory, products } = useMarketplace();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-2 sm:my-3">
      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white font-display">
          Curated Category Departments
        </h2>
        <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
          {products.length} live styles ready to ship
        </span>
      </div>

      {/* Horizontal scrolling segmented category buttons */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'all' 
            ? products.length 
            : products.filter(p => p.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 dark:bg-zinc-900/20' : 'bg-zinc-200/60 dark:bg-zinc-700/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
