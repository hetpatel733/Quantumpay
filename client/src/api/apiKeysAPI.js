import { apiRequest } from '../utils/api';

export const apiKeysAPI = {
  // Get all API keys
  getAll: async () => {
    return await apiRequest('/api/api-keys', {
      method: 'GET'
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

  // Delete API key
  delete: async (keyId) => {
    return await apiRequest(`/api/api-keys/${keyId}`, {
      method: 'DELETE'
    });
  }
};
