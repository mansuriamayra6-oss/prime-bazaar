import { Product, Reel, Seller, Coupon, Address } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'Zari Embroidered Raw Silk Anarkali Kurti Set',
    brand: 'Anouk Heritage',
    category: 'ethnic',
    price: 1899,
    originalPrice: 3999,
    discountPercent: 52,
    rating: 4.8,
    reviewCount: 1420,
    inStock: 18,
    images: [
      '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'
    ],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    colors: [
      { name: 'Royal Indigo', hex: '#1E3A8A' },
      { name: 'Emerald Velvet', hex: '#064E3B' },
      { name: 'Crimson Wine', hex: '#881337' }
    ],
    sizes: [
      { size: 'XS', available: true, stockCount: 4 },
      { size: 'S', available: true, stockCount: 6 },
      { size: 'M', available: true, stockCount: 8 },
      { size: 'L', available: true, stockCount: 3 },
      { size: 'XL', available: false, stockCount: 0 },
      { size: 'XXL', available: true, stockCount: 2 }
    ],
    description: 'Bespoke hand-embroidered royal raw silk Kurti with intricate golden zari threadwork along the neckline, paired with tailored cigarette pants and a delicate organza dupatta.',
    fabric: 'Pure Raw Silk with Organza Dupatta',
    fit: 'Regular Tailored Fit',
    sellerId: 'seller-1',
    sellerName: 'Varanasi Weavers Co.',
    sellerRating: 4.9,
    codAvailable: true,
    returnPeriodDays: 7,
    isTrending: true,
    isBestSeller: true,
    reviews: [
      {
        id: 'rev-1',
        userName: 'Priya Sharma',
        rating: 5,
        date: '24 Oct 2026',
        comment: 'Absolutely stunning embroidery! The royal blue tone looks even richer in person. True to size and received compliments at my cousin’s sangeet.',
        verifiedPurchase: true,
        helpfulCount: 38
      },
      {
        id: 'rev-2',
        userName: 'Ayesha Khan',
        rating: 5,
        date: '18 Oct 2026',
        comment: 'High quality fabric, neat stitching and no loose threads. Very fast delivery and prompt updates.',
        verifiedPurchase: true,
        helpfulCount: 14
      }
    ]
  },
  {
    id: 'prod-2',
    title: 'Heavyweight Utility Oversized Cargo Jacket',
    brand: 'UrbanCraft NYC',
    category: 'streetwear',
    price: 2199,
    originalPrice: 4499,
    discountPercent: 51,
    rating: 4.7,
    reviewCount: 890,
    inStock: 25,
    images: [
      '/src/assets/images/collection_streetwear_1793466541088.jpg',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=800&q=80'
    ],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    colors: [
      { name: 'Sand Khaki', hex: '#D2B48C' },
      { name: 'Washed Charcoal', hex: '#374151' },
      { name: 'Sage Green', hex: '#4B5563' }
    ],
    sizes: [
      { size: 'S', available: true, stockCount: 5 },
      { size: 'M', available: true, stockCount: 12 },
      { size: 'L', available: true, stockCount: 7 },
      { size: 'XL', available: true, stockCount: 4 }
    ],
    description: 'Constructed from 420 GSM heavy brushed cotton twill featuring multi-pocket utility modules, reinforced metal snap closures, and dropped shoulders for a relaxed boxy silhouette.',
    fabric: '100% Heavy Twill Cotton (420 GSM)',
    fit: 'Boxy Oversized Fit',
    sellerId: 'seller-2',
    sellerName: 'Metropolis Apparel Hub',
    sellerRating: 4.6,
    codAvailable: true,
    returnPeriodDays: 7,
    isTrending: true,
    isNew: true,
    reviews: [
      {
        id: 'rev-3',
        userName: 'Rohan Mehta',
        rating: 5,
        date: '28 Oct 2026',
        comment: 'Insane build quality for ₹2,199. Feels like an international luxury streetwear label. Heavyweight and warm.',
        verifiedPurchase: true,
        helpfulCount: 22
      }
    ]
  },
  {
    id: 'prod-3',
    title: 'Sculpted Platform Leather Sneakers & Saddle Bag',
    brand: 'Monolith Studio',
    category: 'footwear',
    price: 2499,
    originalPrice: 4999,
    discountPercent: 50,
    rating: 4.9,
    reviewCount: 654,
    inStock: 14,
    images: [
      '/src/assets/images/collection_footwear_1793466541533.jpg',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80'
    ],
    colors: [
      { name: 'Chalk White', hex: '#F3F4F6' },
      { name: 'Tan Caramel', hex: '#B45309' },
      { name: 'Midnight Onyx', hex: '#111827' }
    ],
    sizes: [
      { size: 'UK 6', available: true, stockCount: 2 },
      { size: 'UK 7', available: true, stockCount: 4 },
      { size: 'UK 8', available: true, stockCount: 5 },
      { size: 'UK 9', available: true, stockCount: 3 },
      { size: 'UK 10', available: false, stockCount: 0 }
    ],
    description: 'Engineered with premium calfskin upper and ergonomic wave EVA midsole for all-day cloud cushion. Comes with an optional coordinated vegan leather crossbody saddle bag.',
    fabric: 'Full-Grain Vegan Calfskin with Memory Ortholite Sole',
    fit: 'True to Size',
    sellerId: 'seller-3',
    sellerName: 'AeroStep Footwear',
    sellerRating: 4.8,
    codAvailable: true,
    returnPeriodDays: 10,
    isTrending: true,
    reviews: [
      {
        id: 'rev-4',
        userName: 'Tanvi Joshi',
        rating: 5,
        date: '20 Oct 2026',
        comment: 'So lightweight yet gives great elevation. Walked 12,000 steps around Mumbai with zero shoe bites.',
        verifiedPurchase: true,
        helpfulCount: 19
      }
    ]
  },
  {
    id: 'prod-4',
    title: 'Floral Hand-Block Print Chanderi Cotton Saree',
    brand: 'Kalakriti Jaipur',
    category: 'ethnic',
    price: 1299,
    originalPrice: 2899,
    discountPercent: 55,
    rating: 4.6,
    reviewCount: 2120,
    inStock: 30,
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      '/src/assets/images/collection_ethnic_wear_1793466539838.jpg'
    ],
    colors: [
      { name: 'Blush Rose', hex: '#F43F5E' },
      { name: 'Mustard Gold', hex: '#D97706' },
      { name: 'Peacock Teal', hex: '#0D9488' }
    ],
    sizes: [
      { size: 'Free Size (5.5m + Blouse)', available: true, stockCount: 30 }
    ],
    description: 'Authentic Bagru hand-block printed Chanderi cotton saree with running blouse piece. Breathable, feather-light, and graceful for festive and everyday gatherings.',
    fabric: 'Pure Chanderi Silk Cotton Blend',
    sellerId: 'seller-1',
    sellerName: 'Varanasi Weavers Co.',
    sellerRating: 4.9,
    codAvailable: true,
    returnPeriodDays: 7,
    isBestSeller: true,
    reviews: [
      {
        id: 'rev-5',
        userName: 'Meenakshi Iyer',
        rating: 5,
        date: '25 Oct 2026',
        comment: 'The drape is so soft! Hand block details are authentic and colors didn’t bleed on first dry wash.',
        verifiedPurchase: true,
        helpfulCount: 42
      }
    ]
  },
  {
    id: 'prod-5',
    title: 'Wide-Leg Relaxed Pleated Trousers',
    brand: 'Maison Minimal',
    category: 'western',
    price: 1499,
    originalPrice: 2999,
    discountPercent: 50,
    rating: 4.5,
    reviewCount: 430,
    inStock: 16,
    images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80'
    ],
    colors: [
      { name: 'Alabaster Cream', hex: '#F5F5F4' },
      { name: 'Espresso Brown', hex: '#451A03' },
      { name: 'Slate Gray', hex: '#475569' }
    ],
    sizes: [
      { size: '28', available: true, stockCount: 4 },
      { size: '30', available: true, stockCount: 5 },
      { size: '32', available: true, stockCount: 4 },
      { size: '34', available: true, stockCount: 3 }
    ],
    description: 'Double front pleats with a fluid high-rise cut and concealed zipper waistband. Pairs seamlessly with tailored blazers or cropped knit tops.',
    fabric: 'Crease-Resistant Poly-Viscose Blend',
    fit: 'High-Rise Relaxed Wide Leg',
    sellerId: 'seller-2',
    sellerName: 'Metropolis Apparel Hub',
    sellerRating: 4.6,
    codAvailable: true,
    returnPeriodDays: 7,
    isNew: true,
    reviews: [
      {
        id: 'rev-6',
        userName: 'Sneha Roy',
        rating: 4,
        date: '15 Oct 2026',
        comment: 'Very chic Korean style look. Length is perfect with 2-inch heels.',
        verifiedPurchase: true,
        helpfulCount: 9
      }
    ]
  },
  {
    id: 'prod-6',
    title: 'Structured Vegan Leather Minimalist Tote',
    brand: 'Atelier Artisan',
    category: 'accessories',
    price: 1199,
    originalPrice: 2499,
    discountPercent: 52,
    rating: 4.8,
    reviewCount: 980,
    inStock: 22,
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80'
    ],
    colors: [
      { name: 'Cognac Saddle', hex: '#9A3412' },
      { name: 'Onyx Black', hex: '#000000' },
      { name: 'Sage Olive', hex: '#3F6212' }
    ],
    sizes: [
      { size: 'Standard (14" Laptop Compartment)', available: true, stockCount: 22 }
    ],
    description: 'Clean architectural structured tote bag featuring magnetic snap closure, padded 14-inch laptop sleeve, water-resistant microfiber lining, and key fob leash.',
    fabric: 'Cruelty-Free Vegan Leather',
    sellerId: 'seller-3',
    sellerName: 'AeroStep Footwear & Bags',
    sellerRating: 4.8,
    codAvailable: true,
    returnPeriodDays: 14,
    isBestSeller: true,
    reviews: [
      {
        id: 'rev-7',
        userName: 'Divya Nambiar',
        rating: 5,
        date: '12 Oct 2026',
        comment: 'Fits my MacBook Air, planner, water bottle and makeup pouch easily. The finish is immaculate.',
        verifiedPurchase: true,
        helpfulCount: 31
      }
    ]
  },
  {
    id: 'prod-7',
    title: 'Graphic Oversized Acid Wash Heavy Tee',
    brand: 'Subculture Tribe',
    category: 'streetwear',
    price: 799,
    originalPrice: 1699,
    discountPercent: 53,
    rating: 4.7,
    reviewCount: 1540,
    inStock: 40,
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80'
    ],
    colors: [
      { name: 'Washed Ash', hex: '#4B5563' },
      { name: 'Vintage Olive', hex: '#365314' },
      { name: 'Faded Black', hex: '#18181B' }
    ],
    sizes: [
      { size: 'S', available: true, stockCount: 8 },
      { size: 'M', available: true, stockCount: 15 },
      { size: 'L', available: true, stockCount: 12 },
      { size: 'XL', available: true, stockCount: 5 }
    ],
    description: '240 GSM combed cotton vintage acid washed t-shirt with high-density puff print typography on the back and drop-shoulder streetwear cut.',
    fabric: '100% Super Combed Heavy Cotton',
    fit: 'Oversized Drop Shoulder',
    sellerId: 'seller-2',
    sellerName: 'Metropolis Apparel Hub',
    sellerRating: 4.6,
    codAvailable: true,
    returnPeriodDays: 7,
    isTrending: true,
    reviews: [
      {
        id: 'rev-8',
        userName: 'Arjun Singhania',
        rating: 5,
        date: '02 Oct 2026',
        comment: 'Neck ribbing doesn’t sag after 5 washes. Best budget streetwear tee in India right now.',
        verifiedPurchase: true,
        helpfulCount: 55
      }
    ]
  },
  {
    id: 'prod-8',
    title: 'Handcrafted Kundan Choker & Jhumka Set',
    brand: 'Jaipur Jewels',
    category: 'accessories',
    price: 999,
    originalPrice: 2499,
    discountPercent: 60,
    rating: 4.8,
    reviewCount: 770,
    inStock: 19,
    images: [
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80'
    ],
    colors: [
      { name: 'Antique Gold / Pearl', hex: '#EAB308' },
      { name: 'Ruby Pink Accent', hex: '#BE123C' },
      { name: 'Mint Green Meenakari', hex: '#059669' }
    ],
    sizes: [
      { size: 'Adjustable Dori Thread', available: true, stockCount: 19 }
    ],
    description: 'Traditional Rajwadi micro-plated Kundan choker necklace paired with matching hanging Jhumkas and Maang Tikka. Finished with natural freshwater glass pearls.',
    fabric: 'Brass Alloy with 22K Micron Gold Dip',
    sellerId: 'seller-1',
    sellerName: 'Varanasi Weavers Co.',
    sellerRating: 4.9,
    codAvailable: true,
    returnPeriodDays: 7,
    isBestSeller: true,
    reviews: [
      {
        id: 'rev-9',
        userName: 'Kavita Patel',
        rating: 5,
        date: '10 Oct 2026',
        comment: 'Looks just like real gold Kundan! Wore it to Diwali pooja and everybody asked for the link.',
        verifiedPurchase: true,
        helpfulCount: 27
      }
    ]
  }
];

