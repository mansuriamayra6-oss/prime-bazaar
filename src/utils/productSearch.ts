import { Product } from '../types';

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  all: 'All Collections',
  ethnic: 'Ethnic & Festive',
  streetwear: 'Streetwear & Cargo',
  western: 'Western Wear',
  fashion: 'Fashion & Clothing',
  'mens-fashion': "Men's Fashion",
  'womens-fashion': "Women's Fashion",
  'kids-fashion': "Kids' Fashion",
  footwear: 'Shoes & Footwear',
  accessories: 'Bags & Accessories',
  jewellery: 'Jewellery & Watches',
  beauty: 'Beauty & Cosmetics',
  health: 'Health & Personal Care',
  'home-kitchen': 'Home & Kitchen',
  furniture: 'Furniture & Decoration',
  electronics: 'Electronics',
  'mobile-accessories': 'Mobile Accessories',
  computers: 'Computers & Accessories',
  'toys-games': 'Toys & Games',
  'baby-products': 'Baby Products',
  'sports-outdoor': 'Sports & Outdoor',
  automotive: 'Automotive Accessories',
  'office-supplies': 'Office Supplies',
  'pet-supplies': 'Pet Supplies',
  'garden-products': 'Garden Products',
  'diy-tools': 'DIY & Tools',
  handmade: 'Handmade Products',
  travel: 'Travel Accessories',
};

const normalizeText = (value?: string): string =>
  (value || '').toLowerCase().replace(/[-_&]/g, ' ').replace(/\s+/g, ' ').trim();

export const getCategoryDisplayName = (category: string): string => {
  if (CATEGORY_LABEL_MAP[category]) {
    return CATEGORY_LABEL_MAP[category];
  }
  return category
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const matchesProductSearch = (product: Product, rawQuery: string): boolean => {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return true;

  const productName = ((product as Product & { name?: string }).name || product.title || '').toLowerCase();
  const rawCategory = (product.category || '').toLowerCase();
  const displayCategory = getCategoryDisplayName(product.category || '').toLowerCase();
  const normalizedCategory = normalizeText(displayCategory);
  const subcategory = (product.subcategory || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const isFashionAlias = ['ethnic', 'streetwear', 'western', 'fashion', 'mens-fashion', 'womens-fashion', 'kids-fashion'].includes(rawCategory);

  const searchablePool = [
    productName,
    normalizeText(productName),
    rawCategory,
    normalizeText(rawCategory),
    displayCategory,
    normalizedCategory,
    subcategory,
    normalizeText(subcategory),
    brand,
    description,
    isFashionAlias ? 'fashion clothing apparel' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (searchablePool.includes(trimmed) || searchablePool.includes(normalizeText(trimmed))) {
    return true;
  }

  const terms = normalizeText(trimmed).split(' ').filter(Boolean);
  return terms.length > 0 && terms.every(term => searchablePool.includes(term));
};

export const filterProductsBySearch = (products: Product[], rawQuery: string): Product[] => {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return products;

  const matched = products.filter(product => matchesProductSearch(product, trimmed));

  return [...matched].sort((a, b) => {
    const score = (p: Product): number => {
      const name = ((p as Product & { name?: string }).name || p.title || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const catLabel = getCategoryDisplayName(p.category || '').toLowerCase();

      if (name.startsWith(trimmed)) return 5;
      if (cat === trimmed || catLabel === trimmed) return 4;
      if (name.includes(trimmed)) return 3;
      if (cat.includes(trimmed) || catLabel.includes(trimmed)) return 2;
      return 1;
    };

    return score(b) - score(a);
  });
};
