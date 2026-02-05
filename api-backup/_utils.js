/**
 * FashionTON Wardrobe - Shared Utilities
 * Response helpers, validators, and common functions
 */

const crypto = require('crypto');

/**
 * Standard API response format
 */
function successResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

function errorResponse(code, message, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message
    },
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${crypto.randomBytes(8).toString('hex')}_${Date.now()}`;
}

/**
 * HTTP status codes mapping
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500
};

/**
 * Error codes
 */
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_FILE: 'INVALID_FILE',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
};

/**
 * Input validators
 */
const validators = {
  // Validate user ID (Telegram user IDs are positive integers)
  userId: (id) => {
    if (!id) return { valid: false, error: 'User ID is required' };
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId <= 0) {
      return { valid: false, error: 'Invalid user ID format' };
    }
    return { valid: true, value: numId.toString() };
  },

  // Validate wardrobe category
  category: (cat) => {
    const validCategories = ['tops', 'bottoms', 'dresses', 'shoes', 'outerwear', 'accessories'];
    if (!cat) return { valid: false, error: 'Category is required' };
    if (!validCategories.includes(cat.toLowerCase())) {
      return { valid: false, error: `Category must be one of: ${validCategories.join(', ')}` };
    }
    return { valid: true, value: cat.toLowerCase() };
  },

  // Validate color array
  colors: (colors) => {
    if (!colors) return { valid: true, value: [] };
    if (!Array.isArray(colors)) {
      return { valid: false, error: 'Colors must be an array' };
    }
    const validColors = colors.filter(c => typeof c === 'string' && c.trim().length > 0);
    return { valid: true, value: validColors.map(c => c.toLowerCase()) };
  },

  // Validate string field
  string: (value, fieldName, options = {}) => {
    const { minLength = 1, maxLength = 255, required = true } = options;
    
    if (!value && required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    
    if (!value && !required) {
      return { valid: true, value: null };
    }
    
    const str = String(value).trim();
    
    if (str.length < minLength) {
      return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
    }
    
    if (str.length > maxLength) {
      return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
    }
    
    return { valid: true, value: str };
  },

  // Validate image URL
  imageUrl: (url) => {
    if (!url) return { valid: false, error: 'Image URL is required' };
    
    try {
      const parsed = new URL(url);
      const validHosts = ['res.cloudinary.com', 'cloudinary.com'];
      const isValidHost = validHosts.some(host => parsed.hostname.includes(host));
      
      if (!isValidHost && !url.startsWith('https://')) {
        return { valid: false, error: 'Invalid image URL format' };
      }
      
      return { valid: true, value: url };
    } catch {
      return { valid: false, error: 'Invalid image URL' };
    }
  },

  // Validate file upload
  file: (file, options = {}) => {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;
    
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    return { valid: true, value: file };
  }
};

/**
 * Generate unique ID with prefix
 */
function generateId(prefix = 'item') {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}

/**
 * Parse request body based on content type
 */
async function parseRequestBody(req) {
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('application/json')) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('utf-8');
      return body ? JSON.parse(body) : {};
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  }
  
  return {};
}

/**
 * Rate limiting helper (simple in-memory)
 * For production, use Redis or Vercel KV
 */
const rateLimitStore = new Map();

function checkRateLimit(identifier, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const requests = rateLimitStore.get(identifier) || [];
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
    };
  }
  
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);
  
  return {
    allowed: true,
    remaining: limit - recentRequests.length,
    resetTime: now + windowMs
  };
}

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
  'Access-Control-Max-Age': '86400'
};

/**
 * Handle preflight OPTIONS request
 */
function handleOptions() {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: ''
  };
}

module.exports = {
  successResponse,
  errorResponse,
  generateRequestId,
  generateId,
  HTTP_STATUS,
  ERROR_CODES,
  validators,
  sanitizeInput,
  sanitizeObject,
  parseRequestBody,
  checkRateLimit,
  CORS_HEADERS,
  handleOptions
};
