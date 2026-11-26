import { CategoryDepartment, Product } from '../types';
import { findDepartmentById, matchesDepartmentCategory } from './categories';

export const STOREFRONT_PRIMARY_NAV_IDS = [
  'womens-fashion',
  'mens-fashion',
  'kids-fashion',
  'footwear',
  'bags',
  'watches',
  'jewellery',
  'accessories',
  'beauty',
  'electronics',
] as const;

export const STOREFRONT_FASHION_NAV_IDS = [
  'womens-fashion',
  'mens-fashion',
  'kids-fashion',
  'footwear',
  'bags',
  'watches',
  'jewellery',
  'accessories',
  'beauty',
] as const;

export const STOREFRONT_ELECTRONICS_CATEGORY_IDS = [
  'electronics',
  'mobile-accessories',
] as const;

export const STOREFRONT_NAV_LABELS: Record<string, string> = {
  'womens-fashion': "Women's Fashion",
  'mens-fashion': "Men's Fashion",
  'kids-fashion': "Kids' Fashion",
  footwear: 'Shoes',
  bags: 'Bags',
  watches: 'Watches',
  jewellery: 'Jewellery',
  accessories: 'Fashion Accessories',
  beauty: 'Beauty',
  electronics: 'Electronics',
  'mobile-accessories': 'Mobile Accessories',
};

const ALLOWED_PRODUCT_CATEGORIES = new Set<string>([
  'ethnic',
  'streetwear',
  'western',
  'fashion',
  'womens-fashion',
  'mens-fashion',
  'kids-fashion',
  'luxury-designer',
  'footwear',
  'bags',
  'watches',
  'jewellery',
  'accessories',
  'beauty',
  'electronics',
  'mobile-accessories',
]);

export function getStorefrontDepartments(
  allDepartments: CategoryDepartment[]
): CategoryDepartment[] {
  const result: CategoryDepartment[] = [];
  for (const id of STOREFRONT_PRIMARY_NAV_IDS) {
    const found = findDepartmentById(id, allDepartments);
    if (found && found.isActive !== false) {
      result.push({
        ...found,
        label: STOREFRONT_NAV_LABELS[id] || found.label,
      });
    }
  }
  return result;
}

export function isStorefrontFashionProduct(product: Product): boolean {
  const cat = (product.category || '').toLowerCase();
  return (
    ALLOWED_PRODUCT_CATEGORIES.has(cat) &&
    cat !== 'electronics' &&
    cat !== 'mobile-accessories'
  );
}

export function isStorefrontElectronicsProduct(product: Product): boolean {
  const cat = (product.category || '').toLowerCase();
  if (cat === 'electronics' || cat === 'mobile-accessories') return true;
  const corpus = `${product.title} ${product.subcategory || ''} ${product.description || ''}`.toLowerCase();
  return (
    corpus.includes('earbud') ||
    corpus.includes('headphone') ||
    corpus.includes('smartwatch') ||
    corpus.includes('smart watch') ||
    corpus.includes('charger') ||
    corpus.includes('anc ')
  );
}

export function isStorefrontFeaturedProduct(
  product: Product,
  selectedCategory: string,
  allDepartments: CategoryDepartment[]
): boolean {
  // When user explicitly picks a category, respect exact matching
  if (selectedCategory && selectedCategory !== 'all') {
    return matchesDepartmentCategory(product, selectedCategory, allDepartments);
  }
  // On main Fashion-first + Electronics storefront view, keep focus on Fashion + Electronics
  const cat = (product.category || '').toLowerCase();
  return ALLOWED_PRODUCT_CATEGORIES.has(cat) || isStorefrontElectronicsProduct(product);
}
