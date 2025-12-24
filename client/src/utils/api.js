const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken') || 
         document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
};

// Helper to get userId from localStorage
const getUserId = () => {
  try {
    const completeUserData = localStorage.getItem('completeUserData');
    const userData = localStorage.getItem('userData');
    
    if (completeUserData) {
      const parsed = JSON.parse(completeUserData);
      return parsed.id || parsed._id;
    }
    
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.id || parsed._id;
    }
  } catch (e) {
    console.error('Failed to get userId from localStorage:', e);
  }
  return null;
};

import { apiCache } from './apiCache';
import { debounce } from '../components/lib/utils';

// Generic API request function with caching
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  // Create cache key for GET requests
  const cacheKey = config.method === 'GET' ? 
    apiCache.generateKey(endpoint, options.cacheParams || {}) : null;

  // For cacheable GET requests
  if (cacheKey && options.enableCache !== false) {
    const ttl = options.cacheTTL || 5; // Default 5 minutes
    
    return await apiCache.getOrFetch(cacheKey, async () => {
      //console.log(`🚀 API Request: ${config.method} ${API_BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        if (response.status === 404 && options.emptyResultsOk) {
          return { success: true, isEmpty: true, data: [] };
        }
        
        // Try to parse error response body
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: await response.text() };
        }
        
        if (response.status === 403) {
          console.error('🚫 403 Forbidden - Check authentication and permissions');
          throw new Error(errorData.message || `Access forbidden`);
        }
        
        // Return the error response with success: false
        return {
          success: false,
          message: errorData.message || `HTTP error! status: ${response.status}`,
          ...errorData
        };
      }

      return await response.json();
    }, ttl);
  }

  // For non-cacheable requests (POST, PUT, DELETE)
  try {
    //console.log(`🚀 API Request: ${config.method} ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 404 && options.emptyResultsOk) {
        return { success: true, isEmpty: true, data: [] };
      }
      
      // Handle 413 Payload Too Large
      if (response.status === 413) {
        return {
          success: false,
          message: 'Request payload too large. Please use smaller images or compress them before uploading.',
          errorCode: 'PAYLOAD_TOO_LARGE'
        };
      }
      
      // Try to parse error response body (only read once)
      let errorData;
      try {
        const responseText = await response.text();
        errorData = responseText ? JSON.parse(responseText) : { message: `HTTP ${response.status}` };
      } catch (e) {
        errorData = { message: `HTTP error! status: ${response.status}` };
      }
      
      if (response.status === 403) {
        console.error('🚫 403 Forbidden - Check authentication and permissions');
        throw new Error(errorData.message || `Access forbidden`);
      }
      
      // Return the error response with success: false
      return {
        success: false,
        message: errorData.message || `HTTP error! status: ${response.status}`,
        ...errorData
      };
    }

    const data = await response.json();
    
    // Invalidate related cache entries after mutations
    if (['POST', 'PUT', 'DELETE'].includes(config.method)) {
      if (endpoint.includes('/payments')) {
        apiCache.delete('payments-list');
        apiCache.delete('dashboard-overview');
        apiCache.delete('recent-activity');
      }
      if (endpoint.includes('/orders')) {
        apiCache.delete('orders-list');
        apiCache.delete('dashboard-overview');
      }

      // --- NEW: invalidate portfolio cache when portfolio endpoints change ---
      if (endpoint.includes('/portfolio') || endpoint.includes('/api/portfolio')) {
        try {
          apiCache.delete(apiCache.generateKey('/api/portfolio', options.cacheParams || {}));
          apiCache.delete(apiCache.generateKey('/api/portfolio/stats', {}));
          apiCache.delete('portfolio-list');
          apiCache.delete('orders-list');
          //console.log('🧹 Cache invalidated for portfolio endpoints:', endpoint);
        } catch (e) {
          console.warn('Cache invalidation error for portfolio:', e);
        }

        // Dispatch global event so UI can refresh without reload
        try {
          window.dispatchEvent(new CustomEvent('portfolio:updated', { detail: { endpoint, method: config.method } }));
          //console.log('📣 Dispatched portfolio:updated event');
        } catch (e) {
          console.warn('Failed to dispatch portfolio:updated event', e);
        }
      }

      if (endpoint.includes('/notifications')) {
        apiCache.delete('notifications-list');
      }
      if (endpoint.includes('/payment-config')) {
        apiCache.delete('payment-config');
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ API request failed:', error);
    
    // Handle specific errors
    if (error.message?.includes('413')) {
      return {
        success: false,
        message: 'Request too large. Please use smaller images.',
        errorCode: 'PAYLOAD_TOO_LARGE'
      };
    }
    
    // Improved error handling for payment config
    if (endpoint.includes('/payment-config') && options.emptyResultsOk) {
      //console.log('🔧 Payment config endpoint failed, returning default structure');
      return { 
        success: true, 
        isEmpty: true, 
        isNewUser: true,
        configuration: null,
        message: 'Using default configuration interface'
      };
    }
    
    if (options.emptyResultsOk) {
      return { 
        success: true, 
        isEmpty: true, 
        isNewUser: true,
        data: options.emptyData || []
      };
    }
    
    throw error;
  }
};

