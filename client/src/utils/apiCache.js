// Simple in-memory cache with TTL (Time To Live)
class APICache {
  constructor() {
    this.cache = new Map();
    this.requestPromises = new Map(); // Track ongoing requests
  }

  // Generate cache key from URL and params
  generateKey(url, params = {}) {
    const paramString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return `${url}${paramString ? `?${paramString}` : ''}`;
  }

  // Check if data is still valid
  isValid(item) {
    return item && Date.now() < item.expiry;
  }

  // Get cached data
  get(key) {
    const item = this.cache.get(key);
    if (this.isValid(item)) {
      console.log('📦 Cache HIT:', key);
      return item.data;
    }
    if (item) {
      this.cache.delete(key); // Remove expired data
    }
    return null;
  }

  // Set cache data with TTL
  set(key, data, ttlMinutes = 5) {
    console.log('💾 Cache SET:', key, `TTL: ${ttlMinutes}m`);
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    });
  }

  // Clear specific cache entry
  delete(key) {
    this.cache.delete(key);
    console.log('🗑️ Cache DELETE:', key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.requestPromises.clear();
    console.log('🧹 Cache CLEARED');
  }

  // Prevent duplicate requests
  async getOrFetch(key, fetchFunction, ttlMinutes = 5) {
    // Return cached data if available
    const cached = this.get(key);
    if (cached) {
      return cached;
    }

    // Return ongoing request if exists
    if (this.requestPromises.has(key)) {
      console.log('⏳ Request PENDING:', key);
      return await this.requestPromises.get(key);
    }

    // Create new request
    const promise = fetchFunction().then(data => {
      this.set(key, data, ttlMinutes);
      this.requestPromises.delete(key);
      return data;
    }).catch(error => {
      this.requestPromises.delete(key);
      throw error;
    });

    this.requestPromises.set(key, promise);
    return await promise;
  }
}

// Export singleton instance
export const apiCache = new APICache();

// Clear cache when user logs out
export const clearUserCache = () => {
  apiCache.clear();
};
