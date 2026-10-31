import { BlueprintFeature } from '../types';

export const BLUEPRINT_FEATURES: BlueprintFeature[] = [
  // 1. Customer Application (14 features)
  { id: 'feat-1', section: 'Customer App', title: 'Splash and onboarding', description: 'Brand splash, language/currency selector, preference picker', status: 'completed' },
  { id: 'feat-2', section: 'Customer App', title: 'Registration and login', description: 'Phone OTP verification, email auth, guest checkout', status: 'completed' },
  { id: 'feat-3', section: 'Customer App', title: 'Homepage and navigation', description: 'Promotional banners, category shortcuts, trending drops, 3-zone header', status: 'completed' },
  { id: 'feat-4', section: 'Customer App', title: 'Categories and brands', description: 'Ethnic, streetwear, western, footwear, accessories with brand badges', status: 'completed' },
  { id: 'feat-5', section: 'Customer App', title: 'Product search and filters', description: 'Keyword search, price range, ratings, COD filter, multi-criteria sorting', status: 'completed' },
  { id: 'feat-6', section: 'Customer App', title: 'Product details', description: 'Image gallery, sizes with live stock warnings, colors, pincode checker', status: 'completed' },
  { id: 'feat-7', section: 'Customer App', title: 'Wishlist and comparison', description: 'One-tap wishlist heart & side-by-side product comparison tool', status: 'completed' },
  { id: 'feat-8', section: 'Customer App', title: 'Shopping cart', description: 'Itemized bag, quantity steppers, coupons applicator, coins discount', status: 'completed' },
  { id: 'feat-9', section: 'Customer App', title: 'Checkout and payments', description: 'Delivery address form, instant UPI QR simulation, COD, card gateway', status: 'completed' },
  { id: 'feat-10', section: 'Customer App', title: 'Order tracking', description: 'Live milestone tracker (Confirmed -> Packed -> In Transit -> Delivered)', status: 'completed' },
  { id: 'feat-11', section: 'Customer App', title: 'Returns and refunds', description: 'Return pickup request with reason selector and refund status', status: 'completed' },
  { id: 'feat-12', section: 'Customer App', title: 'Profile and addresses', description: 'Customer profile drawer, multi-address manager, wallet coins balance', status: 'completed' },
  { id: 'feat-13', section: 'Customer App', title: 'Reviews and ratings', description: 'Verified buyer reviews, 5-star breakdown, customer helpful votes', status: 'completed' },
  { id: 'feat-14', section: 'Customer App', title: 'Notifications and support', description: 'Interactive live chat assistant with instant order & return FAQ replies', status: 'completed' },

  // 2. Seller Panel (11 features)
  { id: 'feat-15', section: 'Seller Panel', title: 'Seller registration and KYC', description: 'Merchant profile, GSTIN tax ID display, verified status toggle', status: 'completed' },
  { id: 'feat-16', section: 'Seller Panel', title: 'Seller dashboard', description: 'Gross sales, fulfilled orders count, active SKUs, settlement balance', status: 'completed' },
  { id: 'feat-17', section: 'Seller Panel', title: 'Store management', description: 'Artisan boutique brand identity, location, seller rating attribution', status: 'completed' },
  { id: 'feat-18', section: 'Seller Panel', title: 'Product management', description: 'Add, edit, delete listings with variant options and fabric details', status: 'completed' },
  { id: 'feat-19', section: 'Seller Panel', title: 'Inventory management', description: 'Live stock tracking, low-stock threshold badges, inventory sync', status: 'completed' },
  { id: 'feat-20', section: 'Seller Panel', title: 'Order processing', description: 'Merchant fulfillment queue (Mark Packed, Dispatch, Mark Delivered)', status: 'completed' },
  { id: 'feat-21', section: 'Seller Panel', title: 'Shipping management', description: 'Courier dispatch actions, tracking status sync with customer app', status: 'completed' },
  { id: 'feat-22', section: 'Seller Panel', title: 'Returns management', description: 'View and handle return pickup notifications and product exchanges', status: 'completed' },
  { id: 'feat-23', section: 'Seller Panel', title: 'Seller finance and settlements', description: 'Wallet balance, settlement statements, withdrawal to bank account', status: 'completed' },
  { id: 'feat-24', section: 'Seller Panel', title: 'Seller marketing', description: 'Discount pricing configuration, featured collection participations', status: 'completed' },
  { id: 'feat-25', section: 'Seller Panel', title: 'Seller reports', description: 'Sales metrics, order graphs, performance analytics', status: 'completed' },

  // 3. Super Admin Panel (13 features)
  { id: 'feat-26', section: 'Super Admin', title: 'Admin login and roles', description: 'Root controller access, switchable multi-portal security', status: 'completed' },
  { id: 'feat-27', section: 'Super Admin', title: 'Dashboard and analytics', description: 'Marketplace Gross Merchandise Value (GMV), net take rate, orders', status: 'completed' },
  { id: 'feat-28', section: 'Super Admin', title: 'Customer management', description: 'User audit, order history inspection, customer dispute resolution', status: 'completed' },
  { id: 'feat-29', section: 'Super Admin', title: 'Seller management', description: 'Vendor verification toggle (Grant/Revoke GST Verified badge)', status: 'completed' },
  { id: 'feat-30', section: 'Super Admin', title: 'Product approval', description: 'Catalog moderation, remove non-compliant listings across all sellers', status: 'completed' },
  { id: 'feat-31', section: 'Super Admin', title: 'Category and brand management', description: 'Department taxonomy controls, brand associations', status: 'completed' },
  { id: 'feat-32', section: 'Super Admin', title: 'Order management', description: 'Platform-wide order supervision, status override capabilities', status: 'completed' },
  { id: 'feat-33', section: 'Super Admin', title: 'Payment and refund management', description: 'Reconciliation telemetry, commission revenue calculations', status: 'completed' },
  { id: 'feat-34', section: 'Super Admin', title: 'Commission management', description: 'Adjustable platform take rate slider (default 8%)', status: 'completed' },
  { id: 'feat-35', section: 'Super Admin', title: 'Coupon and campaign management', description: 'Promotion codes budget supervision (MYNTRA500, MEESHO20, FESTIVE100)', status: 'completed' },
  { id: 'feat-36', section: 'Super Admin', title: 'Banner and CMS management', description: 'Campaign banners scheduling, free delivery threshold settings', status: 'completed' },
  { id: 'feat-37', section: 'Super Admin', title: 'Support management', description: 'Escalations audit, customer satisfaction tracking', status: 'completed' },
  { id: 'feat-38', section: 'Super Admin', title: 'Reports and system settings', description: 'Financial statements download, GST compliance reports', status: 'completed' },

  // 4. Backend and Integrations (10 features)
  { id: 'feat-39', section: 'Backend & System', title: 'Database design', description: 'Structured schema for products, variants, orders, reviews, addresses', status: 'completed' },
  { id: 'feat-40', section: 'Backend & System', title: 'Authentication APIs', description: 'Session tokens, user profile persistence, role switching', status: 'completed' },
  { id: 'feat-41', section: 'Backend & System', title: 'Product and order APIs', description: 'Reactive CRUD operations with localStorage state synchronization', status: 'completed' },
  { id: 'feat-42', section: 'Backend & System', title: 'Payment gateway', description: 'Simulated UPI QR, Card payment validation, COD verification', status: 'completed' },
  { id: 'feat-43', section: 'Backend & System', title: 'Courier integrations', description: 'Simulated tracking updates via BlueDart/Delhivery Express', status: 'completed' },
  { id: 'feat-44', section: 'Backend & System', title: 'Email and SMS', description: 'Real-time in-app notification toasts for orders, refunds, and coins', status: 'completed' },
  { id: 'feat-45', section: 'Backend & System', title: 'Push notifications', description: 'Status milestone alerts (Order Confirmed, Dispatched, Delivered)', status: 'completed' },
  { id: 'feat-46', section: 'Backend & System', title: 'Security and privacy', description: '256-bit encrypted simulated checkout, client-side data isolation', status: 'completed' },
  { id: 'feat-47', section: 'Backend & System', title: 'Backup and monitoring', description: 'Persistent client-side storage cache with auto-recovery', status: 'completed' },
  { id: 'feat-48', section: 'Backend & System', title: 'Website and app deployment', description: 'Vite single-page application with responsive mobile-first ergonomics', status: 'completed' },

  // 5. Advanced Features (10 features)
  { id: 'feat-49', section: 'Advanced Features', title: 'AI product search', description: 'Photo upload with visual computer vision feature extraction', status: 'completed' },
  { id: 'feat-50', section: 'Advanced Features', title: 'Virtual try-on', description: 'Interactive virtual fit room preview with model & silhouette tuning', status: 'completed' },
  { id: 'feat-51', section: 'Advanced Features', title: 'Video shopping', description: 'Full-bleed TrendStream reels with tap-to-buy product cards', status: 'completed' },
  { id: 'feat-52', section: 'Advanced Features', title: 'Live shopping', description: 'Interactive stylist livestream previews and real-time product tagging', status: 'completed' },
  { id: 'feat-53', section: 'Advanced Features', title: 'Referral and affiliate', description: 'Meesho-style personal referral code sharing with +100 coins reward', status: 'completed' },
  { id: 'feat-54', section: 'Advanced Features', title: 'Loyalty and rewards', description: 'Bazaar Coins wallet, redemption at checkout, engagement missions', status: 'completed' },
  { id: 'feat-55', section: 'Advanced Features', title: 'Membership', description: 'Member tiers (Silver, Gold, Platinum) with VIP benefits', status: 'completed' },
  { id: 'feat-56', section: 'Advanced Features', title: 'Multi-language', description: 'Language switcher (English, Hindi हिन्दी, Marathi मराठी, Tamil தமிழ்)', status: 'completed' },
  { id: 'feat-57', section: 'Advanced Features', title: 'Multi-currency', description: 'Instant currency conversion between INR (₹), USD ($), and EUR (€)', status: 'completed' },
  { id: 'feat-58', section: 'Advanced Features', title: 'Warehouse management', description: 'Multi-hub dispatch nodes (Varanasi, Tirupur, Agra hubs)', status: 'completed' }
];
