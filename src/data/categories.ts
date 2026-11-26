import { CategoryDepartment, Product } from '../types';
import { MASTER_34_CATEGORIES, MasterCategoryDefinition } from './categoriesMaster';

export function mapRawCategoryToDepartment(raw: Partial<MasterCategoryDefinition> & { id: string; name?: string; label?: string; slug?: string }): CategoryDepartment {
  const slug = raw.slug || raw.id;
  const fallback = MASTER_34_CATEGORIES.find(c => c.slug === slug || c.id === raw.id);
  const isFashion =
    typeof raw.isFashionPriority === 'boolean'
      ? raw.isFashionPriority
      : raw.group
      ? raw.group === 'fashion'
      : fallback?.isFashionPriority ?? false;

  return {
    id: slug,
    slug,
    label: raw.name || raw.label || fallback?.name || slug,
    group: raw.group || (isFashion ? 'fashion' : 'more'),
    sector: raw.sector || fallback?.sector || (isFashion ? 'Fashion & Apparel' : 'Marketplace Expansion'),
    displayOrder: raw.displayOrder ?? fallback?.displayOrder ?? 99,
    isActive: raw.isActive !== false,
    isFashionPriority: isFashion,
    tagline: raw.tagline || fallback?.tagline || '',
    promoTitle: raw.promoTitle || fallback?.promoTitle || raw.name || slug,
    promoImage: raw.imageUrl || (raw as any).promoImage || fallback?.imageUrl || '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
    bannerUrl: raw.bannerUrl || fallback?.bannerUrl || raw.imageUrl || '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
    seoTitle: raw.seoTitle || fallback?.seoTitle,
    seoDescription: raw.seoDescription || fallback?.seoDescription,
    attributes: Array.isArray(raw.attributes) ? raw.attributes : fallback?.attributes || [],
    subcategories: Array.isArray(raw.subcategories) && raw.subcategories.length > 0
      ? raw.subcategories
      : fallback?.subcategories || [],
  };
}

export const ALL_DEPARTMENTS: CategoryDepartment[] = MASTER_34_CATEGORIES.map(c =>
  mapRawCategoryToDepartment(c)
);

export const FASHION_DEPARTMENTS: CategoryDepartment[] = ALL_DEPARTMENTS.filter(
  d => d.group === 'fashion'
);

export const EXPANDABLE_DEPARTMENTS: CategoryDepartment[] = ALL_DEPARTMENTS.filter(
  d => d.group === 'more'
);

export function findDepartmentById(
  categoryId: string,
  departments: CategoryDepartment[] = ALL_DEPARTMENTS
): CategoryDepartment | undefined {
  return departments.find(d => d.id === categoryId || d.slug === categoryId);
}

export function findSubcategoryById(
  categoryId: string,
  subcategoryId: string | null,
  departments: CategoryDepartment[] = ALL_DEPARTMENTS
) {
  if (!subcategoryId) return undefined;
  const dept = findDepartmentById(categoryId, departments);
  return dept?.subcategories.find(s => s.id === subcategoryId);
}

const buildProductCorpus = (p: Product): string =>
  [p.title, p.brand, p.category, p.subcategory, p.description, p.fabric, p.fit]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function matchesDepartmentCategory(
  product: Product,
  categoryId: string,
  departments: CategoryDepartment[] = ALL_DEPARTMENTS
): boolean {
  if (!categoryId || categoryId === 'all') return true;
  if (product.category === categoryId) return true;

  const corpus = buildProductCorpus(product);
  const dept = findDepartmentById(categoryId, departments);

  switch (categoryId) {
    case 'fashion':
      return [
        'ethnic',
        'streetwear',
        'western',
        'fashion',
        'mens-fashion',
        'womens-fashion',
        'kids-fashion',
        'luxury-designer',
        'footwear',
        'bags',
        'watches',
        'accessories',
        'jewellery',
        'beauty',
      ].includes(product.category);
    case 'womens-fashion':
      return (
        product.category === 'ethnic' ||
        product.category === 'western' ||
        product.category === 'womens-fashion' ||
        corpus.includes('kurti') ||
        corpus.includes('saree') ||
        corpus.includes('wide-leg') ||
        corpus.includes('anarkali')
      );
    case 'mens-fashion':
      return (
        product.category === 'streetwear' ||
        product.category === 'mens-fashion' ||
        corpus.includes('cargo') ||
        corpus.includes('oversized')
      );
    case 'kids-fashion':
      return product.category === 'kids-fashion' || corpus.includes('kids') || corpus.includes('junior');
    case 'bags':
      return (
        product.category === 'bags' ||
        corpus.includes('tote') ||
        corpus.includes('saddle bag') ||
        corpus.includes('crossbody')
      );
    case 'jewellery':
      return (
        product.category === 'jewellery' ||
        corpus.includes('kundan') ||
        corpus.includes('jhumka') ||
        corpus.includes('choker')
      );
    case 'watches':
      return product.category === 'watches' || corpus.includes('watch');
    case 'ethnic':
      return product.category === 'ethnic';
    case 'streetwear':
      return product.category === 'streetwear';
    case 'western':
      return product.category === 'western';
    case 'footwear':
      return product.category === 'footwear' || corpus.includes('sneaker');
    case 'accessories':
      return product.category === 'accessories' || product.category === 'jewellery' || product.category === 'bags';
    case 'electronics':
      return (
        product.category === 'electronics' ||
        product.category === 'mobile-accessories' ||
        corpus.includes('earbud') ||
        corpus.includes('smartwatch') ||
        corpus.includes('charger')
      );
    case 'travel':
      return product.category === 'travel' || corpus.includes('tote') || corpus.includes('luggage');
    default: {
      if (product.category === categoryId) return true;
      if (dept && dept.subcategories.some(s => s.keywords.some(kw => corpus.includes(kw.toLowerCase())))) {
        return true;
      }
      return false;
    }
  }
}