// Debounced API calls for search and filters
const debouncedApiCall = debounce((apiFunction, ...args) => {
  return apiFunction(...args);
}, 300);

// Auth API functions
export const authAPI = {
  // Login user
  login: async (credentials) => {
    return await apiRequest('/api/auth/login', {
      method: 'POST',
      body: credentials
    });
  },

  // Logout user
  logout: async () => {
    return await apiRequest('/api/auth/logout', {
      method: 'POST'
    });
  },

  // Validate token
  validateToken: async () => {
    return await apiRequest('/api/auth/validate', {
      method: 'GET'
    });
  },

  // Get user data
  getUserData: async (userId) => {
    return await apiRequest(`/api/auth/userdata?id=${userId}`, {
      method: 'GET'
    });
  },

  // Signup user
  signup: async (userData) => {
    return await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: userData
    });
  },

  // Update user profile
  updateProfile: async (userId, profileData) => {
    return await apiRequest(`/api/auth/profile/${userId}`, {
      method: 'PUT',
      body: profileData
    });
  },

  // Change password
  changePassword: async (userId, passwordData) => {
    return await apiRequest(`/api/auth/password/${userId}`, {
      method: 'PUT',
      body: passwordData
    });
  }
};

// Enhanced Payments API with network support
export const paymentsAPI = {
  // Get all payments with network filtering
  getAll: async (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      // Only include params that have actual values
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null' && value !== '') {
        cleanParams[key] = value;
      }
    });

    // Add userId if not provided
    if (!cleanParams.userId) {
      cleanParams.userId = getUserId();
    }

    // Handle amount range filters - ensure they're numbers
    if (cleanParams.amountMin !== undefined) {
      cleanParams.amountMin = parseFloat(cleanParams.amountMin);
    }
    if (cleanParams.amountMax !== undefined) {
      cleanParams.amountMax = parseFloat(cleanParams.amountMax);
    }

    const queryString = new URLSearchParams(cleanParams).toString();
    
    return await apiRequest(`/api/payments${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      emptyResultsOk: true,
      emptyData: [],
      enableCache: true,
      cacheTTL: 2, // Cache for 2 minutes (payments change frequently)
      cacheParams: cleanParams
    });
  },

  // Get payment by ID (payId or _id)
  getById: async (paymentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Get payment by ID error:', error);
      throw error;
    }
  },

  // Get payment details for payment processing
  getDetails: async (payid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/payment-details?payid=${payid}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      return await response.json();
    } catch (error) {
      console.error('Payment details API error:', error);
      throw error;
    }
  },

  // Check payment status
  checkStatus: async (payid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/check-status?payid=${payid}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Payment status API error:', error);
      return { success: false, status: 'unknown', error: error.message };
    }
  },

  // Validate payment request
  validatePayment: async (api, order_id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/validate-payment?api=${api}&order_id=${order_id}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      // Handle specific error codes for deactivated/paused states
      if (!response.ok) {
        if (data.errorCode === 'API_PAUSED') {
          throw new Error(`PAYMENT_PAUSED: ${data.message}`);
        } else if (data.errorCode === 'ORDER_DEACTIVATED') {
          throw new Error(`ORDER_DEACTIVATED: ${data.message}`);
        } else if (data.errorCode === 'ORDER_CANCELLED') {
          throw new Error(`ORDER_CANCELLED: ${data.message}`);
        }
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Payment validation API error:', error);
      throw error;
    }
  },

  // Create new payment
  create: async (paymentData) => {
    return await apiRequest('/api/payments', {
      method: 'POST',
      body: paymentData
    });
  },

  // Process payment through coin selection with network support
  processCoinSelection: async (paymentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/coinselect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      return await response.json();
    } catch (error) {
      console.error('Coin selection API error:', error);
      throw error;
    }
  },

  // Update payment
  update: async (paymentId, updateData) => {
    return await apiRequest(`/api/payments/${paymentId}/status`, {
      method: 'PUT',
      body: updateData
    });
  },

  // Cancel payment
  cancel: async (paymentId) => {
    return await apiRequest(`/api/payments/${paymentId}/cancel`, {
      method: 'POST'
    });
  }
};

// Orders API functions with better empty state handling
export const ordersAPI = {
  // Get all orders (portfolio items)
  getAll: async (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      // Only include params that have actual values
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null' && value !== '') {
        cleanParams[key] = value;
      }
    });

    // Add userId if not provided
    if (!cleanParams.userId) {
      cleanParams.userId = getUserId();
    }

    const queryString = new URLSearchParams(cleanParams).toString();
    
    const response = await apiRequest(`/api/portfolio${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      emptyResultsOk: true,
      emptyData: [],
      enableCache: true,
      cacheTTL: 3,
      cacheParams: cleanParams
    });

    // Map products to orders for compatibility
    if (response.success && response.products) {
      return {
        ...response,
        orders: response.products
      };
    }
    
    return response;
  },

  // Get order by ID
  getById: async (orderId) => {
    const response = await apiRequest(`/api/portfolio/${orderId}`, {
      method: 'GET'
    });

    // Map product to order for compatibility
    if (response.success && response.product) {
      return {
        ...response,
        order: response.product
      };
    }

    return response;
  },

  // Create new order (portfolio item)
  create: async (orderData) => {
    const response = await apiRequest('/api/portfolio', {
      method: 'POST',
      body: orderData
    });

    // Map product to order for compatibility
    if (response.success && response.product) {
      return {
        ...response,
        order: response.product
      };
    }

    return response;
  },

  // Update order (portfolio item)
  update: async (orderId, updateData) => {
    //console.log('🔄 Updating order via API:', orderId, updateData);
    
    if (!orderId) {
      throw new Error('Order ID is required for update');
    }
    
    // Validate updateData
    if (updateData.amountUSD && (isNaN(updateData.amountUSD) || updateData.amountUSD <= 0)) {
      throw new Error('Invalid amount provided');
    }
    
    const response = await apiRequest(`/api/portfolio/${orderId}`, {
      method: 'PUT',
      body: updateData
    });

    // Map product to order for compatibility
    if (response.success && response.product) {
      return {
        ...response,
        order: response.product
      };
    }

    return response;
  },

  // Toggle order status
  toggle: async (orderId) => {
    const response = await apiRequest(`/api/portfolio/${orderId}/toggle`, {
      method: 'PATCH'
    });

    // Map product to order for compatibility
    if (response.success && response.product) {
      return {
        ...response,
        order: response.product
      };
    }

    return response;
  },

  // Delete order (portfolio item)
  delete: async (orderId) => {
    if (!orderId) {
      throw new Error('Order ID is required for deletion');
    }
    
    return await apiRequest(`/api/portfolio/${orderId}`, {
      method: 'DELETE'
    });
  },

  // Get portfolio statistics
  getStats: async (userId) => {
    const finalUserId = userId || getUserId();
    
    if (!finalUserId) {
      console.error('❌ No userId available for portfolio stats');
      return {
        success: false,
        message: 'User ID not found'
      };
    }

    return await apiRequest(`/api/portfolio/stats?userId=${finalUserId}`, {
      method: 'GET',
      emptyResultsOk: true
    });
  }
};

