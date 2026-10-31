# Prime Bazaar: Social Fashion Marketplace (Myntra + Meesho Hybrid)

A comprehensive multi-vendor social commerce and fashion marketplace combining Myntra's high-appeal fashion discovery and video feed with Meesho's community reselling, seller management, and transparent multi-vendor admin controls.

### User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions were resolved with recommended industry defaults:
> - **Marketplace Model**: Hybrid Myntra + Meesho architecture combining editorial fashion curation, interactive video reels shopping, and community reselling/rewards.
> - **Product Catalog**: Curated fashion, streetwear, ethnic wear, footwear, and lifestyle accessories.
> - **Switchable Portals**: Three distinct interconnected portals accessible via top workspace role switcher: **Customer Shopping App**, **Seller Merchant Studio**, and **Super Admin Control Center**.

- **Confirmed Decision 1**: Client-side reactive persistence using localStorage for cart, orders, wishlist, seller product listings, and community coins balance.
- **Confirmed Decision 2**: Interactive video shopping feed ("TrendStream") with direct tap-to-buy overlays, creator tagging, and sound toggles.
- **Confirmed Decision 3**: Full simulated checkout supporting Cash on Delivery (COD), instant UPI QR simulation, and Card payments with live tracking timeline and GST receipt generation.

---

### 1. Overview & Core Concept

- **What It Does**: Prime Bazaar delivers a complete end-to-end e-commerce ecosystem. Shoppers browse dynamic campaign banners, filter by categories, brands, sizes, colors, and prices, watch interactive vertical product reels with one-tap bag addition, search visually by photo upload, checkout via realistic multi-step payment flows, and track deliveries. Sellers manage inventory, upload listings, and view commission payouts. Admins oversee order fulfillment, approve vendor catalogs, configure banner campaigns, and manage platform take rates.
- **Target Audience / Persona**:
  - *Fashion-Forward Consumers & Budget Shoppers*: Seeking trendy apparel, authentic reviews, video demonstrations, and rewards.
  - *Independent Sellers & Boutiques*: Managing inventory, pricing, order dispatch, and earnings.
  - *Marketplace Operators*: Monitoring GMV, return rates, seller compliance, and promotion codes.
- **Key Value**: Merges the inspiration-driven discovery of modern fashion apps with the pragmatic, low-friction vendor and checkout mechanics of leading social commerce platforms.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Shopper Discovery & Curation**:
   - Dynamic campaign hero & category quick-filters (Ethnic, Western, Footwear, Streetwear, Accessories).
   - Product grid with filter drawer (price slider, brand checklist, rating filter, sort by popularity/price).
   - Visual search modal with image upload and similarity matching.
2. **Product Detail Page (PDP) & Interactivity**:
   - Multi-image gallery with zoom preview and video demonstration.
   - Size selector with live stock indicators and fit guides.
   - Color swatch selector with instant imagery swap.
   - Customer review breakdown, star distribution, and verified buyer badges.
   - Contiguous sticky purchase module: "Add to Bag", "Wishlist", and "Share & Earn Coins".
3. **TrendStream (Video Shopping Reels)**:
   - Full-bleed vertical video feed with swipeable reel cards.
   - Creator overlay, sound toggle, tagged product drawer, and direct "Add to Cart" button.
4. **Checkout & Order Lifecycle**:
   - Cart drawer with promo coupon applicator (`MYNTRA500`, `MEESHO20`).
   - Delivery address selection with validation.
   - Payment step with Cash on Delivery (COD), simulated UPI QR scanning, and mock Cards.
   - Post-order confirmation with downloadable GST invoice and live order tracking stepper (Placed $\to$ Packed $\to$ Shipped $\to$ Out for Delivery).
5. **Seller Merchant Studio**:
   - KPI metrics: Total Sales, Active Listings, Pending Orders, Commission Settlements.
   - Catalog manager: Add new product with photo preview, variants, SKU, price, and stock count.
   - Order fulfillment manager: Update order status to Packed/Shipped.
6. **Super Admin Control Center**:
   - Marketplace health scoreboard: Platform Gross Merchandise Volume (GMV), Seller count, Active orders.
   - Seller approval queue and catalog moderation.
   - Coupon and banner promotion manager.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-fashion editorial vibrancy balanced with crisp utility. Clean surfaces, refined type hierarchy, and high-impact photography avoid AI-slop tropes while delivering an authentic retail aesthetic.
- **Color Palette**:
  - Dominant Neutral: Crisp Chalk Canvas (`#FAFAFA` in light, `#09090B` in dark)
  - Structural Surfaces: Pure White / Rich Zinc (`#FFFFFF` / `#18181B`) with hairline borders (`#E4E4E7` / `#27272A`)
  - Accent Color: Vivid Sunset Coral (`#F43F5E`) and Deep Fashion Indigo (`#4F46E5`) for primary CTAs and active states
  - Strict 60-30-10 distribution; no unboxed pill badges or rainbow chips for static metadata.
- **Typography & Hierarchy**:
  - Display Face: `Plus Jakarta Sans` for bold headlines, brand identity, and prices.
  - Body Face: `DM Sans` for descriptions, specs, and form controls.
  - Tabular Numerals: Tabular figures on all currency prices (`₹`, `tabular-nums`) and stock counters.
