/**
 * Prime Bazaar Centralized Marketplace REST API Client
 * Connects frontend client to Express server endpoints
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('pb_auth_token');
};

const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('pb_auth_token', token);
  } else {
    localStorage.removeItem('pb_auth_token');
  }
};

async function apiRequest<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  } catch (err: any) {
    console.warn(`[Prime Bazaar API] request to ${endpoint} failed:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    sendOtp: async (phone?: string, email?: string, recipientName?: string) => {
      return apiRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, email, recipientName }),
      });
    },

    verifyOtp: async (params: { phone?: string; email?: string; otp: string; name?: string }) => {
      const res = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },

    register: async (params: { name: string; email?: string; phone?: string; password?: string }) => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },

    login: async (emailOrPhone: string, password?: string) => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrPhone, password }),
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },

    getMe: async () => {
      return apiRequest('/api/auth/me');
    },

    logout: async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } finally {
        setAuthToken(null);
      }
    },
  },

  // Payments & Checkout
  payments: {
    getHealth: async () => {
      return apiRequest('/api/health');
    },

    createIntent: async (params: { 
      amount: number; 
      currency?: string; 
      customerName?: string; 
      customerPhone?: string;
      customerEmail?: string;
      returnUrl?: string;
    }) => {
      return apiRequest('/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    verify: async (params: {
      intentId?: string;
      cashfreeOrderId?: string;
      paymentMethod: string;
      upiRefNumber?: string;
      cardNumber?: string;
      cardOtp?: string;
      amount: number;
    }) => {
      return apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    getCashfreeOrderStatus: async (orderId: string) => {
      return apiRequest(`/api/payments/cashfree-order/${encodeURIComponent(orderId)}`);
    },
  },

  // Orders
  orders: {
    getAll: async () => {
      return apiRequest('/api/orders');
    },

    getById: async (id: string) => {
      return apiRequest(`/api/orders/${id}`);
    },

    create: async (orderData: any) => {
      return apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },

    cancel: async (id: string, reason: string) => {
      return apiRequest(`/api/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    returnItem: async (id: string, reason: string) => {
      return apiRequest(`/api/orders/${id}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
  },

  // Admin Metrics
  admin: {
    getMetrics: async () => {
      return apiRequest('/api/admin/metrics');
    },
  },

  // Seller Central Hub
  sellers: {
    getAll: async () => {
      return apiRequest('/api/sellers');
    },
    register: async (sellerData: any) => {
      return apiRequest('/api/sellers/register', {
        method: 'POST',
        body: JSON.stringify(sellerData),
      });
    },
    updateStatus: async (id: string, status: string) => {
      return apiRequest(`/api/sellers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    requestPayout: async (sellerId: string, amount: number) => {
      return apiRequest(`/api/sellers/${sellerId}/payout`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
    bulkUpload: async (sellerId: string, products: any[]) => {
      return apiRequest(`/api/sellers/${sellerId}/bulk-upload`, {
        method: 'POST',
        body: JSON.stringify({ products }),
      });
    },
  },

  // v1 REST Contract (Centralized Multi-Vendor Marketplace)
  v1: {
    // Auth & Identity
    auth: {
      sellerRegister: async (payload: any) => {
        const res = await apiRequest('/api/v1/auth/seller/register', { method: 'POST', body: JSON.stringify(payload) });
        if (res.token) setAuthToken(res.token);
        return res;
      },
      sellerLogin: async (payload: any) => {
        const res = await apiRequest('/api/v1/auth/seller/login', { method: 'POST', body: JSON.stringify(payload) });
        if (res.token) setAuthToken(res.token);
        return res;
      },
      verifyOtp: async (otp: string) => {
        const res = await apiRequest('/api/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify({ otp }) });
        if (res.token) setAuthToken(res.token);
        return res;
      },
      refreshToken: async () => {
        const res = await apiRequest('/api/v1/auth/refresh', { method: 'POST' });
        if (res.token) setAuthToken(res.token);
        return res;
      },
      logout: async () => {
        try {
          return await apiRequest('/api/v1/auth/logout', { method: 'POST' });
        } finally {
          setAuthToken(null);
        }
      },
      adminStatus: async () => apiRequest('/api/auth/admin/status'),
      adminBootstrap: async (password: string) => {
        const res = await apiRequest('/api/auth/admin/bootstrap', { method: 'POST', body: JSON.stringify({ password }) });
        if (res.token) setAuthToken(res.token);
        return res;
      },
      adminLogin: async (password: string, email?: string) => {
        const res = await apiRequest('/api/auth/admin/login', {
          method: 'POST',
          body: JSON.stringify({ password, ...(email ? { email } : {}) }),
        });
        if (res.token) setAuthToken(res.token);
        return res;
      },
    },

    // Seller Products & Catalog
    products: {
      getAll: async (sellerId?: string) => apiRequest(`/api/v1/seller/products${sellerId ? `?sellerId=${sellerId}` : ''}`),
      getById: async (id: string) => apiRequest(`/api/v1/seller/products/${id}`),
      create: async (productData: any) => apiRequest('/api/v1/seller/products', { method: 'POST', body: JSON.stringify(productData) }),
      update: async (id: string, updates: any) => apiRequest(`/api/v1/seller/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
      delete: async (id: string) => apiRequest(`/api/v1/seller/products/${id}`, { method: 'DELETE' }),
      bulkUpload: async (sellerId: string, products: any[]) => apiRequest('/api/v1/seller/products/bulk-upload', { method: 'POST', body: JSON.stringify({ sellerId, products }) }),
      getCategories: async () => apiRequest('/api/v1/seller/categories'),
      getBrands: async () => apiRequest('/api/v1/seller/brands'),
    },

    // Inventory
    inventory: {
      getAll: async (sellerId?: string) => apiRequest(`/api/v1/seller/inventory${sellerId ? `?sellerId=${sellerId}` : ''}`),
      updateStock: async (variantId: string, stock: number, notes?: string) => apiRequest(`/api/v1/seller/inventory/${variantId}`, { method: 'PUT', body: JSON.stringify({ stock, notes }) }),
      getLowStock: async (sellerId?: string) => apiRequest(`/api/v1/seller/inventory/low-stock${sellerId ? `?sellerId=${sellerId}` : ''}`),
      getMovements: async (sellerId?: string) => apiRequest(`/api/v1/seller/inventory/movements${sellerId ? `?sellerId=${sellerId}` : ''}`),
    },

    // Orders & Multi-Seller Suborders
    orders: {
      getSellerOrders: async (sellerId?: string, status?: string) => {
        const params = new URLSearchParams();
        if (sellerId) params.append('sellerId', sellerId);
        if (status) params.append('status', status);
        return apiRequest(`/api/v1/seller/orders?${params.toString()}`);
      },
      getById: async (id: string) => apiRequest(`/api/v1/seller/orders/${id}`),
      accept: async (id: string) => apiRequest(`/api/v1/seller/orders/${id}/accept`, { method: 'POST' }),
      reject: async (id: string, reason?: string) => apiRequest(`/api/v1/seller/orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
      pack: async (id: string) => apiRequest(`/api/v1/seller/orders/${id}/pack`, { method: 'POST' }),
      dispatch: async (id: string) => apiRequest(`/api/v1/seller/orders/${id}/dispatch`, { method: 'POST' }),
      cancel: async (id: string, reason?: string) => apiRequest(`/api/v1/seller/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
      getInvoice: async (id: string) => apiRequest(`/api/v1/seller/orders/${id}/invoice`),
    },

    // Logistics & Returns
    logistics: {
      createShipment: async (suborderId: string, courierPartner?: string) => apiRequest('/api/v1/seller/shipments', { method: 'POST', body: JSON.stringify({ suborderId, courierPartner }) }),
      getShipments: async (sellerId?: string) => apiRequest(`/api/v1/seller/shipments${sellerId ? `?sellerId=${sellerId}` : ''}`),
      trackShipment: async (awb: string) => apiRequest(`/api/v1/seller/shipments/${awb}/track`),
      getReturns: async (sellerId?: string) => apiRequest(`/api/v1/seller/returns${sellerId ? `?sellerId=${sellerId}` : ''}`),
      approveReturn: async (id: string) => apiRequest(`/api/v1/seller/returns/${id}/approve`, { method: 'POST' }),
      rejectReturn: async (id: string, reason: string) => apiRequest(`/api/v1/seller/returns/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    },

    // Wallet & Settlements
    finance: {
      getWallet: async (sellerId?: string) => apiRequest(`/api/v1/seller/wallet${sellerId ? `?sellerId=${sellerId}` : ''}`),
      getTransactions: async (sellerId?: string) => apiRequest(`/api/v1/seller/transactions${sellerId ? `?sellerId=${sellerId}` : ''}`),
      getSettlements: async (sellerId?: string) => apiRequest(`/api/v1/seller/settlements${sellerId ? `?sellerId=${sellerId}` : ''}`),
      getSalesReport: async (sellerId?: string) => apiRequest(`/api/v1/seller/reports/sales${sellerId ? `?sellerId=${sellerId}` : ''}`),
      getEarningsReport: async (sellerId?: string) => apiRequest(`/api/v1/seller/reports/earnings${sellerId ? `?sellerId=${sellerId}` : ''}`),
    },

    // Super Admin
    admin: {
      getSellers: async () => apiRequest('/api/v1/admin/sellers'),
      getSellerById: async (id: string) => apiRequest(`/api/v1/admin/sellers/${id}`),
      approveSeller: async (id: string) => apiRequest(`/api/v1/admin/sellers/${id}/approve`, { method: 'POST' }),
      rejectSeller: async (id: string, reason?: string) => apiRequest(`/api/v1/admin/sellers/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
      suspendSeller: async (id: string) => apiRequest(`/api/v1/admin/sellers/${id}/suspend`, { method: 'POST' }),
      activateSeller: async (id: string) => apiRequest(`/api/v1/admin/sellers/${id}/activate`, { method: 'POST' }),
      getPendingProducts: async () => apiRequest('/api/v1/admin/products/pending'),
      approveProduct: async (id: string) => apiRequest(`/api/v1/admin/products/${id}/approve`, { method: 'POST' }),
      rejectProduct: async (id: string, reason?: string) => apiRequest(`/api/v1/admin/products/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
      getAllOrders: async () => apiRequest('/api/v1/admin/orders'),
      getCommissions: async () => apiRequest('/api/v1/admin/commissions'),
      updateCommission: async (id: string, commissionPercent: number) => apiRequest(`/api/v1/admin/commissions/${id}`, { method: 'PUT', body: JSON.stringify({ commissionPercent }) }),
      getSettlements: async () => apiRequest('/api/v1/admin/settlements'),
      approveSettlement: async (id: string) => apiRequest(`/api/v1/admin/settlements/${id}/approve`, { method: 'POST' }),
      getOverview: async () => apiRequest('/api/v1/admin/reports/overview'),
      getAuditLogs: async () => apiRequest('/api/v1/admin/audit-logs'),
    },
  },

  // Wishlist Price-Drop Alerts & Background Worker
  priceAlerts: {
    getAll: async (userId: string) =>
      apiRequest(`/api/price-alerts?userId=${encodeURIComponent(userId)}`),
    subscribe: async (payload: {
      userId: string;
      productId: string;
      productTitle: string;
      productImage?: string;
      currentPrice: number;
      targetPrice?: number;
      notifyOnAnyDrop?: boolean;
    }) =>
      apiRequest('/api/price-alerts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    unsubscribe: async (productId: string, userId: string) =>
      apiRequest(`/api/price-alerts/${encodeURIComponent(productId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      }),
    syncProducts: async (products: Array<{ id: string; title: string; price: number; originalPrice?: number; image?: string }>) =>
      apiRequest('/api/price-alerts/sync-products', {
        method: 'POST',
        body: JSON.stringify({ products }),
      }),
    updateProductPrice: async (productId: string, newPrice: number, title?: string, image?: string) =>
      apiRequest(`/api/price-alerts/products/${encodeURIComponent(productId)}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ newPrice, title, image }),
      }),
    runWorker: async (simulateDropProductId?: string, dropPercent: number = 15) =>
      apiRequest('/api/price-alerts/worker/run', {
        method: 'POST',
        body: JSON.stringify({ simulateDropProductId, dropPercent }),
      }),
    markRead: async (notificationId: string) =>
      apiRequest(`/api/price-alerts/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'POST',
      }),
    markAllRead: async (userId: string) =>
      apiRequest('/api/price-alerts/notifications/read-all', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
  },

  // Phase 2 Storefront: Q&A, Photo/Video Reviews, Uploads, Cart & Saved-for-Later Sync
  storefront: {
    getProductQA: async (productId: string) =>
      apiRequest(`/api/storefront/products/${encodeURIComponent(productId)}/qa`),
    askQuestion: async (productId: string, question: string) =>
      apiRequest(`/api/storefront/products/${encodeURIComponent(productId)}/qa`, {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
    answerQuestion: async (productId: string, questionId: string, answer: string) =>
      apiRequest(
        `/api/storefront/products/${encodeURIComponent(productId)}/qa/${encodeURIComponent(questionId)}/answers`,
        {
          method: 'POST',
          body: JSON.stringify({ answer }),
        }
      ),
    getProductReviews: async (
      productId: string,
      params?: { sort?: string; mediaOnly?: boolean; verifiedOnly?: boolean; minRating?: number }
    ) => {
      const qs = new URLSearchParams();
      if (params?.sort) qs.set('sort', params.sort);
      if (params?.mediaOnly) qs.set('mediaOnly', 'true');
      if (params?.verifiedOnly) qs.set('verifiedOnly', 'true');
      if (params?.minRating) qs.set('minRating', String(params.minRating));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return apiRequest(`/api/storefront/products/${encodeURIComponent(productId)}/reviews${suffix}`);
    },
    uploadReviewMedia: async (payload: { mimeType: string; dataBase64: string; caption?: string }) =>
      apiRequest('/api/storefront/uploads/review-media', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    submitReview: async (
      productId: string,
      payload: { rating: number; comment: string; mediaIds?: string[] }
    ) =>
      apiRequest(`/api/storefront/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    voteReviewHelpful: async (productId: string, reviewId: string) =>
      apiRequest(
        `/api/storefront/products/${encodeURIComponent(productId)}/reviews/${encodeURIComponent(reviewId)}/helpful`,
        { method: 'POST' }
      ),
    reportReview: async (productId: string, reviewId: string, reason: string) =>
      apiRequest(
        `/api/storefront/products/${encodeURIComponent(productId)}/reviews/${encodeURIComponent(reviewId)}/report`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),
    getCartState: async (sessionId: string) =>
      apiRequest('/api/storefront/cart-state', {
        headers: { 'x-pb-session': sessionId },
      }),
    saveCartState: async (
      sessionId: string,
      payload: { cart: any[]; savedForLater: any[]; recentlyViewed: string[] }
    ) =>
      apiRequest('/api/storefront/cart-state', {
        method: 'PUT',
        headers: { 'x-pb-session': sessionId },
        body: JSON.stringify(payload),
      }),
    getModerationQueue: async () => apiRequest('/api/storefront/moderation/queue'),
  },

  // Phase 4 Customer Checkout, Gift Cards, Store Credits, Invoices & Shipments
  checkout: {
    getQuote: async (payload: {
      items: any[];
      couponCode?: string;
      giftCardCode?: string;
      useStoreCredit?: boolean;
      requestedStoreCreditAmount?: number;
      coinsUsed?: number;
      userId?: string;
    }) =>
      apiRequest('/api/checkout/quote', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    validateGiftCard: async (code: string, orderSubtotal: number) =>
      apiRequest('/api/gift-cards/validate', {
        method: 'POST',
        body: JSON.stringify({ code, orderSubtotal }),
      }),
    getMyStoreCredit: async () => apiRequest('/api/store-credits/me'),
    retryPayment: async (orderId: string, paymentMethod: string = 'cashfree', returnUrl?: string) =>
      apiRequest('/api/payments/retry', {
        method: 'POST',
        body: JSON.stringify({ orderId, paymentMethod, returnUrl }),
      }),
    getOrderInvoices: async (orderId: string) =>
      apiRequest(`/api/orders/${encodeURIComponent(orderId)}/invoices`),
    downloadInvoiceBlob: async (invoiceId: string, format: 'html' | 'json' = 'html') => {
      const token = getAuthToken();
      const res = await fetch(
        `/api/invoices/${encodeURIComponent(invoiceId)}/download?format=${format}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error('Unable to download invoice');
      return res.blob();
    },
    getOrderShipments: async (orderId: string) =>
      apiRequest(`/api/orders/${encodeURIComponent(orderId)}/shipments`),
    verifyDeliveryOtp: async (shipmentId: string, otp: string) =>
      apiRequest(`/api/shipments/${encodeURIComponent(shipmentId)}/delivery-otp/verify`, {
        method: 'POST',
        body: JSON.stringify({ otp }),
      }),
  },

  // Phase 5 Public CMS & Sponsored Ads
  cms: {
    getBanners: async (placement?: string) =>
      apiRequest(`/api/cms/banners${placement ? `?placement=${encodeURIComponent(placement)}` : ''}`),
    getCategories: async () => apiRequest('/api/cms/categories'),
    getBrands: async () => apiRequest('/api/cms/brands'),
    getSponsoredAds: async (params?: { placement?: string; category?: string; q?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.placement) qs.set('placement', params.placement);
      if (params?.category) qs.set('category', params.category);
      if (params?.q) qs.set('q', params.q);
      if (params?.limit) qs.set('limit', String(params.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return apiRequest(`/api/ads/sponsored${suffix}`);
    },
    recordAdEvent: async (payload: {
      campaignId: string;
      productId: string;
      eventType: 'IMPRESSION' | 'CLICK' | 'CONVERSION';
      sessionKey?: string;
      orderId?: string;
      attributedRevenue?: number;
    }) =>
      apiRequest('/api/ads/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Phase 4 Multi-Warehouse & Shipping (Seller / Admin)
  warehouses: {
    list: async (sellerId?: string) =>
      apiRequest(`/api/v1/warehouses${sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : ''}`),
    create: async (payload: any) =>
      apiRequest('/api/v1/warehouses', { method: 'POST', body: JSON.stringify(payload) }),
    getInventory: async (params?: { warehouseId?: string; sellerId?: string; lowStockOnly?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.warehouseId) qs.set('warehouseId', params.warehouseId);
      if (params?.sellerId) qs.set('sellerId', params.sellerId);
      if (params?.lowStockOnly) qs.set('lowStockOnly', 'true');
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return apiRequest(`/api/v1/warehouses/inventory${suffix}`);
    },
    updateInventory: async (warehouseId: string, payload: any) =>
      apiRequest(`/api/v1/warehouses/${encodeURIComponent(warehouseId)}/inventory`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    listTransfers: async () => apiRequest('/api/v1/warehouses/transfers'),
    createTransfer: async (payload: { fromWarehouseId: string; toWarehouseId: string; variantId: string; quantity: number; notes?: string }) =>
      apiRequest('/api/v1/warehouses/transfers', { method: 'POST', body: JSON.stringify(payload) }),
    completeTransfer: async (transferId: string) =>
      apiRequest(`/api/v1/warehouses/transfers/${encodeURIComponent(transferId)}/complete`, { method: 'POST' }),
  },

  shipments: {
    create: async (payload: { suborderId?: string; orderId?: string; sellerId?: string; warehouseId?: string }) =>
      apiRequest('/api/v1/shipments/create', { method: 'POST', body: JSON.stringify(payload) }),
    sync: async (shipmentId: string) =>
      apiRequest(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/sync`, { method: 'POST' }),
    updateStatus: async (shipmentId: string, action: 'FAILED_ATTEMPT' | 'RTO_INITIATED' | 'RTO_DELIVERED', reason: string) =>
      apiRequest(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      }),
    generateDeliveryOtp: async (shipmentId: string, payload?: { email?: string; phone?: string }) =>
      apiRequest(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/delivery-otp/generate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    overrideDeliveryOtp: async (shipmentId: string, reason: string) =>
      apiRequest(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/delivery-otp/override`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // Phase 5 Seller Operations
  sellerOps: {
    acceptTerms: async (sellerId: string, version: string = 'v2026.2') =>
      apiRequest('/api/v1/seller/onboarding/terms', {
        method: 'POST',
        body: JSON.stringify({ sellerId, version }),
      }),
    resubmitOnboarding: async (payload: any) =>
      apiRequest('/api/v1/seller/onboarding/resubmit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getNotifications: async (sellerId?: string) =>
      apiRequest(`/api/v1/seller/notifications${sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : ''}`),
    markNotificationRead: async (id: string) =>
      apiRequest(`/api/v1/seller/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    getStaff: async (sellerId?: string) =>
      apiRequest(`/api/v1/seller/staff${sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : ''}`),
    addStaff: async (payload: { sellerId?: string; name: string; email: string; staffRole: string }) =>
      apiRequest('/api/v1/seller/staff', { method: 'POST', body: JSON.stringify(payload) }),
    requestSettlement: async (payload: { sellerId?: string; amount: number; idempotencyKey?: string }) =>
      apiRequest('/api/v1/seller/settlements/request', { method: 'POST', body: JSON.stringify(payload) }),
    submitProduct: async (productId: string, notes?: string) =>
      apiRequest(`/api/v1/seller/products/${encodeURIComponent(productId)}/submit`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    deliverOrder: async (orderId: string) =>
      apiRequest(`/api/v1/seller/orders/${encodeURIComponent(orderId)}/deliver`, { method: 'POST' }),
    getAdCampaigns: async (sellerId?: string) =>
      apiRequest(`/api/v1/seller/ads/campaigns${sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : ''}`),
    createAdCampaign: async (payload: any) =>
      apiRequest('/api/v1/seller/ads/campaigns', { method: 'POST', body: JSON.stringify(payload) }),
    pauseAdCampaign: async (id: string) =>
      apiRequest(`/api/v1/seller/ads/campaigns/${encodeURIComponent(id)}/pause`, { method: 'POST' }),
  },

  // Phase 4 & 5 Admin Console Operations
  adminOps: {
    getGiftCards: async () => apiRequest('/api/v1/admin/gift-cards'),
    createGiftCard: async (payload: { initialAmount: number; expiresAt?: string; minOrderAmount?: number; recipientEmail?: string; notes?: string }) =>
      apiRequest('/api/v1/admin/gift-cards', { method: 'POST', body: JSON.stringify(payload) }),
    toggleGiftCard: async (id: string, isActive: boolean, reason?: string) =>
      apiRequest(`/api/v1/admin/gift-cards/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive, reason }),
      }),
    getStoreCredit: async (userId: string) =>
      apiRequest(`/api/v1/admin/store-credits/${encodeURIComponent(userId)}`),
    issueStoreCredit: async (payload: { userId: string; amount: number; reason: string }) =>
      apiRequest('/api/v1/admin/store-credits/issue', { method: 'POST', body: JSON.stringify(payload) }),
    getLedger: async (params?: { sellerId?: string; orderId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.sellerId) qs.set('sellerId', params.sellerId);
      if (params?.orderId) qs.set('orderId', params.orderId);
      return apiRequest(`/api/v1/admin/ledger${qs.toString() ? `?${qs.toString()}` : ''}`);
    },
    reverseLedger: async (entryGroupId: string, reason: string) =>
      apiRequest('/api/v1/admin/ledger/reverse', { method: 'POST', body: JSON.stringify({ entryGroupId, reason }) }),
    runReconciliation: async (payload?: { fromDate?: string; toDate?: string; providerRecords?: any[] }) =>
      apiRequest('/api/v1/admin/reconciliation/run', { method: 'POST', body: JSON.stringify(payload || {}) }),
    getReconciliationRuns: async () => apiRequest('/api/v1/admin/reconciliation/runs'),
    downloadExport: async (reportType: string, format: 'csv' | 'xlsx') => {
      const token = getAuthToken();
      const res = await fetch(
        `/api/v1/admin/finance/export?reportType=${encodeURIComponent(reportType)}&format=${format}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    },
    getExportAudits: async () => apiRequest('/api/v1/admin/finance/export-audits'),
    getInvoices: async () => apiRequest('/api/v1/admin/invoices'),
    issueCreditNote: async (invoiceId: string, payload: { refundAmount: number; reason: string }) =>
      apiRequest(`/api/v1/admin/invoices/${encodeURIComponent(invoiceId)}/credit-note`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    initiateRefund: async (orderId: string, payload: { amount: number; refundMode: 'ORIGINAL_METHOD' | 'STORE_CREDIT'; reason: string; idempotencyKey?: string }) =>
      apiRequest(`/api/v1/orders/${encodeURIComponent(orderId)}/refunds`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    syncRefund: async (refundId: string) =>
      apiRequest(`/api/v1/refunds/${encodeURIComponent(refundId)}/sync`, { method: 'POST' }),
    disburseSettlement: async (settlementId: string, utrNumber?: string) =>
      apiRequest(`/api/v1/admin/settlements/${encodeURIComponent(settlementId)}/disburse`, {
        method: 'POST',
        body: JSON.stringify({ utrNumber }),
      }),
    reviewSeller: async (sellerId: string, toStatus: string, reason?: string) =>
      apiRequest(`/api/v1/admin/sellers/${encodeURIComponent(sellerId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, reason }),
      }),
    getAllProducts: async () => apiRequest('/api/v1/admin/products/all'),
    moderateProduct: async (productId: string, toStatus: string, reason?: string) =>
      apiRequest(`/api/v1/admin/products/${encodeURIComponent(productId)}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, reason }),
      }),
    moderateContent: async (payload: { targetType: 'REVIEW' | 'QUESTION'; targetId: string; productId: string; status: string; reason?: string }) =>
      apiRequest('/api/v1/admin/moderation/content', { method: 'POST', body: JSON.stringify(payload) }),
    getCmsBanners: async () => apiRequest('/api/v1/admin/cms/banners'),
    saveCmsBanner: async (payload: any) =>
      apiRequest(payload.id ? `/api/v1/admin/cms/banners/${encodeURIComponent(payload.id)}` : '/api/v1/admin/cms/banners', {
        method: payload.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      }),
    saveCmsCategory: async (payload: any) =>
      apiRequest(payload.id ? `/api/v1/admin/cms/categories/${encodeURIComponent(payload.id)}` : '/api/v1/admin/cms/categories', {
        method: payload.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      }),
    saveCmsBrand: async (payload: any) =>
      apiRequest(payload.id ? `/api/v1/admin/cms/brands/${encodeURIComponent(payload.id)}` : '/api/v1/admin/cms/brands', {
        method: payload.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      }),
    getAdCampaigns: async () => apiRequest('/api/v1/admin/ads/campaigns'),
    moderateAdCampaign: async (id: string, action: 'APPROVE' | 'REJECT' | 'PAUSE', reason?: string) =>
      apiRequest(`/api/v1/admin/ads/campaigns/${encodeURIComponent(id)}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      }),
    getSuppliers: async () => apiRequest('/api/v1/admin/suppliers'),
    createSupplier: async (payload: any) =>
      apiRequest('/api/v1/admin/suppliers', { method: 'POST', body: JSON.stringify(payload) }),
    getPurchaseOrders: async () => apiRequest('/api/v1/admin/purchase-orders'),
    createPurchaseOrder: async (payload: any) =>
      apiRequest('/api/v1/admin/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
    updatePoStatus: async (poId: string, toStatus: string, reason?: string) =>
      apiRequest(`/api/v1/admin/purchase-orders/${encodeURIComponent(poId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, reason }),
      }),
    getGoodsReceipts: async () => apiRequest('/api/v1/admin/goods-receipts'),
    receiveGrn: async (poId: string, payload: any) =>
      apiRequest(`/api/v1/admin/purchase-orders/${encodeURIComponent(poId)}/grn`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getSupplierInvoices: async () => apiRequest('/api/v1/admin/supplier-invoices'),
    getStaffRoles: async () => apiRequest('/api/v1/admin/staff/roles'),
    getStaff: async () => apiRequest('/api/v1/admin/staff'),
    createStaff: async (payload: { name: string; email: string; password: string; roleName: string }) =>
      apiRequest('/api/v1/admin/staff', { method: 'POST', body: JSON.stringify(payload) }),
    toggleStaffStatus: async (id: string, isActive: boolean) =>
      apiRequest(`/api/v1/admin/staff/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    searchAuditLogs: async (params?: { entityType?: string; action?: string; actorRole?: string; search?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.entityType) qs.set('entityType', params.entityType);
      if (params?.action) qs.set('action', params.action);
      if (params?.actorRole) qs.set('actorRole', params.actorRole);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      return apiRequest(`/api/v1/admin/audit-logs/search${qs.toString() ? `?${qs.toString()}` : ''}`);
    },
    getAnalytics: async (params?: { fromDate?: string; toDate?: string; sellerId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.fromDate) qs.set('fromDate', params.fromDate);
      if (params?.toDate) qs.set('toDate', params.toDate);
      if (params?.sellerId) qs.set('sellerId', params.sellerId);
      return apiRequest(`/api/v1/admin/analytics${qs.toString() ? `?${qs.toString()}` : ''}`);
    },
    downloadAnalyticsExport: async (format: 'csv' | 'xlsx') => {
      const token = getAuthToken();
      const res = await fetch(`/api/v1/admin/analytics/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Analytics export failed');
      return res.blob();
    },
  },
};

