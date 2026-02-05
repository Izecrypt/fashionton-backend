/**
 * FashionTON Wardrobe - API Client
 * Centralized HTTP client with auth, retry logic, and request cancellation
 * Updated: Render backend
 */

class FashionAPI {
  constructor() {
    this.baseUrl = this._detectBaseUrl();
    this.initData = this._getTelegramInitData();
    this.pendingRequests = new Map();
    this.defaultRetryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
    this.requestTimeout = 30000;
  }

  _detectBaseUrl() {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    // Production - Render backend
    return 'https://fashionton-backend.onrender.com/api';
  }

  _getTelegramInitData() {
    if (window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }
    console.warn('Telegram WebApp initData not available - running in dev mode');
    return '';
  }

  _getHeaders(contentType = 'application/json') {
    const headers = {
      'X-Telegram-Init-Data': this.initData
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  _createTimeoutController(timeout = this.requestTimeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    return { controller, timeoutId };
  }

  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _getRetryDelay(attempt, baseDelay, maxDelay) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  async request(endpoint, options = {}, retryOptions = {}) {
    const requestId = options.requestId || this._generateRequestId();
    const { maxRetries, baseDelay, maxDelay } = {
      ...this.defaultRetryOptions,
      ...retryOptions
    };

    if (options.cancelPrevious && this.pendingRequests.has(requestId)) {
      const previousController = this.pendingRequests.get(requestId);
      previousController.abort();
      this.pendingRequests.delete(requestId);
    }

    const { controller, timeoutId } = this._createTimeoutController(options.timeout);
    
    if (options.cancelPrevious) {
      this.pendingRequests.set(requestId, controller);
    }

    let lastError;

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await this._makeRequest(endpoint, options, controller);
          this.pendingRequests.delete(requestId);
          return {
            success: true,
            data: result.data || result,
            meta: result.meta || {}
          };
        } catch (error) {
          lastError = error;

          if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
            throw error;
          }

          if (attempt === maxRetries) {
            break;
          }

          const delay = this._getRetryDelay(attempt, baseDelay, maxDelay);
          await this._sleep(delay);
        }
      }

      throw lastError;
    } catch (error) {
      this.pendingRequests.delete(requestId);
      throw this._normalizeError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async _makeRequest(endpoint, options = {}, controller) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const fetchOptions = {
      ...options,
      headers: {
        ...this._getHeaders(options.contentType),
        ...options.headers
      },
      signal: controller.signal
    };

    delete fetchOptions.timeout;
    delete fetchOptions.contentType;
    delete fetchOptions.requestId;
    delete fetchOptions.cancelPrevious;

    const response = await fetch(url, fetchOptions);

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(
        data?.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      error.code = data?.error?.code || 'UNKNOWN_ERROR';
      error.details = data?.error?.details || null;
      error.response = data;
      throw error;
    }

    return data;
  }

  _normalizeError(error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request was cancelled or timed out');
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 408;
      return timeoutError;
    }

    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      const networkError = new Error('Network error. Please check your connection.');
      networkError.code = 'NETWORK_ERROR';
      networkError.status = 0;
      return networkError;
    }

    return error;
  }

  cancelRequest(requestId) {
    if (this.pendingRequests.has(requestId)) {
      const controller = this.pendingRequests.get(requestId);
      controller.abort();
      this.pendingRequests.delete(requestId);
      return true;
    }
    return false;
  }

  cancelAllRequests() {
    this.pendingRequests.forEach((controller, requestId) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }

  // ==================== API METHODS ====================

  async getWardrobe(category = null, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    
    if (category && category !== 'all') {
      params.append('category', category);
    }
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const queryString = params.toString();
    return this.request(`/wardrobe${queryString ? `?${queryString}` : ''}`);
  }

  async addWardrobeItem(itemData) {
    return this.request('/wardrobe', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  }

  async updateWardrobeItem(id, updates) {
    return this.request(`/wardrobe/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteWardrobeItem(id) {
    return this.request(`/wardrobe/${id}`, {
      method: 'DELETE'
    });
  }

  async getOutfits() {
    return this.request('/outfits');
  }

  async createOutfit(outfitData) {
    return this.request('/outfits', {
      method: 'POST',
      body: JSON.stringify(outfitData)
    });
  }

  async deleteOutfit(id) {
    return this.request(`/outfits/${id}`, {
      method: 'DELETE'
    });
  }

  async getCurrentChallenge() {
    return this.request('/challenges/current');
  }

  async getChallengeById(challengeId) {
    return this.request(`/challenges/${challengeId}`);
  }

  async submitEntry(challengeId, entryData) {
    return this.request('/challenges/entry', {
      method: 'POST',
      body: JSON.stringify({
        challengeId,
        ...entryData
      })
    });
  }

  async voteForEntry(entryId) {
    return this.request('/challenges/vote', {
      method: 'POST',
      body: JSON.stringify({ entryId })
    });
  }

  async getChallengeLeaderboard(challengeId) {
    return this.request(`/challenges/${challengeId}`);
  }

  async deleteEntry(entryId) {
    return this.request(`/challenges/entry/${entryId}`, {
      method: 'DELETE'
    });
  }

  async calculateSize(brand, category, measurements) {
    return this.request('/size-calculator', {
      method: 'POST',
      body: JSON.stringify({ brand, category, measurements })
    });
  }

  async checkIn() {
    return this.request('/checkin', {
      method: 'POST'
    });
  }

  async getCheckInStatus() {
    return this.request('/checkin/status');
  }

  async getGlobalLeaderboard(limit = 50, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    return this.request(`/leaderboard/global?${params.toString()}`);
  }

  async getWeeklyLeaderboard(limit = 50, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    return this.request(`/leaderboard/weekly?${params.toString()}`);
  }

  async getProfile() {
    return this.request('/user?includeStats=true');
  }

  async updateProfile(data) {
    return this.request('/user', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getUploadSignature() {
    return this.request('/upload/signature');
  }

  async uploadToCloudinary(file, signatureData) {
    const { signature, timestamp, apiKey, cloudName, folder, uploadPreset } = signatureData.data || signatureData;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (uploadPreset) {
      formData.append('upload_preset', uploadPreset);
    }

    const { controller, timeoutId } = this._createTimeoutController(60000);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error?.message || 'Upload failed');
        error.code = 'UPLOAD_FAILED';
        error.details = data;
        throw error;
      }

      return {
        success: true,
        data: {
          url: data.secure_url,
          publicId: data.public_id,
          thumbnailUrl: data.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/')
        }
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async uploadAndCreateItem(file, itemMetadata) {
    const signature = await this.getUploadSignature();
    const uploadResult = await this.uploadToCloudinary(file, signature);

    const itemData = {
      imageUrl: uploadResult.data.url,
      thumbnailUrl: uploadResult.data.thumbnailUrl,
      ...itemMetadata
    };

    return this.addWardrobeItem(itemData);
  }
}

// Create singleton instance
const api = new FashionAPI();

// Export for both module and script tag usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FashionAPI, api };
} else {
  window.FashionAPI = FashionAPI;
  window.api = api;
}
