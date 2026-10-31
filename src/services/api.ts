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
      customerPhone?: string 
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
};
