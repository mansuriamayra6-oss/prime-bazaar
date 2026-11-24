import { CategoryDepartment, Product } from '../types';

export const FASHION_DEPARTMENTS: CategoryDepartment[] = [
  {
    id: 'womens-fashion',
    label: "Women's Fashion",
    group: 'fashion',
    tagline: 'Festive silks, Chanderi sarees & tailored western silhouettes',
    promoTitle: 'Festive Silk & Kurti Edit — Up to 55% Off',
    promoImage: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
    subcategories: [
      { id: 'anarkali-kurti', label: 'Anarkali & Kurti Sets', keywords: ['anarkali', 'kurti', 'zari', 'silk'] },
      { id: 'sarees', label: 'Handloom & Chanderi Sarees', keywords: ['saree', 'chanderi', 'block print', 'blouse'] },
      { id: 'western-trousers', label: 'Western & Wide-Leg Trousers', keywords: ['trousers', 'wide-leg', 'pleated', 'western'] },
      { id: 'ethnic', label: 'Ethnic & Festive Wear', keywords: ['ethnic', 'festive', 'sangeet', 'dupatta'] },
    ],
  },
  {
    id: 'mens-fashion',
    label: "Men's Fashion",
    group: 'fashion',
    tagline: 'Heavyweight 420 GSM streetwear, cargo outerwear & tees',
    promoTitle: 'Urban Streetwear Drop — Direct From Studios',
    promoImage: '/src/assets/images/collection_streetwear_1793466541088.jpg',
    subcategories: [
      { id: 'cargo-jackets', label: 'Utility & Cargo Jackets', keywords: ['cargo', 'jacket', 'twill', 'outerwear'] },
      { id: 'oversized-tees', label: 'Acid Wash & Graphic Tees', keywords: ['tee', 't-shirt', 'acid wash', 'graphic', 'oversized'] },
      { id: 'streetwear', label: 'All Streetwear & Layers', keywords: ['streetwear', 'boxy', 'urban'] },
    ],
  },
  {
    id: 'kids-fashion',
    label: "Kids' Fashion",
    group: 'fashion',
    tagline: 'Play-ready cotton sets & festive ethnic ensembles for kids',
    promoTitle: 'Junior Festive & Everyday Capsule',
    promoImage: '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
    subcategories: [
      { id: 'kids-festive', label: 'Festive Kurtas & Sets', keywords: ['kids', 'junior', 'boys', 'girls'] },
      { id: 'kids-everyday', label: 'Everyday Tees & Denim', keywords: ['kids', 'cotton set', 'children'] },
    ],
  },
  {
    id: 'footwear',
    label: 'Shoes',
    group: 'fashion',
    tagline: 'Sculpted platform sneakers & all-day cushioned trainers',
    promoTitle: 'Monolith & AeroStep Footwear Edit',
    promoImage: '/src/assets/images/collection_footwear_1793466541533.jpg',
    subcategories: [
      { id: 'platform-sneakers', label: 'Platform Sneakers', keywords: ['sneaker', 'platform', 'calfskin', 'footwear'] },
      { id: 'casual-shoes', label: 'Everyday Comfort Trainers', keywords: ['trainer', 'shoe', 'ortholite'] },
    ],
  },
  {
    id: 'bags',
    label: 'Bags',
    group: 'fashion',
    tagline: 'Structured vegan leather totes & saddle crossbody bags',
    promoTitle: 'Workwear Totes & Weekend Crossbodies',
    promoImage: '/src/assets/images/collection_footwear_1793466541533.jpg',
    subcategories: [
      { id: 'tote-bags', label: 'Structured Work Totes', keywords: ['tote', 'laptop', 'vegan leather', 'atelier'] },
      { id: 'saddle-bags', label: 'Crossbody & Saddle Bags', keywords: ['saddle bag', 'crossbody', 'bag'] },
    ],
  },
  {
    id: 'watches',
    label: 'Watches',
    group: 'fashion',
    tagline: 'Minimalist dress dials & smart connected accessories',
    promoTitle: 'Precision Timepieces & Connected Tech',
    promoImage: '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
    subcategories: [
      { id: 'analog-watches', label: 'Analog & Minimalist', keywords: ['watch', 'chronograph', 'dial'] },
      { id: 'smart-wearables', label: 'Smart & Audio Wearables', keywords: ['watch', 'smartwatch', 'anc', 'earbuds'] },
    ],
  },
  {
    id: 'jewellery',
    label: 'Jewelry',
    group: 'fashion',
    tagline: 'Rajwadi Kundan chokers, jhumkas & freshwater pearl accents',
    promoTitle: 'Jaipur Kundan & Bridal Statements',
    promoImage: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
    subcategories: [
      { id: 'kundan-chokers', label: 'Kundan Chokers & Necklaces', keywords: ['kundan', 'choker', 'bridal', 'necklace'] },
      { id: 'jhumkas-earrings', label: 'Jhumkas & Festive Sets', keywords: ['jhumka', 'maang tikka', 'jewel', 'brass'] },
    ],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    group: 'fashion',
    tagline: 'Handcrafted totes, Kundan sets & everyday essentials',
    promoTitle: 'Curated Finishing Touches',
    promoImage: '/src/assets/images/collection_streetwear_1793466541088.jpg',
    subcategories: [
      { id: 'everyday-carry', label: 'Laptop Totes & Carryalls', keywords: ['tote', 'bag', 'vegan leather'] },
      { id: 'ethnic-jewellery', label: 'Festive Jewellery Sets', keywords: ['kundan', 'choker', 'jhumka'] },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Care',
    group: 'fashion',
    tagline: 'Cold-pressed Ayurvedic Kumkumadi elixirs & glow rituals',
    promoTitle: 'Pure Botanical Skincare — Starting ₹649',
    promoImage: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
    subcategories: [
      { id: 'serums-elixirs', label: 'Saffron & Kumkumadi Serums', keywords: ['kumkumadi', 'serum', 'saffron', 'elixir'] },
      { id: 'skincare-rituals', label: 'Ayurvedic Skincare', keywords: ['ayurvedic', 'skincare', 'facial oil', 'botanical'] },
    ],
  },
];

export const EXPANDABLE_DEPARTMENTS: CategoryDepartment[] = [
  {
    id: 'electronics',
    label: 'Electronics',
    group: 'more',
    tagline: 'Spatial ANC audio, charging & smart accessories',
    promoTitle: 'Sound & Mobile Essentials',
    promoImage: '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
    subcategories: [
      { id: 'audio', label: 'ANC Earbuds & Audio', keywords: ['earbuds', 'anc', 'audio', 'wireless'] },
      { id: 'mobile-accessories', label: 'Mobile Accessories', keywords: ['mobile', 'charger', 'cable'] },
    ],
  },
  {
    id: 'home-kitchen',
    label: 'Home & Kitchen',
    group: 'more',
    tagline: 'Hand-etched brass masala dabbas & heritage kitchenware',
    promoTitle: 'Heritage Indian Kitchen Craft',
    promoImage: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
    subcategories: [
      { id: 'kitchen-utensils', label: 'Brass Spice Organizers', keywords: ['brass', 'masala dabba', 'kitchen'] },
      { id: 'furniture', label: 'Home Decor & Accents', keywords: ['decor', 'furniture', 'lamp'] },
    ],
  },
  {
    id: 'sports-outdoor',
    label: 'Sports & Fitness',
    group: 'more',
    tagline: 'Eco TPE alignment yoga mats & daily movement gear',
    promoTitle: 'Mindful Studio & Home Fitness',
    promoImage: '/src/assets/images/collection_footwear_1793466541533.jpg',
    subcategories: [
      { id: 'fitness', label: 'Yoga Mats & Training', keywords: ['yoga', 'mat', 'fitness', 'tpe'] },
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Lifestyle',
    group: 'more',
    tagline: 'Organized carryalls, weekend totes & travel essentials',
    promoTitle: 'Upcoming Marketplace Expansion',
    promoImage: '/src/assets/images/collection_streetwear_1793466541088.jpg',
    subcategories: [
      { id: 'travel-bags', label: 'Cabin & Work Totes', keywords: ['tote', 'travel', 'luggage'] },
    ],
  },
];

export const ALL_DEPARTMENTS: CategoryDepartment[] = [...FASHION_DEPARTMENTS, ...EXPANDABLE_DEPARTMENTS];

export function findDepartmentById(categoryId: string): CategoryDepartment | undefined {
  return ALL_DEPARTMENTS.find(d => d.id === categoryId);
}

export function findSubcategoryById(categoryId: string, subcategoryId: string | null) {
  if (!subcategoryId) return undefined;
  const dept = findDepartmentById(categoryId);
  return dept?.subcategories.find(s => s.id === subcategoryId);
}

const buildProductCorpus = (p: Product): string =>
  [p.title, p.brand, p.category, p.subcategory, p.description, p.fabric, p.fit]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function matchesDepartmentCategory(product: Product, categoryId: string): boolean {
  if (!categoryId || categoryId === 'all') return true;
  if (product.category === categoryId) return true;

  const corpus = buildProductCorpus(product);

  switch (categoryId) {
    case 'fashion':
      return ['ethnic', 'streetwear', 'western', 'fashion', 'mens-fashion', 'womens-fashion', 'kids-fashion', 'footwear', 'accessories', 'jewellery'].includes(product.category);
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
    case 'travel':
      return product.category === 'travel' || corpus.includes('tote') || corpus.includes('luggage');
    default:
      return product.category === categoryId;
  }
}

export function matchesCategoryAndSubcategory(
  product: Product,
  categoryId: string,
  subcategoryId: string | null
): boolean {
  if (!matchesDepartmentCategory(product, categoryId)) {
    return false;
  }
  if (!subcategoryId) return true;

  const sub = findSubcategoryById(categoryId, subcategoryId);
  if (!sub) return true;

  const corpus = buildProductCorpus(product);
  if (product.category === sub.id || product.subcategory?.toLowerCase() === sub.label.toLowerCase()) {
    return true;
  }
  return sub.keywords.some(kw => corpus.includes(kw.toLowerCase()));
}

export function resolveProductPrimaryDepartment(product: Product): CategoryDepartment {
  if (product.category === 'ethnic' || product.category === 'western' || product.category === 'womens-fashion') {
    return FASHION_DEPARTMENTS[0]; // Women's Fashion
  }
  if (product.category === 'streetwear' || product.category === 'mens-fashion') {
    return FASHION_DEPARTMENTS[1]; // Men's Fashion
  }
  if (product.category === 'kids-fashion') {
    return FASHION_DEPARTMENTS[2]; // Kids' Fashion
  }
  if (product.category === 'footwear') {
    return FASHION_DEPARTMENTS[3]; // Shoes
  }
  const corpus = buildProductCorpus(product);
  if (corpus.includes('kundan') || corpus.includes('choker') || product.category === 'jewellery') {
    return FASHION_DEPARTMENTS[6]; // Jewelry
  }
  if (corpus.includes('tote') || product.category === 'bags') {
    return FASHION_DEPARTMENTS[4]; // Bags
  }
  return ALL_DEPARTMENTS.find(d => d.id === product.category) || FASHION_DEPARTMENTS[7];
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
}): BreadcrumbNode[] {
  const nodes: BreadcrumbNode[] = [{ label: 'Home', categoryId: 'all', subcategoryId: null }];

  if (params.product) {
    const dept = resolveProductPrimaryDepartment(params.product);
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
    const dept = findDepartmentById(params.selectedCategory);
    if (dept) {
      if (dept.group === 'fashion') {
        nodes.push({ label: 'Fashion', categoryId: 'fashion', subcategoryId: null });
      } else {
        nodes.push({ label: 'All Departments', categoryId: 'all', subcategoryId: null });
      }
      const sub = findSubcategoryById(dept.id, params.selectedSubcategory || null);
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
