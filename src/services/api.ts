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
    sendOtp: async (phone?: string, email?: string) => {
      return apiRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, email }),
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
    createIntent: async (params: { 
      amount: number; 
      currency?: string; 
      customerName?: string; 
      customerPhone?: string;
      customerEmail?: string;
    }) => {
      return apiRequest('/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    verify: async (params: {
      intentId?: string;
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
      return apiRequest(`/api/payments/cashfree-order/${orderId}`);
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
      sellerRegister: async (payload: any) => apiRequest('/api/v1/auth/seller/register', { method: 'POST', body: JSON.stringify(payload) }),
      sellerLogin: async (payload: any) => apiRequest('/api/v1/auth/seller/login', { method: 'POST', body: JSON.stringify(payload) }),
      verifyOtp: async (otp: string) => apiRequest('/api/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify({ otp }) }),
      refreshToken: async () => apiRequest('/api/v1/auth/refresh', { method: 'POST' }),
      logout: async () => apiRequest('/api/v1/auth/logout', { method: 'POST' }),
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
};