// Users API functions
export const usersAPI = {
  // Get user profile
  getProfile: async (userId) => {
    return await apiRequest(`/api/users/${userId}`, {
      method: 'GET'
    });
  },

  // Update user profile
  updateProfile: async (userId, updateData) => {
    return await apiRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: updateData
    });
  },

  // Get user settings
  getSettings: async (userId) => {
    return await apiRequest(`/api/users/${userId}/settings`, {
      method: 'GET'
    });
  },

  // Update user settings
  updateSettings: async (userId, settings) => {
    return await apiRequest(`/api/users/${userId}/settings`, {
      method: 'PUT',
      body: settings
    });
  },

  // Change user password
  changePassword: async (userId, passwordData) => {
    try {
      //console.log('🔄 API: Changing password for user:', userId);
      
      const token = getAuthToken();
      //console.log('🔑 Token for password change:', token ? 'Present' : 'Missing');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      //console.log('📤 Password change response status:', response.status);

      // Check if response is ok first
      if (!response.ok) {
        let errorMessage = 'Failed to change password';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      //console.log('📤 API: Password change response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ API: Change password error:', error);
      throw error;
    }
  }
};

// API Keys API functions with better empty state handling
export const apiKeysAPI = {
  // Get all API keys
  getAll: async (userId) => {
    try {
      const finalUserId = userId || getUserId();
      
      if (!finalUserId) {
        console.error('❌ No userId available for API keys');
        return {
          success: false,
          message: 'User ID not found',
          apiKeys: []
        };
      }

      //console.log('🔄 Fetching API keys for userId:', finalUserId);
      
      return await apiRequest(`/api/api-keys?userId=${finalUserId}`, {
        method: 'GET',
        emptyResultsOk: true,
        emptyData: []
      });
    } catch (error) {
      console.error('❌ API Keys fetch error:', error);
      return {
        success: false,
        message: error.message,
        apiKeys: []
      };
    }
  },

  // Get API key statistics
  getStats: async (userId) => {
    const finalUserId = userId || getUserId();
    
    if (!finalUserId) {
      return {
        success: false,
        message: 'User ID not found'
      };
    }

    return await apiRequest(`/api/api-keys/stats?userId=${finalUserId}`, {
      method: 'GET',
      emptyResultsOk: true
    });
  },

  // Create new API key
  create: async (keyData) => {
    return await apiRequest('/api/api-keys', {
      method: 'POST',
      body: keyData
    });
  },

  // Update API key
  update: async (keyId, updateData) => {
    return await apiRequest(`/api/api-keys/${keyId}`, {
      method: 'PUT',
      body: updateData
    });
  },

  // Toggle API key active status
  toggle: async (keyId) => {
    return await apiRequest(`/api/api-keys/${keyId}/toggle`, {
      method: 'PATCH'
    });
  },

  // Delete API key
  delete: async (keyId) => {
    return await apiRequest(`/api/api-keys/${keyId}`, {
      method: 'DELETE'
    });
  }
};

