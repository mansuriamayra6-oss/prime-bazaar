import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  Sparkles, 
  Shirt, 
  User, 
  Footprints, 
  ShoppingBag, 
  Watch, 
  Palette, 
  HeartPulse, 
  Home, 
  Tv, 
  Headphones, 
  Laptop, 
  Gamepad2, 
  Baby, 
  Dumbbell, 
  Car, 
  Briefcase, 
  Dog, 
  Flower2, 
  Wrench, 
  Scissors, 
  Luggage,
  Compass,
  Flame,
  Lamp
} from 'lucide-react';

export const CATEGORIES_LIST = [
  { id: 'all', label: 'All Collections', icon: Sparkles },
  { id: 'ethnic', label: 'Ethnic & Festive', icon: Compass },
  { id: 'streetwear', label: 'Streetwear & Cargo', icon: Flame },
  { id: 'fashion', label: 'Fashion & Clothing', icon: Shirt },
  { id: 'mens-fashion', label: "Men's Fashion", icon: User },
  { id: 'womens-fashion', label: "Women's Fashion", icon: Sparkles },
  { id: 'kids-fashion', label: "Kids' Fashion", icon: Baby },
  { id: 'footwear', label: 'Shoes & Footwear', icon: Footprints },
  { id: 'accessories', label: 'Bags & Accessories', icon: ShoppingBag },
  { id: 'jewellery', label: 'Jewellery & Watches', icon: Watch },
  { id: 'beauty', label: 'Beauty & Cosmetics', icon: Palette },
  { id: 'health', label: 'Health & Personal Care', icon: HeartPulse },
  { id: 'home-kitchen', label: 'Home & Kitchen', icon: Home },
  { id: 'furniture', label: 'Furniture & Decoration', icon: Lamp },
  { id: 'electronics', label: 'Electronics', icon: Tv },
  { id: 'mobile-accessories', label: 'Mobile Accessories', icon: Headphones },
  { id: 'computers', label: 'Computers & Accessories', icon: Laptop },
  { id: 'toys-games', label: 'Toys & Games', icon: Gamepad2 },
  { id: 'baby-products', label: 'Baby Products', icon: Baby },
  { id: 'sports-outdoor', label: 'Sports & Outdoor', icon: Dumbbell },
  { id: 'automotive', label: 'Automotive Accessories', icon: Car },
  { id: 'office-supplies', label: 'Office Supplies', icon: Briefcase },
  { id: 'pet-supplies', label: 'Pet Supplies', icon: Dog },
  { id: 'garden-products', label: 'Garden Products', icon: Flower2 },
  { id: 'diy-tools', label: 'DIY & Tools', icon: Wrench },
  { id: 'handmade', label: 'Handmade Products', icon: Scissors },
  { id: 'travel', label: 'Travel Accessories', icon: Luggage }
];

export const CategoryBar: React.FC = () => {
  const { selectedCategory, setSelectedCategory, products } = useMarketplace();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-2 sm:my-3">
      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white font-display">
            Curated Category Departments
          </h2>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
            24 Departments
          </span>
        </div>
        <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
          {products.length} live products ready to ship
        </span>
      </div>

      {/* Horizontal scrolling segmented category buttons */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {CATEGORIES_LIST.map(cat => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'all' 
            ? products.length 
            : products.filter(p => p.category === cat.id || (cat.id === 'fashion' && (p.category === 'ethnic' || p.category === 'streetwear'))).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm ring-1 ring-zinc-700 dark:ring-zinc-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 dark:bg-zinc-900/20' : 'bg-zinc-200/60 dark:bg-zinc-700/60'}`}>
                {count > 0 ? count : 'New'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
