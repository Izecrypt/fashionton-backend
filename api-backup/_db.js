/**
 * FashionTON Wardrobe - Vercel KV Database Connection
 * Database layer with key patterns and CRUD operations
 */

const { createClient } = require('@vercel/kv');

// KV client singleton
let kvClient = null;

/**
 * Initialize and get KV client
 * @returns {Object} - Vercel KV client
 */
function getKVClient() {
  if (kvClient) {
    return kvClient;
  }

  // Check for KV REST API credentials (preferred method)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kvClient = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    });
  } else if (process.env.KV_URL) {
    // Fallback to KV_URL
    kvClient = createClient({
      url: process.env.KV_URL
    });
  } else {
    throw new Error('Vercel KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN');
  }

  return kvClient;
}

/**
 * Key patterns for different data types
 */
const KEY_PATTERNS = {
  user: (userId) => `user:${userId}`,
  userByUsername: (username) => `user:username:${username}`,
  wardrobe: (userId, itemId) => `wardrobe:${userId}:${itemId}`,
  wardrobeList: (userId) => `wardrobe:list:${userId}`,
  outfit: (userId, outfitId) => `outfit:${userId}:${outfitId}`,
  outfitList: (userId) => `outfit:list:${userId}`,
  challenge: (challengeId) => `challenge:${challengeId}`,
  challengeCurrent: () => 'challenge:current',
  challengeList: () => 'challenges:list',
  entry: (challengeId, entryId) => `entry:${challengeId}:${entryId}`,
  entryList: (challengeId) => `entry:list:${challengeId}`,
  userEntry: (userId, challengeId) => `entry:user:${userId}:${challengeId}`,
  vote: (userId, challengeId) => `vote:${userId}:${challengeId}`,
  leaderboard: (type) => `leaderboard:${type}`,
  winners: (challengeId) => `winners:${challengeId}`,
  transaction: (txId) => `transaction:${txId}`,
  userTransactions: (userId) => `transactions:${userId}`,
  premium: (userId) => `premium:${userId}`,
  stats: (userId) => `stats:${userId}`,
  checkin: (userId) => `checkin:${userId}`,
  xpHistory: (userId) => `xp:history:${userId}`,
  rateLimit: (identifier) => `ratelimit:${identifier}`
};

/**
 * User Database Operations
 */
const userDB = {
  /**
   * Create or update user
   * @param {Object} userData - User data object
   * @returns {Promise<Object>} - Created/updated user
   */
  async upsert(userData) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.user(userData.userId);
    
    const existing = await kv.get(key) || {};
    const updated = {
      ...existing,
      ...userData,
      updatedAt: Date.now(),
      createdAt: existing.createdAt || Date.now()
    };

    await kv.set(key, updated);

    // Index by username if available
    if (userData.username) {
      await kv.set(KEY_PATTERNS.userByUsername(userData.username.toLowerCase()), userData.userId);
    }

    return updated;
  },

  /**
   * Get user by ID
   * @param {string} userId - Telegram user ID
   * @returns {Promise<Object|null>} - User object or null
   */
  async get(userId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.user(userId));
  },

  /**
   * Get user by username
   * @param {string} username - Telegram username
   * @returns {Promise<Object|null>} - User object or null
   */
  async getByUsername(username) {
    const kv = getKVClient();
    const userId = await kv.get(KEY_PATTERNS.userByUsername(username.toLowerCase()));
    if (userId) {
      return await this.get(userId);
    }
    return null;
  },

  /**
   * Delete user (GDPR compliance)
   * @param {string} userId - Telegram user ID
   * @returns {Promise<boolean>}
   */
  async delete(userId) {
    const kv = getKVClient();
    const user = await this.get(userId);
    
    if (!user) {
      return false;
    }

    // Remove username index
    if (user.username) {
      await kv.del(KEY_PATTERNS.userByUsername(user.username.toLowerCase()));
    }

    // Delete user data
    await kv.del(KEY_PATTERNS.user(userId));
    
    // Also delete related data
    await kv.del(KEY_PATTERNS.stats(userId));
    await kv.del(KEY_PATTERNS.premium(userId));

    return true;
  },

  /**
   * Update user stats
   * @param {string} userId - Telegram user ID
   * @param {Object} updates - Stats to update
   * @returns {Promise<Object>} - Updated stats
   */
  async updateStats(userId, updates) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.stats(userId);
    
    const existing = await kv.get(key) || {
      totalXP: 0,
      level: 1,
      challengesWon: 0,
      outfitsCreated: 0,
      likesReceived: 0,
      wardrobeCount: 0
    };

    const updated = {
      ...existing,
      ...updates,
      lastActive: Date.now()
    };

    // Update leaderboard if XP changed
    if (updates.totalXP !== undefined && updates.totalXP !== existing.totalXP) {
      const leaderboardKey = KEY_PATTERNS.leaderboard('global');
      await kv.zadd(leaderboardKey, { score: updates.totalXP, member: userId });
      
      // Also add to weekly leaderboard
      const weeklyKey = KEY_PATTERNS.leaderboard('weekly');
      const xpDiff = updates.totalXP - existing.totalXP;
      if (xpDiff > 0) {
        await kv.zincrby(weeklyKey, xpDiff, userId);
      }
    }

    await kv.set(key, updated);
    return updated;
  },

  /**
   * Get user stats
   * @param {string} userId - Telegram user ID
   * @returns {Promise<Object>} - User stats
   */
  async getStats(userId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.stats(userId);
    
    return await kv.get(key) || {
      totalXP: 0,
      level: 1,
      challengesWon: 0,
      outfitsCreated: 0,
      likesReceived: 0,
      wardrobeCount: 0,
      lastActive: Date.now()
    };
  }
};

