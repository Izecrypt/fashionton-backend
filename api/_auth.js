/**
 * FashionTON Wardrobe - Telegram WebApp Authentication Middleware
 * Verifies initData from Telegram WebApp
 */

const crypto = require('crypto');

/**
 * Verify Telegram WebApp initData
 * @param {string} initData - The initData string from Telegram WebApp
 * @param {string} botToken - Your Telegram bot token
 * @returns {Object|null} - User object if valid, null if invalid
 */
function verifyTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) {
    return null;
  }

  try {
    // Parse the initData string
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return null;
    }

    // Remove hash from params for verification
    params.delete('hash');

    // Sort params alphabetically and create data-check-string
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');

    // Create secret key from bot token
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Calculate hash
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Verify hash
    if (calculatedHash !== hash) {
      return null;
    }

    // Check auth_date is not too old (optional, prevents replay attacks)
    const authDate = parseInt(params.get('auth_date'), 10);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    
    if (now - authDate > maxAge) {
      return null;
    }

    // Parse user data
    const userJson = params.get('user');
    if (!userJson) {
      return null;
    }

    const user = JSON.parse(userJson);
    
    return {
      userId: user.id.toString(),
      username: user.username || null,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      languageCode: user.language_code || 'en',
      isPremium: user.is_premium || false,
      authDate: authDate,
      hash: hash
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

/**
 * Extract and verify authorization from request
 * Supports both header and query parameter
 * 
 * @param {Object} req - HTTP request object
 * @returns {Object|null} - User object if valid, null if invalid
 */
function authenticateRequest(req) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  // Try to get initData from header first
  let initData = req.headers['x-telegram-init-data'];
  
  // Fallback to query parameter (for GET requests)
  if (!initData && req.query && req.query.initData) {
    initData = req.query.initData;
  }

  if (!initData) {
    return null;
  }

  return verifyTelegramWebAppData(initData, botToken);
}

/**
 * Vercel serverless function wrapper with auth
 * Usage: module.exports = withAuth(async (req, res) => { ... });
 * 
 * @param {Function} handler - Your API handler function
 * @param {Object} options - Auth options
 * @returns {Function} - Wrapped handler
 */
function withAuth(handler, options = {}) {
  const { required = true } = options;

  return async (req, res) => {
    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    const user = authenticateRequest(req);

    if (required && !user) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing Telegram authentication'
          }
        })
      };
    }

    // Attach user to request
    req.user = user;

    // Call the actual handler
    return handler(req, res);
  };
}

/**
 * Development mode bypass (DO NOT USE IN PRODUCTION)
 * For testing purposes only
 */
function createMockUser(userId = '123456789') {
  return {
    userId: userId,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    languageCode: 'en',
    isPremium: false,
    authDate: Math.floor(Date.now() / 1000),
    hash: 'mock_hash'
  };
}

/**
 * Check if user is premium
 * @param {Object} user - User object from auth
 * @returns {boolean}
 */
function isPremiumUser(user) {
  return user && user.isPremium === true;
}

/**
 * Get user display name
 * @param {Object} user - User object from auth
 * @returns {string}
 */
function getUserDisplayName(user) {
  if (!user) return 'Anonymous';
  if (user.username) return `@${user.username}`;
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
}

module.exports = {
  verifyTelegramWebAppData,
  authenticateRequest,
  withAuth,
  createMockUser,
  isPremiumUser,
  getUserDisplayName
};
