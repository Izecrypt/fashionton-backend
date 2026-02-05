/**
 * FashionTON Wardrobe - State Management Store
 * Simple centralized state management with pub/sub pattern
 */

class Store {
  constructor() {
    this.state = {
      // User data
      user: null,
      isAuthenticated: false,
      
      // Wardrobe data
      wardrobe: [],
      wardrobePagination: {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false
      },
      
      // Outfits data
      outfits: [],
      
      // Challenge data
      currentChallenge: null,
      challengeEntries: [],
      
      // Leaderboard data
      leaderboard: [],
      weeklyLeaderboard: [],
      
      // Check-in status
      checkInStatus: null,
      
      // Loading states
      loading: {},
      
      // Errors
      errors: {},
      
      // UI state
      currentScreen: 'wardrobe',
      selectedCategory: 'all',
      selectedItems: new Set(), // For outfit creation
      
      // Cache timestamps
      lastFetch: {}
    };
    
    this.listeners = new Map();
    this.globalListeners = new Set();
    
    // Cache duration in ms (5 minutes)
    this.cacheDuration = 5 * 60 * 1000;
  }

  // ==================== GETTERS ====================

  getState(key) {
    if (key) {
      return this._deepClone(this.state[key]);
    }
    return this._deepClone(this.state);
  }

  getUser() {
    return this.state.user;
  }

  getWardrobe(category = null) {
    if (category && category !== 'all') {
      return this.state.wardrobe.filter(item => item.category === category);
    }
    return this.state.wardrobe;
  }

  getWardrobeItem(id) {
    return this.state.wardrobe.find(item => item.id === id);
  }

  getOutfits() {
    return this.state.outfits;
  }

  getCurrentChallenge() {
    return this.state.currentChallenge;
  }

  getIsLoading(key) {
    return !!this.state.loading[key];
  }

  getError(key) {
    return this.state.errors[key] || null;
  }

  // ==================== SETTERS ====================

  setState(key, value, notify = true) {
    const oldValue = this.state[key];
    this.state[key] = value;
    
    if (notify) {
      this._notify(key, value, oldValue);
      this._notifyGlobal(key, value, oldValue);
    }
  }

  setLoading(key, isLoading) {
    this.state.loading = {
      ...this.state.loading,
      [key]: isLoading
    };
    this._notify('loading', this.state.loading);
  }

  setError(key, error) {
    if (error) {
      this.state.errors = {
        ...this.state.errors,
        [key]: error
      };
    } else {
      const { [key]: _, ...rest } = this.state.errors;
      this.state.errors = rest;
    }
    this._notify('errors', this.state.errors);
  }

  clearError(key) {
    this.setError(key, null);
  }

  clearAllErrors() {
    this.state.errors = {};
    this._notify('errors', {});
  }

  // ==================== SUBSCRIPTION ====================

