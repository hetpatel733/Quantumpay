import { apiRequest } from '../utils/api';

export const ordersAPI = {
  // Get all orders
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiRequest(`/api/orders${queryString ? `?${queryString}` : ''}`, {
      method: 'GET'
    });
  },

  // Get order by ID
  getById: async (orderId) => {
    return await apiRequest(`/api/orders/${orderId}`, {
      method: 'GET'
    });
  },

  // Create new order
  create: async (orderData) => {
    return await apiRequest('/api/orders', {
      method: 'POST',
      body: orderData
    });
  },

  // Update order
  update: async (orderId, updateData) => {
    return await apiRequest(`/api/orders/${orderId}`, {
      method: 'PUT',
      body: updateData
    });
  },

  // Delete order
  delete: async (orderId) => {
    return await apiRequest(`/api/orders/${orderId}`, {
      method: 'DELETE'
    });
  }
};