export function matchesCategoryAndSubcategory(
  product: Product,
  categoryId: string,
  subcategoryId: string | null,
  departments: CategoryDepartment[] = ALL_DEPARTMENTS
): boolean {
  if (!matchesDepartmentCategory(product, categoryId, departments)) {
    return false;
  }
  if (!subcategoryId) return true;

  const sub = findSubcategoryById(categoryId, subcategoryId, departments);
  if (!sub) return true;

  const corpus = buildProductCorpus(product);
  if (product.category === sub.id || product.subcategory?.toLowerCase() === sub.label.toLowerCase()) {
    return true;
  }
  return sub.keywords.some(kw => corpus.includes(kw.toLowerCase()));
}

export function resolveProductPrimaryDepartment(
  product: Product,
  departments: CategoryDepartment[] = ALL_DEPARTMENTS
): CategoryDepartment {
  if (product.category === 'ethnic' || product.category === 'western' || product.category === 'womens-fashion') {
    return findDepartmentById('womens-fashion', departments) || ALL_DEPARTMENTS[0];
  }
  if (product.category === 'streetwear' || product.category === 'mens-fashion') {
    return findDepartmentById('mens-fashion', departments) || ALL_DEPARTMENTS[1];
  }
  if (product.category === 'kids-fashion') {
    return findDepartmentById('kids-fashion', departments) || ALL_DEPARTMENTS[2];
  }
  if (product.category === 'footwear') {
    return findDepartmentById('footwear', departments) || ALL_DEPARTMENTS[3];
  }
  const corpus = buildProductCorpus(product);
  if (corpus.includes('kundan') || corpus.includes('choker') || product.category === 'jewellery') {
    return findDepartmentById('jewellery', departments) || ALL_DEPARTMENTS[6];
  }
  if (corpus.includes('tote') || product.category === 'bags') {
    return findDepartmentById('bags', departments) || ALL_DEPARTMENTS[4];
  }
  return (
    departments.find(d => d.id === product.category || d.slug === product.category) ||
    ALL_DEPARTMENTS.find(d => d.id === product.category) ||
    ALL_DEPARTMENTS[7]
  );
}

export interface BreadcrumbNode {
  label: string;
  categoryId?: string;
  subcategoryId?: string | null;
  isCurrent?: boolean;
}

export function buildBreadcrumbs(params: {
  selectedCategory: string;
  selectedSubcategory?: string | null;
  searchQuery?: string;
  product?: Product | null;
  departments?: CategoryDepartment[];
}): BreadcrumbNode[] {
  const departments = params.departments || ALL_DEPARTMENTS;
  const nodes: BreadcrumbNode[] = [{ label: 'Home', categoryId: 'all', subcategoryId: null }];

  if (params.product) {
    const dept = resolveProductPrimaryDepartment(params.product, departments);
    if (dept.group === 'fashion') {
      nodes.push({ label: 'Fashion', categoryId: 'fashion', subcategoryId: null });
    }
    nodes.push({ label: dept.label, categoryId: dept.id, subcategoryId: null });
    if (params.product.subcategory) {
      nodes.push({ label: params.product.subcategory, categoryId: dept.id, subcategoryId: null });
    }
    nodes.push({ label: params.product.title, isCurrent: true });
    return nodes;
  }

  if (params.selectedCategory && params.selectedCategory !== 'all') {
    const dept = findDepartmentById(params.selectedCategory, departments);
    if (dept) {
      if (dept.group === 'fashion') {
        nodes.push({ label: 'Fashion', categoryId: 'fashion', subcategoryId: null });
      } else {
        nodes.push({ label: 'All Departments', categoryId: 'all', subcategoryId: null });
      }
      const sub = findSubcategoryById(dept.id, params.selectedSubcategory || null, departments);
      nodes.push({
        label: dept.label,
        categoryId: dept.id,
        subcategoryId: null,
        isCurrent: !sub && !params.searchQuery?.trim(),
      });
      if (sub) {
        nodes.push({
          label: sub.label,
          categoryId: dept.id,
          subcategoryId: sub.id,
          isCurrent: !params.searchQuery?.trim(),
        });
      }
    } else {
      nodes.push({
        label: params.selectedCategory === 'fashion' ? 'Fashion' : params.selectedCategory,
        categoryId: params.selectedCategory,
        subcategoryId: null,
        isCurrent: !params.searchQuery?.trim(),
      });
    }
  }

  if (params.searchQuery?.trim()) {
    nodes.push({ label: `Search: "${params.searchQuery.trim()}"`, isCurrent: true });
  }

  return nodes;
}