// Payment Processing API functions
export const paymentProcessingAPI = {
  // Process payment through coin selection
  processCoinSelection: async (paymentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/coinselect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      return await response.json();
    } catch (error) {
      console.error('Coin selection API error:', error);
      throw error;
    }
  },

  // Validate payment request
  validatePayment: async (api, order_id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/validate-payment?api=${api}&order_id=${order_id}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      // Handle specific error codes for deactivated/paused states
      if (!response.ok) {
        if (data.errorCode === 'API_PAUSED') {
          throw new Error(`PAYMENT_PAUSED: ${data.message}`);
        } else if (data.errorCode === 'ORDER_DEACTIVATED') {
          throw new Error(`ORDER_DEACTIVATED: ${data.message}`);
        } else if (data.errorCode === 'ORDER_CANCELLED') {
          throw new Error(`ORDER_CANCELLED: ${data.message}`);
        }
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Payment validation API error:', error);
      throw error;
    }
  }
};

// Enhanced Notifications API with reduced polling
let notificationPollInterval = null;

export const notificationsAPI = {
  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await apiRequest(`/api/notifications${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
        emptyResultsOk: true,
        emptyData: [],
        enableCache: true,
        cacheTTL: 1, // Cache for 1 minute (notifications should be fresh)
        cacheParams: params
      });
      
      if (response.success) {
        return response;
      } else if (response.isEmpty || response.isNewUser) {
        return {
          success: true,
          notifications: [],
          pagination: { total: 0, unreadCount: 0, skip: 0, limit: 20 }
        };
      } else {
        throw new Error(response.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('❌ Notifications API error:', error);
      return {
        success: true,
        notifications: [],
        pagination: { total: 0, unreadCount: 0, skip: 0, limit: 20 },
        isEmpty: true,
        isNewUser: true
      };
    }
  },
  
  markAsRead: async (notificationId) => {
    const result = await apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    // Invalidate notifications cache
    apiCache.delete(apiCache.generateKey('/api/notifications'));
    return result;
  },
  
  markAllAsRead: async () => {
    const result = await apiRequest('/api/notifications/mark-all-read', {
      method: 'POST'
    });
    // Invalidate notifications cache
    apiCache.delete(apiCache.generateKey('/api/notifications'));
    return result;
  },
  
  clearAll: async () => {
    const result = await apiRequest('/api/notifications', {
      method: 'DELETE'
    });
    // Invalidate notifications cache
    apiCache.delete(apiCache.generateKey('/api/notifications'));
    return result;
  },
  
  // Start optimized polling
  startPolling: (callback, intervalMinutes = 2) => {
    if (notificationPollInterval) {
      clearInterval(notificationPollInterval);
    }
    
    // Only poll if user is active (visible tab)
    notificationPollInterval = setInterval(() => {
      if (!document.hidden) {
        // Invalidate cache before polling for fresh data
        apiCache.delete(apiCache.generateKey('/api/notifications'));
        callback();
      }
    }, intervalMinutes * 60 * 1000);
  },

  stopPolling: () => {
    if (notificationPollInterval) {
      clearInterval(notificationPollInterval);
      notificationPollInterval = null;
    }
  }
};

// Enhanced Dashboard API with better caching
export const dashboardAPI = {
  getOverview: async (period = '30', forceRefresh = false) => {
    try {
      const userId = getUserId();

      if (!userId) {
        console.error('❌ No userId found in localStorage for dashboard overview');
        throw new Error('User ID not found. Please log in again.');
      }

      //console.log('📊 Fetching dashboard overview with userId:', userId);

      return await apiRequest(`/api/dashboard/overview?period=${period}&userId=${userId}`, {
        enableCache: !forceRefresh,
        cacheTTL: 3,
        emptyResultsOk: true,
        cacheParams: { period, userId },
        emptyData: {
          periodMetrics: {
            totalSales: 0,
            transactionCount: 0,
            volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 },
            statusSummary: { totalPayments: 0, completed: 0, failed: 0, pending: 0 },
            averageTransactionValue: 0,
            topCryptoCurrency: 'USDT',
            periodDays: parseInt(period)
          },
          orderStats: { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 },
          dailyBreakdown: [],
          cryptoDistribution: []
        }
      });
    } catch (error) {
      console.error('Dashboard overview API error:', error);
      return {
        success: true,
        periodMetrics: {
          totalSales: 0,
          transactionCount: 0,
          volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 },
          statusSummary: { totalPayments: 0, completed: 0, failed: 0, pending: 0 },
          averageTransactionValue: 0,
          topCryptoCurrency: 'USDT',
          periodDays: parseInt(period)
        },
        orderStats: { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 },
        dailyBreakdown: [],
        cryptoDistribution: []
      };
    }
  },
  
  getRecentActivity: async (limit = 5) => {
    try {
      const userId = getUserId();

      if (!userId) {
        console.error('❌ No userId found in localStorage for recent activity');
        throw new Error('User ID not found. Please log in again.');
      }

      //console.log('📊 Fetching recent activity with userId:', userId);

      return await apiRequest(`/api/dashboard/recent-activity?limit=${limit}&userId=${userId}`, {
        enableCache: true,
        cacheTTL: 2,
        emptyResultsOk: true,
        emptyData: [],
        cacheParams: { limit, userId }
      });
    } catch (error) {
      console.error('Recent activity API error:', error);
      return {
        success: true,
        recentActivity: [],
        isEmpty: true
      };
    }
  },

  getCryptoDistribution: async (period = '30days') => {
    try {
      const userId = getUserId();

      if (!userId) {
        console.error('❌ No userId found in localStorage for crypto distribution');
        throw new Error('User ID not found. Please log in again.');
      }

      //console.log('📊 Fetching crypto distribution with userId:', userId);

      return await apiRequest(`/api/dashboard/crypto-distribution?period=${period}&userId=${userId}`, {
        enableCache: true,
        cacheTTL: 5, // Cache for 5 minutes (changes less frequently)
        emptyResultsOk: true,
        emptyData: [],
        cacheParams: { period, userId }
      });
    } catch (error) {
      console.error('Crypto distribution API error:', error);
      return {
        success: true,
        distribution: [],
        totalVolume: 0,
        isEmpty: true
      };
    }
  },
  
  getMetrics: (startDate, endDate) => apiRequest(`/api/dashboard/metrics?startDate=${startDate}&endDate=${endDate}`, {
    emptyResultsOk: true,
    emptyData: []
  }),
  
  getVolumeByCrypto: (period = '30days') => apiRequest(`/api/dashboard/volume-by-crypto?period=${period}`, {
    emptyResultsOk: true,
    emptyData: []
  }),
};

// Enhanced Payment Config API with network support
export const paymentConfigAPI = {
  // Get payment configuration
  getConfig: async (userId) => {
    try {
      const finalUserId = userId || getUserId();
      
      if (!finalUserId) {
        console.error('❌ No userId available for payment config');
        return { 
          success: true, 
          config: { wallets: {} },
          isEmpty: true,
          message: 'User ID not found'
        };
      }

      const response = await apiRequest(`/api/payment-config/${finalUserId}`, {
        enableCache: true,
        cacheTTL: 10,
      });

      if (!response || response.status === 404) {
        return { 
          success: true, 
          config: { wallets: {} },
          isEmpty: true,
          message: 'No configuration found'
        };
      }

      return response;
    } catch (error) {
      console.error('Error fetching payment config:', error);
      return { 
        success: true, 
        config: { wallets: {} },
        isEmpty: true,
        message: 'Loading default configuration'
      };
    }
  },

  // Update payment configuration
  updateConfig: async (userId, configData) => {
    try {
      const finalUserId = userId || getUserId();
      
      if (!finalUserId) {
        return { success: false, message: 'User ID not found' };
      }

      const response = await apiRequest(`/api/payment-config/${finalUserId}`, {
        method: 'PUT',
        body: configData
      });

      return response;
    } catch (error) {
      console.error('Error updating payment config:', error);
      return { success: false, message: error.message };
    }
  },

  // Update single wallet address
  updateWallet: async (userId, currency, address) => {
    try {
      const finalUserId = userId || getUserId();
      
      if (!finalUserId) {
        return { success: false, message: 'User ID not found' };
      }

      const response = await apiRequest(`/api/payment-config/${finalUserId}/wallet`, {
        method: 'PUT',
        body: { currency, address }
      });

      return response;
    } catch (error) {
      console.error('Error updating wallet:', error);
      return { success: false, message: error.message };
    }
  },
  
  // Update global conversion settings
  updateGlobalConversionSettings: async (conversionSettings) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-config/conversion-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ conversionSettings })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating conversion settings:', error);
      return { success: false, message: error.message };
    }
  },

  // Update global transaction limits
  updateGlobalTransactionLimits: async (transactionLimits) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-config/transaction-limits`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ transactionLimits })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating transaction limits:', error);
      return { success: false, message: error.message };
    }
  }
};

