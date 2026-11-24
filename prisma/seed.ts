import 'dotenv/config';
import { PrismaClient, BusinessType, SellerApprovalStatus, ProductStatus, BannerStatus } from '@prisma/client';
import crypto from 'crypto';
import {
  INITIAL_PRODUCTS,
  INITIAL_SELLERS,
  INITIAL_COUPONS,
  DEFAULT_ADDRESSES,
} from '../src/data/mockData.ts';

const prisma = new PrismaClient();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function hashPasswordScrypt(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

function mapBusinessType(raw?: string): BusinessType {
  const norm = (raw || '').toLowerCase();
  if (norm.includes('private')) return BusinessType.PRIVATE_LIMITED;
  if (norm.includes('partner')) return BusinessType.PARTNERSHIP;
  if (norm.includes('artisan')) return BusinessType.INDIVIDUAL_ARTISAN;
  return BusinessType.PROPRIETORSHIP;
}

const DEFAULT_CATEGORIES = [
  { id: 'cat-ethnic', name: 'Ethnic Wear', slug: 'ethnic', displayOrder: 1, isFashionPriority: true },
  { id: 'cat-western', name: 'Western Wear', slug: 'western', displayOrder: 2, isFashionPriority: true },
  { id: 'cat-streetwear', name: 'Streetwear & Denim', slug: 'streetwear', displayOrder: 3, isFashionPriority: true },
  { id: 'cat-footwear', name: 'Footwear & Sneakers', slug: 'footwear', displayOrder: 4, isFashionPriority: true },
  { id: 'cat-accessories', name: 'Handbags & Accessories', slug: 'accessories', displayOrder: 5, isFashionPriority: true },
  { id: 'cat-beauty', name: 'Beauty & Fragrances', slug: 'beauty', displayOrder: 6, isFashionPriority: true },
  { id: 'cat-electronics', name: 'Electronics & Tech', slug: 'electronics', displayOrder: 7, isFashionPriority: false },
  { id: 'cat-home', name: 'Home & Living', slug: 'home', displayOrder: 8, isFashionPriority: false },
];

const DEFAULT_BRANDS = [
  { id: 'br-anouk', name: 'Anouk Heritage', slug: 'anouk-heritage' },
  { id: 'br-urbancraft', name: 'UrbanCraft NYC', slug: 'urbancraft-nyc' },
  { id: 'br-monolith', name: 'Monolith Studio', slug: 'monolith-studio' },
  { id: 'br-kalakriti', name: 'Kalakriti Jaipur', slug: 'kalakriti-jaipur' },
  { id: 'br-maison', name: 'Maison Minimal', slug: 'maison-minimal' },
  { id: 'br-prime', name: 'Prime Bazaar Essentials', slug: 'prime-bazaar-essentials' },
];

const DEFAULT_ROLE_PERMISSIONS = [
  {
    roleName: 'SUPER_ADMIN',
    description: 'Full platform control across security, finance, catalog, procurement, and operations.',
    permissions: ['*'],
  },
  {
    roleName: 'FINANCE_ADMIN',
    description: 'Manage payments, refunds, gift cards, store credits, ledger reconciliation, settlements, and finance exports.',
    permissions: [
      'finance.read',
      'finance.reconcile',
      'finance.export',
      'refunds.manage',
      'giftcards.manage',
      'storecredits.manage',
      'settlements.approve',
      'invoices.read',
      'audit.read',
    ],
  },
  {
    roleName: 'CATALOG_MODERATOR',
    description: 'Review seller onboarding, moderate products, reviews, Q&A, categories, brands, and banners.',
    permissions: [
      'sellers.review',
      'products.moderate',
      'reviews.moderate',
      'qa.moderate',
      'cms.manage',
      'ads.moderate',
    ],
  },
  {
    roleName: 'OPERATIONS_ADMIN',
    description: 'Manage warehouses, inventory transfers, shipments, delivery OTP overrides, suppliers, and purchase orders.',
    permissions: [
      'warehouses.manage',
      'shipments.manage',
      'delivery.override',
      'suppliers.manage',
      'purchase_orders.manage',
      'grn.receive',
    ],
  },
  {
    roleName: 'SUPPORT_AGENT',
    description: 'View customer orders, shipments, and handle support tickets.',
    permissions: ['orders.read', 'shipments.read', 'tickets.manage', 'returns.read'],
  },
];

async function seed() {
  console.log(`[Prime Bazaar Seed] Running idempotent seed (mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'})...`);

  // 1. Platform Settings
  await prisma.platformSettings.upsert({
    where: { id: 'default-platform-settings' },
    update: {},
    create: {
      id: 'default-platform-settings',
      defaultCommissionRate: 12.0,
      freeDeliveryThreshold: 999.0,
      gstNumber: '09AAECV1234M1Z2',
      platformState: 'Maharashtra',
      settlementCycleDays: 2,
    },
  });

  // 2. RBAC Roles & Granular Admin Role Permissions
  for (const roleName of ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} role`,
      },
    });
  }

  for (const rp of DEFAULT_ROLE_PERMISSIONS) {
    await prisma.adminRolePermission.upsert({
      where: { roleName: rp.roleName },
      update: { description: rp.description, permissions: rp.permissions },
      create: {
        roleName: rp.roleName,
        description: rp.description,
        permissions: rp.permissions,
      },
    });
  }

  // 3. Categories & Commission Rules
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        displayOrder: cat.displayOrder,
        isFashionPriority: cat.isFashionPriority,
      },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        displayOrder: cat.displayOrder,
        isFashionPriority: cat.isFashionPriority,
        isActive: true,
      },
    });

    const pct = cat.slug === 'ethnic' ? 10 : cat.slug === 'footwear' ? 14 : cat.slug === 'beauty' ? 8 : 12;
    const ruleId = `cr-${cat.slug}`;
    await prisma.commissionRule.upsert({
      where: { id: ruleId },
      update: {},
      create: {
        id: ruleId,
        categoryId: cat.id,
        commissionPercentage: pct,
        fixedFee: 0,
      },
    });
  }

  // 4. Brands
  for (const b of DEFAULT_BRANDS) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name },
      create: {
        id: b.id,
        name: b.name,
        slug: b.slug,
        isActive: true,
      },
    });
  }

  // 5. Coupons
  for (const c of INITIAL_COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
      },
      create: {
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        isActive: true,
        validUntil: new Date('2027-12-31T23:59:59Z'),
      },
    });
  }

  // 6. Central Platform Warehouse + Seller Catalog & Warehouses
  await prisma.warehouse.upsert({
    where: { code: 'WH-MUM-CENTRAL' },
    update: {},
    create: {
      id: 'wh-mum-central',
      code: 'WH-MUM-CENTRAL',
      name: 'Mumbai Bhiwandi Fulfillment Center',
      address: 'LogiPark Building 4, Bhiwandi-Kalyan Highway',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '421302',
      operatingHours: '08:00-22:00',
      isActive: true,
    },
  });

  for (const s of INITIAL_SELLERS) {
    const sellerUserId = `usr_${s.id}`;
    await prisma.user.upsert({
      where: { id: sellerUserId },
      update: {
        name: s.name,
        email: s.email,
      },
      create: {
        id: sellerUserId,
        name: s.name,
        email: s.email,
        phone: s.phone,
        memberTier: 'Platinum',
      },
    });

    await prisma.sellerProfile.upsert({
      where: { id: s.id },
      update: {
        businessName: s.businessName,
        tradeName: s.storeName,
        gstin: s.gstNumber,
        panNumber: s.panNumber,
      },
      create: {
        id: s.id,
        userId: sellerUserId,
        businessName: s.businessName,
        tradeName: s.storeName,
        businessType: mapBusinessType(s.businessType),
        gstin: s.gstNumber,
        panNumber: s.panNumber,
        approvalStatus: SellerApprovalStatus.APPROVED,
        termsAcceptedAt: new Date('2026-01-01T00:00:00Z'),
        termsVersion: 'v2026.1',
        rating: s.rating,
        totalOrders: s.totalOrders,
      },
    });

    await prisma.sellerWallet.upsert({
      where: { sellerId: s.id },
      update: {},
      create: {
        sellerId: s.id,
        availableBalance: IS_PRODUCTION ? 0 : s.walletBalance,
        pendingBalance: IS_PRODUCTION ? 0 : s.pendingSettlement,
      },
    });

    if (s.pickupAddress) {
      const whCode = `WH-${s.id.toUpperCase()}`;
      await prisma.warehouse.upsert({
        where: { code: whCode },
        update: {},
        create: {
          id: `wh-${s.id}`,
          sellerId: s.id,
          code: whCode,
          name: `${s.businessName} Hub`,
          address: s.pickupAddress.street,
          city: s.pickupAddress.city,
          state: s.pickupAddress.state,
          pincode: s.pickupAddress.pinCode,
          isActive: true,
        },
      });
    }
  }

  // 7. Catalog Products, Variants, Images & Warehouse Inventories
  for (const prod of INITIAL_PRODUCTS) {
    const category = await prisma.category.findUnique({ where: { slug: prod.category } })
      || await prisma.category.findUnique({ where: { slug: 'ethnic' } });
    if (!category) continue;

    const brandSlug = prod.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: {},
      create: {
        name: prod.brand,
        slug: brandSlug,
        isActive: true,
      },
    });

    await prisma.product.upsert({
      where: { id: prod.id },
      update: {
        name: prod.title,
        description: prod.description,
        gstRate: prod.gstRate ?? 12,
      },
      create: {
        id: prod.id,
        sellerId: prod.sellerId,
        categoryId: category.id,
        brandId: brand.id,
        name: prod.title,
        description: prod.description,
        status: ProductStatus.APPROVED,
        hsnCode: prod.category === 'footwear' ? '6403' : prod.category === 'beauty' ? '3304' : '6204',
        gstRate: prod.gstRate ?? 12,
        weightGrams: prod.weightGrams ?? 500,
      },
    });

    const sizes = prod.sizes?.length ? prod.sizes : [{ size: 'M', available: true, stockCount: prod.inStock || 10 }];
    const primaryColor = prod.colors?.[0]?.name || 'Standard';

    for (let idx = 0; idx < sizes.length; idx++) {
      const sz = sizes[idx];
      const sku = prod.sku
        ? `${prod.sku}-${sz.size.replace(/\s+/g, '').toUpperCase()}`
        : `${prod.id.toUpperCase()}-${sz.size.replace(/\s+/g, '').toUpperCase()}`;
      const variantId = `var-${prod.id}-${idx}`;

      await prisma.productVariant.upsert({
        where: { SKU: sku },
        update: {
          price: prod.price,
          mrp: prod.originalPrice,
        },
        create: {
          id: variantId,
          productId: prod.id,
          SKU: sku,
          barcode: prod.barcode,
          size: sz.size,
          color: primaryColor,
          price: prod.price,
          mrp: prod.originalPrice,
          stock: sz.stockCount,
        },
      });

      const sellerWarehouseId = `wh-${prod.sellerId}`;
      const whExists = await prisma.warehouse.findUnique({ where: { id: sellerWarehouseId } });
      if (whExists) {
        await prisma.warehouseInventory.upsert({
          where: {
            warehouseId_variantId: {
              warehouseId: sellerWarehouseId,
              variantId,
            },
          },
          update: {},
          create: {
            warehouseId: sellerWarehouseId,
            variantId,
            availableQty: sz.stockCount,
            reservedQty: 0,
            damagedQty: 0,
            lowStockThreshold: 5,
          },
        });
      }
    }
  }

  // 8. Default Promotional Hero Banners (CMS)
  await prisma.promotionalBanner.upsert({
    where: { id: 'banner-hero-festive' },
    update: {},
    create: {
      id: 'banner-hero-festive',
      title: 'Festive Handloom & Royal Silks',
      eyebrow: 'NEW SEASON ARCHIVE',
      subcopy: 'Handwoven Banarasi kurtis, sculpted chanderi sarees & festive silhouettes.',
      ctaLabel: 'Explore Ethnic',
      targetUrl: '/category/ethnic',
      targetCategory: 'ethnic',
      desktopImageUrl: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      mobileImageUrl: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      placement: 'HERO',
      priority: 1,
      status: BannerStatus.PUBLISHED,
    },
  });

  // 9. Development-Only Shopper Fixture (NEVER fake payment/financial records in production)
  if (!IS_PRODUCTION) {
    const devDemoPass = process.env.SEED_DEMO_PASSWORD || 'demoPass123';
    await prisma.user.upsert({
      where: { id: 'usr_demo123' },
      update: {},
      create: {
        id: 'usr_demo123',
        name: 'Amayra Mansuri',
        email: 'mansuriamayra6@gmail.com',
        phone: '+91 98765 43210',
        passwordHash: hashPasswordScrypt(devDemoPass),
        memberTier: 'Platinum',
        coins: 480,
      },
    });

    for (const addr of DEFAULT_ADDRESSES) {
      await prisma.customerAddress.upsert({
        where: { id: addr.id },
        update: {},
        create: {
          id: addr.id,
          userId: 'usr_demo123',
          fullName: addr.fullName,
          phone: addr.phone,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          pincode: addr.pinCode,
          type: addr.type,
          isDefaultShipping: Boolean(addr.isDefault),
          isDefaultBilling: Boolean(addr.isDefault),
        },
      });
    }
  }

  console.log('[Prime Bazaar Seed] Completed cleanly without duplicate records.');
}

seed()
  .catch((err) => {
    console.error('[Prime Bazaar Seed] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