export const INITIAL_REELS: Reel[] = [
  {
    id: 'reel-1',
    creatorName: 'Aarushi Fashion',
    creatorHandle: '@aarushi_trends',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
    title: 'Festive Royal Silk Fit Check! 🌟',
    caption: 'How I styled this bespoke Zari silk kurti set for a festive evening. Get 15% off using code MEESHO20! Tap tagged link below to order.',
    likes: 4210,
    productId: 'prod-1',
    audioTitle: 'Original Audio · Aarushi Sounds'
  },
  {
    id: 'reel-2',
    creatorName: 'Kabir StreetStyle',
    creatorHandle: '@kabir_fits',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: '/src/assets/images/collection_streetwear_1793466541088.jpg',
    title: 'Heavyweight Utility Jacket Review ⚡️',
    caption: 'Streetwear essentials: This 420 GSM cargo twill jacket is crazy durable. Direct factory price under ₹2,200 with COD!',
    likes: 7850,
    productId: 'prod-2',
    audioTitle: 'Lo-Fi Chill Beat · Subculture Beats'
  },
  {
    id: 'reel-3',
    creatorName: 'SneakerHead Rhea',
    creatorHandle: '@rhea_kicks',
    creatorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnail: '/src/assets/images/collection_footwear_1793466541533.jpg',
    title: 'Walking on Clouds: Monolith Platform Sneaker 👟',
    caption: 'Styling chunky trainers with everyday straight fit pants. Super soft arch support and matching leather crossbody!',
    likes: 3120,
    productId: 'prod-3',
    audioTitle: 'Aesthetic Synthwave · City Vibe'
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'MYNTRA500',
    description: 'Flat ₹500 off on minimum order of ₹1,499',
    discountType: 'flat',
    discountValue: 500,
    minOrderAmount: 1499
  },
  {
    code: 'MEESHO20',
    description: '20% instant discount up to ₹600 on first app purchase',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 799
  },
  {
    code: 'FESTIVE100',
    description: '₹100 festive shopping coins credit for any order',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 499
  }
];

