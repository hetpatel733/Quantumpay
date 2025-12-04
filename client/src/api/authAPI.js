import { apiRequest } from '../utils/api';

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
  }
};