  subscribe(key, listener) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key).delete(listener);
    };
  }

  subscribeToGlobal(listener) {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  _notify(key, value, oldValue) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(listener => {
        try {
          listener(value, oldValue, key);
        } catch (error) {
          console.error('Store listener error:', error);
        }
      });
    }
  }

  _notifyGlobal(key, value, oldValue) {
    this.globalListeners.forEach(listener => {
      try {
        listener(key, value, oldValue);
      } catch (error) {
        console.error('Store global listener error:', error);
      }
    });
  }

  // ==================== ACTIONS ====================

  /**
   * Load user profile
   */
  async loadUser() {
    const key = 'user';
    this.setLoading(key, true);
    this.clearError(key);

    try {
      const response = await api.getProfile();
      if (response.success) {
        this.setState('user', response.data);
        this.setState('isAuthenticated', true);
        this.state.lastFetch[key] = Date.now();
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Load wardrobe items
   */
  async loadWardrobe(category = null, reset = false) {
    const key = 'wardrobe';
    this.setLoading(key, true);
    this.clearError(key);

    try {
      const limit = this.state.wardrobePagination.limit;
      const offset = reset ? 0 : this.state.wardrobePagination.offset;
      
      const response = await api.getWardrobe(category, limit, offset);
      
      if (response.success) {
        const items = response.data.items || response.data;
        const pagination = response.data.pagination || {};
        
        if (reset || offset === 0) {
          this.setState('wardrobe', items);
        } else {
          // Merge new items, avoiding duplicates
          const existingIds = new Set(this.state.wardrobe.map(i => i.id));
          const newItems = items.filter(i => !existingIds.has(i.id));
          this.setState('wardrobe', [...this.state.wardrobe, ...newItems]);
        }
        
        this.setState('wardrobePagination', {
          total: pagination.total || items.length,
          limit: pagination.limit || limit,
          offset: pagination.offset || offset + items.length,
          hasMore: pagination.hasMore !== false
        });
        
        this.state.lastFetch[key] = Date.now();
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Load more wardrobe items (pagination)
   */
  async loadMoreWardrobe(category = null) {
    if (!this.state.wardrobePagination.hasMore || this.getIsLoading('wardrobe')) {
      return { success: true, data: [] };
    }
    return this.loadWardrobe(category, false);
  }

  /**
   * Add item to wardrobe (optimistic)
   */
  async addWardrobeItem(itemData) {
    const key = 'addWardrobe';
    this.setLoading(key, true);
    this.clearError(key);

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticItem = {
      id: tempId,
      ...itemData,
      isOptimistic: true,
      createdAt: new Date().toISOString()
    };
    
    const previousWardrobe = [...this.state.wardrobe];
    this.setState('wardrobe', [optimisticItem, ...this.state.wardrobe]);

    try {
      const response = await api.addWardrobeItem(itemData);
      
      if (response.success) {
        // Replace optimistic item with real item
        const realItem = response.data;
        this.setState(
          'wardrobe',
          this.state.wardrobe.map(item => 
            item.id === tempId ? realItem : item
          )
        );
        
        // Update user stats
        if (this.state.user?.stats) {
          this.setState('user', {
            ...this.state.user,
            stats: {
              ...this.state.user.stats,
              wardrobeCount: (this.state.user.stats.wardrobeCount || 0) + 1,
              totalXP: (this.state.user.stats.totalXP || 0) + (response.meta?.xpEarned || 10)
            }
          });
        }
      }
      return response;
    } catch (error) {
      // Revert optimistic update
      this.setState('wardrobe', previousWardrobe);
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Update wardrobe item (optimistic)
   */
  async updateWardrobeItem(id, updates) {
    const key = `updateWardrobe_${id}`;
    this.setLoading(key, true);

    // Optimistic update
    const previousItem = this.getWardrobeItem(id);
    if (previousItem) {
      this.setState(
        'wardrobe',
        this.state.wardrobe.map(item =>
          item.id === id ? { ...item, ...updates, isUpdating: true } : item
        )
      );
    }

    try {
      const response = await api.updateWardrobeItem(id, updates);
      
      if (response.success && previousItem) {
        this.setState(
          'wardrobe',
          this.state.wardrobe.map(item =>
            item.id === id ? { ...response.data, isUpdating: false } : item
          )
        );
      }
      return response;
    } catch (error) {
      // Revert optimistic update
      if (previousItem) {
        this.setState(
          'wardrobe',
          this.state.wardrobe.map(item =>
            item.id === id ? previousItem : item
          )
        );
      }
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Delete wardrobe item (optimistic)
   */
  async deleteWardrobeItem(id) {
    const key = `deleteWardrobe_${id}`;
    this.setLoading(key, true);

    // Optimistic update
    const previousWardrobe = [...this.state.wardrobe];
    this.setState(
      'wardrobe',
      this.state.wardrobe.filter(item => item.id !== id)
    );

    try {
      const response = await api.deleteWardrobeItem(id);
      
      if (response.success && this.state.user?.stats) {
        this.setState('user', {
          ...this.state.user,
          stats: {
            ...this.state.user.stats,
            wardrobeCount: Math.max(0, (this.state.user.stats.wardrobeCount || 0) - 1)
          }
        });
      }
      return response;
    } catch (error) {
      // Revert optimistic update
      this.setState('wardrobe', previousWardrobe);
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Load outfits
   */
  async loadOutfits() {
    const key = 'outfits';
    this.setLoading(key, true);
    this.clearError(key);

    try {
      const response = await api.getOutfits();
      if (response.success) {
        this.setState('outfits', response.data.items || response.data);
        this.state.lastFetch[key] = Date.now();
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Create outfit
   */
  async createOutfit(outfitData) {
    const key = 'createOutfit';
    this.setLoading(key, true);

    try {
      const response = await api.createOutfit(outfitData);
      if (response.success) {
        this.setState('outfits', [response.data, ...this.state.outfits]);
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Delete outfit
   */
  async deleteOutfit(id) {
    const previousOutfits = [...this.state.outfits];
    this.setState(
      'outfits',
      this.state.outfits.filter(outfit => outfit.id !== id)
    );

    try {
      const response = await api.deleteOutfit(id);
      return response;
    } catch (error) {
      this.setState('outfits', previousOutfits);
      throw error;
    }
  }

  /**
   * Load current challenge
   */
  async loadChallenge() {
    const key = 'challenge';
    this.setLoading(key, true);
    this.clearError(key);

    try {
      const response = await api.getCurrentChallenge();
      if (response.success) {
        this.setState('currentChallenge', response.data);
        this.state.lastFetch[key] = Date.now();
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Load leaderboard
   */
  async loadLeaderboard(type = 'global', limit = 50) {
    const key = type === 'weekly' ? 'weeklyLeaderboard' : 'leaderboard';
    this.setLoading(key, true);
    this.clearError(key);

    try {
      const response = type === 'weekly' 
        ? await api.getWeeklyLeaderboard(limit)
        : await api.getGlobalLeaderboard(limit);
        
      if (response.success) {
        this.setState(key, response.data.items || response.data);
        this.state.lastFetch[key] = Date.now();
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Daily check-in
   */
  async checkIn() {
    const key = 'checkIn';
    this.setLoading(key, true);

    try {
      const response = await api.checkIn();
      if (response.success) {
        this.setState('checkInStatus', {
          checkedIn: true,
          lastCheckIn: new Date().toISOString(),
          streak: response.data.streak || 1
        });
        
        // Update user XP
        if (this.state.user?.stats && response.data.xpEarned) {
          this.setState('user', {
            ...this.state.user,
            stats: {
              ...this.state.user.stats,
              totalXP: (this.state.user.stats.totalXP || 0) + response.data.xpEarned
            }
          });
        }
      }
      return response;
    } catch (error) {
      this.setError(key, error.message);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * Load check-in status
   */
  async loadCheckInStatus() {
    try {
      const response = await api.getCheckInStatus();
      if (response.success) {
        this.setState('checkInStatus', response.data);
      }
      return response;
    } catch (error) {
      console.error('Failed to load check-in status:', error);
      return { success: false, error };
    }
  }

  /**
   * Toggle item selection for outfit creation
   */
  toggleItemSelection(itemId) {
    const newSelection = new Set(this.state.selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    this.setState('selectedItems', newSelection);
  }

  /**
   * Clear item selection
   */
  clearItemSelection() {
    this.setState('selectedItems', new Set());
  }

  /**
   * Check if data is stale
   */
  isStale(key, maxAge = this.cacheDuration) {
    const lastFetch = this.state.lastFetch[key];
    if (!lastFetch) return true;
    return Date.now() - lastFetch > maxAge;
  }

  /**
   * Reset store to initial state
   */
  reset() {
    this.state = {
      user: null,
      isAuthenticated: false,
      wardrobe: [],
      wardrobePagination: {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false
      },
      outfits: [],
      currentChallenge: null,
      challengeEntries: [],
      leaderboard: [],
      weeklyLeaderboard: [],
      checkInStatus: null,
      loading: {},
      errors: {},
      currentScreen: 'wardrobe',
      selectedCategory: 'all',
      selectedItems: new Set(),
      lastFetch: {}
    };
    this._notifyGlobal('reset', null, null);
  }

  // ==================== UTILITIES ====================

  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Set) return new Set(obj);
    if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

// Create singleton instance
const store = new Store();

// Export for both module and script tag usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Store, store };
} else {
  window.Store = Store;
  window.store = store;
}
