# Prime Bazaar Autonomous Seller Panel & Multi-Vendor Architecture

## 1. Overview
The **Prime Bazaar Seller Panel** enables merchants to autonomously register, upload products, manage live inventory and variants, fulfill orders, print AWB shipping labels and GST invoices, handle returns, withdraw earnings, run promotional coupon campaigns, and resolve buyer tickets without requiring manual administrator intervention for everyday operations.

---

## 2. Completed Seller Panel Modules (12-Section Architecture)

### 1. Dashboard
- **Live Metrics**: Total Sales GMV, Total Orders, Pending Dispatch count, and Available Settlement Wallet balance.
- **Action Queue**: Instant order dispatch preview and daily revenue velocity tracking.

### 2. Seller Registration (5-Step Autonomous Wizard)
- **Step 1: Contact Verification**: Mobile phone and email verification with Brevo OTP delivery.
- **Step 2: Business Details**: Seller name, trade/store name, entity classification (Proprietorship, Partnership, Private Limited, Individual Artisan), and warehouse pickup address with PIN code.
- **Step 3: Document Verification & Bank Details**: PAN number, GSTIN, bank account number, IFSC code, bank name, and KYC uploads (PAN Card, GSTIN Certificate, Cancelled Cheque).
- **Step 4: Verification Status**: Instant audit status review.
- **Step 5: Studio Launcher**: Auto-provisions and opens the merchant's dedicated dashboard with zero friction.

### 3. Products & Catalog
- **Upload Form with All 14 Mandatory Fields**:
  1. Product name
  2. Category and subcategory
  3. Product description
  4. Brand name
  5. Multiple product images gallery
  6. Product video (optional stream)
  7. Size and colour variants
  8. SKU / product code
  9. MRP (original price)
  10. Selling price
  11. GST / tax slab details (0%, 5%, 12%, 18%, 28%)
  12. Available stock units
  13. Weight (grams) and package dimensions ($L \times W \times H\text{ cm}$)
  14. Return window and warranty policy
- **Bulk Upload**: Simulated Excel/CSV upload with downloadable CSV sample template and instant validation preview.
- **Actions**: Edit listing, live status badge, and catalog removal.

### 4. Inventory Management
- **Stock Tracking**: Live stock counts across all catalog SKUs.
- **Low-Stock Alerts**: Automatic warning banner when inventory falls below 5 units.
- **Barcode & SKU**: EAN-13 barcode display and product code tracking.
- **Quick Adjust**: Inline $+$ / $-$ controls for instantaneous stock replenishment.

### 5. Orders & Fulfillment
- **Order Lifecycle**: Accept $\rightarrow$ Pack $\rightarrow$ Dispatch $\rightarrow$ Delivered $\rightarrow$ Cancel.
- **Status Filtering**: Segmented tabs for *All*, *Placed*, *Packed*, *Shipped*, *Delivered*, and *Cancelled*.
- **Sync**: Connected to the centralized customer order store and Express backend.

### 6. Shipping & Logistics
- **Courier Integration**: Integrated partners (BlueDart Express Air, Delhivery Surface, Shiprocket).
- **Shipping Label Generator**: Printable Air Waybill (AWB) modal with routing barcode, POD QR code, Ship To / Ship From addresses, and SKU manifest.
- **Tax Invoice**: Itemized GST tax invoice with taxable values, CGST/SGST calculations, and COD/Prepaid indicators.

### 7. Returns & Refunds
- **Return Requests Queue**: Displays buyer return reasons, item photos, and contact info.
- **Merchant Actions**: Approve return, dispatch replacement shipment, or issue direct UPI/card refund.

### 8. Payments & Settlements
- **Earnings Ledger**: Available balance and pending settlements (orders in transit).
- **Transparent Take Rate**: 12% marketplace commission deduction $+$ 18% GST on commission with net payout preview.
- **Instant Bank Withdrawal**: Payout modal depositing directly to linked bank account via NEFT.

### 9. Offers & Discounts
- **Seller Vouchers**: Create percentage or flat discount promotional coupons.
- **Campaign Controls**: Configure minimum order amounts, maximum discount caps, and toggle active/paused status.

### 10. Analytics & Reports
- **Sales Intelligence**: Real-time conversion rate (3.82%), average order value (AOV), and customer review ratings (4.9★).
- **Top SKUs**: Best-selling product leaderboard ranked by gross merchandise value.

### 11. Customer Support & Inquiries
- **In-App Dispute Desk**: Buyer inquiries categorized by order disputes, sizing questions, and delivery tracking.
- **Live Response Composer**: Merchant reply thread synced with buyer support messages.

### 12. Store Settings
- **Storefront Profile**: Brand display name, phone, email, and pickup warehouse address.
- **Bank Account Configuration**: Linked settlement details and credentials.

---

## 3. Super Admin Controls & Sync
- **Seller Directory Audit**: Approve, reject, or suspend seller accounts; inspect KYC dossiers (PAN, GSTIN, bank details).
- **Catalog Moderation**: Super admin quality audit over seller listings.
- **Payout Management**: 1-click NEFT payout approvals and reference code generation.
- **Platform Commission Control**: Adjustable marketplace commission rate (2%–20%) and free delivery thresholds.
- **Unified State**: Customer app, seller studio, and admin panel operate on the same persistent database and REST backend.