/**
 * Wardrobe Database Operations
 */
const wardrobeDB = {
  /**
   * Create wardrobe item
   * @param {string} userId - User ID
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} - Created item
   */
  async create(userId, itemData) {
    const kv = getKVClient();
    const itemId = itemData.id || generateId('item');
    const key = KEY_PATTERNS.wardrobe(userId, itemId);
    const listKey = KEY_PATTERNS.wardrobeList(userId);

    const item = {
      id: itemId,
      userId,
      ...itemData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await kv.set(key, item);
    
    // Add to user's wardrobe list (using Redis set)
    await kv.sadd(listKey, itemId);

    // Update wardrobe count
    await userDB.updateStats(userId, {
      wardrobeCount: await kv.scard(listKey)
    });

    return item;
  },

  /**
   * Get wardrobe item by ID
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Object|null>} - Item or null
   */
  async get(userId, itemId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.wardrobe(userId, itemId));
  },

  /**
   * Get all wardrobe items for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of items
   */
  async list(userId, options = {}) {
    const kv = getKVClient();
    const { category, limit = 100, offset = 0 } = options;
    
    const listKey = KEY_PATTERNS.wardrobeList(userId);
    const itemIds = await kv.smembers(listKey);
    
    // Get all items
    const items = [];
    for (const itemId of itemIds) {
      const item = await this.get(userId, itemId);
      if (item) {
        items.push(item);
      }
    }

    // Sort by created date (newest first)
    items.sort((a, b) => b.createdAt - a.createdAt);

    // Filter by category if specified
    let filtered = items;
    if (category) {
      filtered = items.filter(item => item.category === category.toLowerCase());
    }

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total: filtered.length,
      hasMore: filtered.length > offset + limit
    };
  },

  /**
   * Update wardrobe item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} - Updated item or null
   */
  async update(userId, itemId, updates) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.wardrobe(userId, itemId);
    
    const existing = await kv.get(key);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    await kv.set(key, updated);
    return updated;
  },

  /**
   * Delete wardrobe item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @returns {Promise<boolean>}
   */
  async delete(userId, itemId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.wardrobe(userId, itemId);
    const listKey = KEY_PATTERNS.wardrobeList(userId);

    const existing = await kv.get(key);
    if (!existing) {
      return false;
    }

    await kv.del(key);
    await kv.srem(listKey, itemId);

    // Update wardrobe count
    await userDB.updateStats(userId, {
      wardrobeCount: await kv.scard(listKey)
    });

    return true;
  },

  /**
   * Count items by category
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Category counts
   */
  async getCategoryCounts(userId) {
    const kv = getKVClient();
    const listKey = KEY_PATTERNS.wardrobeList(userId);
    const itemIds = await kv.smembers(listKey);
    
    const counts = {
      tops: 0,
      bottoms: 0,
      dresses: 0,
      shoes: 0,
      outerwear: 0,
      accessories: 0,
      total: itemIds.length
    };

    for (const itemId of itemIds) {
      const item = await this.get(userId, itemId);
      if (item && item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    }

    return counts;
  }
};

/**
 * Outfit Database Operations
 */
const outfitDB = {
  /**
   * Create outfit
   * @param {string} userId - User ID
   * @param {Object} outfitData - Outfit data
   * @returns {Promise<Object>} - Created outfit
   */
  async create(userId, outfitData) {
    const kv = getKVClient();
    const outfitId = outfitData.id || generateId('outfit');
    const key = KEY_PATTERNS.outfit(userId, outfitId);
    const listKey = KEY_PATTERNS.outfitList(userId);

    const outfit = {
      id: outfitId,
      userId,
      ...outfitData,
      likes: 0,
      isPublic: outfitData.isPublic || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await kv.set(key, outfit);
    await kv.sadd(listKey, outfitId);

    // Update stats
    await userDB.updateStats(userId, {
      outfitsCreated: await kv.scard(listKey)
    });

    return outfit;
  },

  /**
   * Get outfit by ID
   * @param {string} userId - User ID
   * @param {string} outfitId - Outfit ID
   * @returns {Promise<Object|null>}
   */
  async get(userId, outfitId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.outfit(userId, outfitId));
  },

  /**
   * List user's outfits
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async list(userId) {
    const kv = getKVClient();
    const listKey = KEY_PATTERNS.outfitList(userId);
    const outfitIds = await kv.smembers(listKey);
    
    const outfits = [];
    for (const outfitId of outfitIds) {
      const outfit = await this.get(userId, outfitId);
      if (outfit) {
        outfits.push(outfit);
      }
    }

    return outfits.sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Delete outfit
   * @param {string} userId - User ID
   * @param {string} outfitId - Outfit ID
   * @returns {Promise<boolean>}
   */
  async delete(userId, outfitId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.outfit(userId, outfitId);
    const listKey = KEY_PATTERNS.outfitList(userId);

    const existing = await kv.get(key);
    if (!existing) {
      return false;
    }

    await kv.del(key);
    await kv.srem(listKey, outfitId);

    return true;
  }
};

/**
 * Generate unique ID
 */
function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Health check - test database connection
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  try {
    const kv = getKVClient();
    await kv.set('health:check', Date.now());
    const value = await kv.get('health:check');
    await kv.del('health:check');
    return value !== null;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

module.exports = {
  getKVClient,
  KEY_PATTERNS,
  userDB,
  wardrobeDB,
  outfitDB,
  healthCheck,
  generateId
};