// Transaction Export API
export const exportAPI = {
  // Create new export job
  create: async (exportConfig) => {
    const userId = getUserId();
    if (!userId) {
      return { success: false, message: 'User ID not found' };
    }

    return await apiRequest('/api/exports', {
      method: 'POST',
      body: {
        userId,
        ...exportConfig
      }
    });
  },

  // Get all exports for user
  getAll: async (params = {}) => {
    const userId = getUserId();
    if (!userId) {
      return { success: false, message: 'User ID not found', exports: [] };
    }

    const queryParams = new URLSearchParams({
      userId,
      limit: params.limit || 20,
      skip: params.skip || 0
    }).toString();

    return await apiRequest(`/api/exports?${queryParams}`, {
      method: 'GET',
      emptyResultsOk: true,
      emptyData: []
    });
  },

  // Get single export by ID
  getById: async (exportId) => {
    return await apiRequest(`/api/exports/${exportId}`, {
      method: 'GET'
    });
  },

  // Delete export
  delete: async (exportId) => {
    return await apiRequest(`/api/exports/${exportId}`, {
      method: 'DELETE'
    });
  },

  // Retry failed export
  retry: async (exportId) => {
    return await apiRequest(`/api/exports/${exportId}/retry`, {
      method: 'POST'
    });
  }
};

// General API
export const generalAPI = {
  contact: (contactData) => apiRequest('/api/contact', {
    method: 'POST',
    body: contactData,
  }),
  
  getPaymentInfo: (id) => apiRequest(`/api/paymentinfo${id ? `?id=${id}` : ''}`, {
    method: 'GET'
  }),
  
  healthCheck: () => apiRequest('/health'),
};

export default {
  auth: authAPI,
  users: usersAPI,
  orders: ordersAPI,
  payments: paymentsAPI,
  paymentProcessing: paymentProcessingAPI,
  apiKeys: apiKeysAPI,
  paymentConfig: paymentConfigAPI,
  notifications: notificationsAPI,
  dashboard: dashboardAPI,
  general: generalAPI,
  exports: exportAPI // Add exports
};