export const INITIAL_SELLERS: Seller[] = [
  {
    id: 'seller-1',
    name: 'Devendra Tripathi',
    businessName: 'Varanasi Weavers Co.',
    gstNumber: '09AAECV1234M1Z2',
    location: 'Varanasi, Uttar Pradesh',
    rating: 4.9,
    totalOrders: 4210,
    totalRevenue: 3450000,
    walletBalance: 84200,
    verified: true,
    joinedDate: 'Jan 2024'
  },
  {
    id: 'seller-2',
    name: 'Sameer Merchant',
    businessName: 'Metropolis Apparel Hub',
    gstNumber: '27AABCM5678K1Z5',
    location: 'Tirupur, Tamil Nadu',
    rating: 4.6,
    totalOrders: 3140,
    totalRevenue: 2890000,
    walletBalance: 42300,
    verified: true,
    joinedDate: 'Mar 2024'
  },
  {
    id: 'seller-3',
    name: 'Pooja Agarwal',
    businessName: 'AeroStep Footwear & Bags',
    gstNumber: '06AACAP9012J1Z8',
    location: 'Agra, Uttar Pradesh',
    rating: 4.8,
    totalOrders: 1980,
    totalRevenue: 1620000,
    walletBalance: 29500,
    verified: true,
    joinedDate: 'Jun 2024'
  }
];

export const DEFAULT_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    fullName: 'Amayra Mansuri',
    phone: '+91 98765 43210',
    street: 'Flat 402, Lotus Heights, Park Avenue',
    city: 'Bandra West, Mumbai',
    state: 'Maharashtra',
    pinCode: '400050',
    type: 'home',
    isDefault: true
  },
  {
    id: 'addr-2',
    fullName: 'Amayra Mansuri (Studio)',
    phone: '+91 98765 43210',
    street: '6th Floor, Oberoi Commerz II, Goregaon East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400063',
    type: 'work',
    isDefault: false
  }
];