- **Top Bar Contract**:
  - Single-line wordmark `Prime Bazaar`
  - Clean text navigation (`Discover`, `Collections`, `TrendStream Reels`, `Rewards`)
  - Right action zone: Search trigger, Wishlist counter, Shopping Bag drawer trigger, and Portal Switcher (`Customer` | `Seller` | `Admin`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Switchable Three-in-One Multi-Vendor Portal System**:
  - *Chosen Approach*: Embed the Customer App, Seller Merchant Dashboard, and Super Admin Console in a single fluid applet with a persistent role switcher in the header.
  - *Why*: Allows immediate evaluation and testing of the entire marketplace lifecycle (from adding a product as a seller, to buying it as a customer, to moderating it as an admin) without needing separate deployments.
  - *Alternatives Considered*: Customer-only view would fail to deliver on the Meesho seller/admin platform requirements specified by the user.
- **Decision 2: Realistic Seed Catalog with High-Fidelity Fashion Assets**:
  - *Chosen Approach*: Seed a rich catalog of 16+ realistic fashion, ethnic, and streetwear items across diverse categories, complete with realistic ratings, reviews, color variations, and stock levels.
  - *Why*: Ensures filters, search, cart, and reviews are deeply testable immediately.
- **Decision 3: Interactive Video Shopping Feed ("TrendStream")**:
  - *Chosen Approach*: Custom vertical video player component with simulated high-energy fashion clips, pause/play controls, audio mute/unmute, and floating product purchase cards.
  - *Why*: Directly delivers the Myntra Glamstream / social commerce feature highlighted in the prompt.
- **Decision 4: Client-Side Persistent State Engine**:
  - *Chosen Approach*: LocalStorage-backed reactive state store managing products, custom listings, cart items, wishlisted items, submitted orders, and coins.
  - *Why*: Instant reactivity, offline stability, zero external setup friction, and fully persistent across page reloads.

---

### 4. Technical Architecture & Data Strategy

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Prime Bazaar Application                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Top Bar: Brand Wordmark · Nav Links · Search · Bag · Role Switch│   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│       ┌───────────────────────────┼───────────────────────────┐        │
│       ▼                           ▼                           ▼        │
│ ┌───────────────┐         ┌───────────────┐           ┌──────────────┐ │
│ │ Customer View │         │  Seller View  │           │  Admin View  │ │
│ └───────┬───────┘         └───────┬───────┘           └──────┬───────┘ │
│         │                         │                          │         │
│         ├─ Promotional Hero       ├─ Merchant KPI Summary    ├─ GMV    │
│         ├─ Category Quick Strip   ├─ Product Inventory Grid  ├─ Sellers│
│         ├─ Product Catalog Grid   ├─ New Listing Creator     ├─ Orders │
│         ├─ Filter & Sort Sheet    ├─ Orders & Dispatch       └─ Coupons│
│         ├─ Product Detail Modal   └─ Earnings & Settlements            │
│         ├─ TrendStream Reels Feed                                      │
│         ├─ AI Visual Search                                            │
│         ├─ Shopping Bag Drawer                                         │
│         ├─ Multi-Step Checkout                                         │
│         └─ Order Tracking Center                                       │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │        Unified Marketplace State (LocalStorage + React Context)│   │
│   │   • Products & Variants     • Cart & Quantities                │   │
│   │   • Wishlist Items          • Completed Orders & Tracking      │   │
│   │   • Active Coupons          • Community Coins & Wallet Balance │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Entities & State Model
- **Product**: `id`, `title`, `brand`, `category`, `price`, `originalPrice`, `discountPercent`, `rating`, `reviewCount`, `inStock`, `colors`, `sizes`, `images`, `description`, `sellerId`, `sellerName`, `isTrending`, `isNew`.
- **Reel**: `id`, `videoUrl`, `creatorName`, `creatorAvatar`, `caption`, `likes`, `productId`, `musicTitle`.
- **CartItem**: `productId`, `selectedColor`, `selectedSize`, `quantity`.
- **Order**: `id`, `items`, `totalAmount`, `discountAmount`, `shippingAddress`, `paymentMethod`, `status` (`Placed` | `Packed` | `Shipped` | `Delivered`), `trackingSteps`, `createdAt`.
- **Seller**: `id`, `name`, `rating`, `totalSales`, `joinedDate`, `verified`.

#### Interactive Component & State Mapping
- `App.tsx`: Root coordinator handling active portal state (`customer`, `seller`, `admin`), global notification toasts, and theme context.
- `CustomerPortal.tsx`: Home feed, hero carousel, product catalog, category filters, and quick view.
- `ProductDetailModal.tsx`: Comprehensive PDP view with image thumbnail switcher, size selector with stock warnings, customer reviews, and contiguous "Add to Bag" action.
- `TrendStreamModal.tsx`: Vertical video player with creator badges, like button, and live "Shop This Look" pill drawer.
- `CartDrawer.tsx` & `CheckoutModal.tsx`: Slide-over cart calculation, promo code validation (`MYNTRA500`, `MEESHO20`), address form, and payment selector with simulated instant success.
- `VisualSearchModal.tsx`: Camera/file upload interface analyzing image color/style to recommend matching apparel items.
- `SellerDashboard.tsx`: Merchant studio with catalog table, "Add Product" drawer with form validation, and order fulfillment actions.
- `AdminDashboard.tsx`: High-level metrics, seller verification toggles, and commission rate configuration.
