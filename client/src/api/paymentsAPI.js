import { apiRequest } from '../utils/api';

export const paymentsAPI = {
  // Get all payments
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiRequest(`/api/payments${queryString ? `?${queryString}` : ''}`, {
      method: 'GET'
    });
  },

  // Get payment by ID
  getById: async (paymentId) => {
    return await apiRequest(`/api/payments/${paymentId}`, {
      method: 'GET'
    });
  },

  // Create new payment
  create: async (paymentData) => {
    return await apiRequest('/api/payments', {
      method: 'POST',
      body: paymentData
    });
  },

  // Update payment
  update: async (paymentId, updateData) => {
    return await apiRequest(`/api/payments/${paymentId}`, {
      method: 'PUT',
      body: updateData
    });
  },

  // Process refund
  refund: async (paymentId, refundData) => {
    return await apiRequest(`/api/payments/${paymentId}/refund`, {
      method: 'POST',
      body: refundData
    });
  }
};
