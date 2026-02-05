/**
 * FashionTON Wardrobe - Consolidated Size Calculator API
 * Combines: size-calculator/index.js + brands.js
 * 
 * Endpoints:
 * - GET /api/size-calculator - List supported brands and categories
 * - POST /api/size-calculator - Calculate recommended size
 */

const crypto = require('crypto');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody,
  checkRateLimit
} = require('./_utils');

// ============ AUTHENTICATION ============

function verifyTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) return null;

    const authDate = parseInt(params.get('auth_date'), 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 24 * 60 * 60) return null;

    const user = JSON.parse(params.get('user'));
    return {
      userId: user.id.toString(),
      username: user.username || null,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      languageCode: user.language_code || 'en',
      isPremium: user.is_premium || false,
      authDate,
      hash
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

function authenticateRequest(req) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  let initData = req.headers['x-telegram-init-data'];
  if (!initData && req.query && req.query.initData) {
    initData = req.query.initData;
  }

  if (!initData) return null;
  return verifyTelegramWebAppData(initData, botToken);
}

function withAuth(handler, options = {}) {
  const { required = true } = options;

  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        body: JSON.stringify(errorResponse(
          'UNAUTHORIZED',
          'Invalid or missing Telegram authentication'
        ))
      };
    }

    req.user = user;
    return handler(req, res);
  };
}

// ============ BRAND CHARTS (from brands.js) ============

const BRAND_CHARTS = {
  zara: {
    name: 'Zara',
    region: 'EU',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'S', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'M', bust: { min: 90, max: 94 }, waist: { min: 70, max: 74 }, hips: { min: 96, max: 100 } },
          { label: 'L', bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 }, hips: { min: 100, max: 106 } },
          { label: 'XL', bust: { min: 100, max: 106 }, waist: { min: 80, max: 86 }, hips: { min: 106, max: 112 } },
          { label: 'XXL', bust: { min: 106, max: 112 }, waist: { min: 86, max: 92 }, hips: { min: 112, max: 118 } }
        ]
      },
      shoes: {
        unit: 'eu',
        sizes: [
          { label: '35', footLength: { min: 22.0, max: 22.4 } },
          { label: '36', footLength: { min: 22.5, max: 23.0 } },
          { label: '37', footLength: { min: 23.1, max: 23.5 } },
          { label: '38', footLength: { min: 23.6, max: 24.0 } },
          { label: '39', footLength: { min: 24.1, max: 24.5 } },
          { label: '40', footLength: { min: 24.6, max: 25.0 } },
          { label: '41', footLength: { min: 25.1, max: 25.5 } },
          { label: '42', footLength: { min: 25.6, max: 26.0 } },
          { label: '43', footLength: { min: 26.1, max: 26.5 } },
          { label: '44', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  hm: {
    name: 'H&M',
    region: 'EU',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 } },
          { label: 'M', bust: { min: 88, max: 96 }, waist: { min: 68, max: 76 } },
          { label: 'L', bust: { min: 96, max: 104 }, waist: { min: 76, max: 84 } },
          { label: 'XL', bust: { min: 104, max: 112 }, waist: { min: 84, max: 92 } },
          { label: 'XXL', bust: { min: 112, max: 120 }, waist: { min: 92, max: 100 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 60, max: 64 }, hips: { min: 86, max: 90 } },
          { label: 'S', waist: { min: 64, max: 68 }, hips: { min: 90, max: 94 } },
          { label: 'M', waist: { min: 68, max: 76 }, hips: { min: 94, max: 102 } },
          { label: 'L', waist: { min: 76, max: 84 }, hips: { min: 102, max: 110 } },
          { label: 'XL', waist: { min: 84, max: 92 }, hips: { min: 110, max: 118 } },
          { label: 'XXL', waist: { min: 92, max: 100 }, hips: { min: 118, max: 126 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 }, hips: { min: 86, max: 90 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 }, hips: { min: 90, max: 94 } },
          { label: 'M', bust: { min: 88, max: 96 }, waist: { min: 68, max: 76 }, hips: { min: 94, max: 102 } },
          { label: 'L', bust: { min: 96, max: 104 }, waist: { min: 76, max: 84 }, hips: { min: 102, max: 110 } },
          { label: 'XL', bust: { min: 104, max: 112 }, waist: { min: 84, max: 92 }, hips: { min: 110, max: 118 } },
          { label: 'XXL', bust: { min: 112, max: 120 }, waist: { min: 92, max: 100 }, hips: { min: 118, max: 126 } }
        ]
      },
      shoes: {
        unit: 'eu',
        sizes: [
          { label: '35', footLength: { min: 22.0, max: 22.4 } },
          { label: '36', footLength: { min: 22.5, max: 23.0 } },
          { label: '37', footLength: { min: 23.1, max: 23.5 } },
          { label: '38', footLength: { min: 23.6, max: 24.0 } },
          { label: '39', footLength: { min: 24.1, max: 24.5 } },
          { label: '40', footLength: { min: 24.6, max: 25.0 } },
          { label: '41', footLength: { min: 25.1, max: 25.5 } },
          { label: '42', footLength: { min: 25.6, max: 26.0 } },
          { label: '43', footLength: { min: 26.1, max: 26.5 } },
          { label: '44', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  uniqlo: {
    name: 'Uniqlo',
    region: 'JP',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 78, max: 82 }, waist: { min: 58, max: 62 } },
          { label: 'S', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 } },
          { label: 'M', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 } },
          { label: 'L', bust: { min: 90, max: 96 }, waist: { min: 70, max: 76 } },
          { label: 'XL', bust: { min: 96, max: 102 }, waist: { min: 76, max: 82 } },
          { label: 'XXL', bust: { min: 102, max: 108 }, waist: { min: 82, max: 88 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 58, max: 62 }, hips: { min: 84, max: 88 } },
          { label: 'S', waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'M', waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'L', waist: { min: 70, max: 76 }, hips: { min: 96, max: 102 } },
          { label: 'XL', waist: { min: 76, max: 82 }, hips: { min: 102, max: 108 } },
          { label: 'XXL', waist: { min: 82, max: 88 }, hips: { min: 108, max: 114 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 78, max: 82 }, waist: { min: 58, max: 62 }, hips: { min: 84, max: 88 } },
          { label: 'S', bust: { min: 82, max: 86 }, waist: { min: 62, max: 66 }, hips: { min: 88, max: 92 } },
          { label: 'M', bust: { min: 86, max: 90 }, waist: { min: 66, max: 70 }, hips: { min: 92, max: 96 } },
          { label: 'L', bust: { min: 90, max: 96 }, waist: { min: 70, max: 76 }, hips: { min: 96, max: 102 } },
          { label: 'XL', bust: { min: 96, max: 102 }, waist: { min: 76, max: 82 }, hips: { min: 102, max: 108 } },
          { label: 'XXL', bust: { min: 102, max: 108 }, waist: { min: 82, max: 88 }, hips: { min: 108, max: 114 } }
        ]
      },
      shoes: {
        unit: 'jp',
        sizes: [
          { label: '22.0', footLength: { min: 21.5, max: 22.0 } },
          { label: '22.5', footLength: { min: 22.1, max: 22.5 } },
          { label: '23.0', footLength: { min: 22.6, max: 23.0 } },
          { label: '23.5', footLength: { min: 23.1, max: 23.5 } },
          { label: '24.0', footLength: { min: 23.6, max: 24.0 } },
          { label: '24.5', footLength: { min: 24.1, max: 24.5 } },
          { label: '25.0', footLength: { min: 24.6, max: 25.0 } },
          { label: '25.5', footLength: { min: 25.1, max: 25.5 } },
          { label: '26.0', footLength: { min: 25.6, max: 26.0 } },
          { label: '26.5', footLength: { min: 26.1, max: 26.5 } },
          { label: '27.0', footLength: { min: 26.6, max: 27.0 } }
        ]
      }
    }
  },

  nike: {
    name: 'Nike',
    region: 'US',
    categories: {
      tops: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 } },
          { label: 'M', bust: { min: 88, max: 92 }, waist: { min: 68, max: 72 } },
          { label: 'L', bust: { min: 92, max: 100 }, waist: { min: 72, max: 80 } },
          { label: 'XL', bust: { min: 100, max: 108 }, waist: { min: 80, max: 88 } },
          { label: 'XXL', bust: { min: 108, max: 116 }, waist: { min: 88, max: 96 } }
        ]
      },
      bottoms: {
        unit: 'cm',
        sizes: [
          { label: 'XS', waist: { min: 60, max: 64 }, hips: { min: 84, max: 88 } },
          { label: 'S', waist: { min: 64, max: 68 }, hips: { min: 88, max: 92 } },
          { label: 'M', waist: { min: 68, max: 72 }, hips: { min: 92, max: 96 } },
          { label: 'L', waist: { min: 72, max: 80 }, hips: { min: 96, max: 104 } },
          { label: 'XL', waist: { min: 80, max: 88 }, hips: { min: 104, max: 112 } },
          { label: 'XXL', waist: { min: 88, max: 96 }, hips: { min: 112, max: 120 } }
        ]
      },
      dresses: {
        unit: 'cm',
        sizes: [
          { label: 'XS', bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 }, hips: { min: 84, max: 88 } },
          { label: 'S', bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 }, hips: { min: 88, max: 92 } },
          { label: 'M', bust: { min: 88, max: 92 }, waist: { min: 68, max: 72 }, hips: { min: 92, max: 96 } },
          { label: 'L', bust: { min: 92, max: 100 }, waist: { min: 72, max: 80 }, hips: { min: 96, max: 104 } },
          { label: 'XL', bust: { min: 100, max: 108 }, waist: { min: 80, max: 88 }, hips: { min: 104, max: 112 } },
          { label: 'XXL', bust: { min: 108, max: 116 }, waist: { min: 88, max: 96 }, hips: { min: 112, max: 120 } }
        ]
      },
      shoes: {
        unit: 'us',
        sizes: [
          { label: '5', footLength: { min: 21.6, max: 22.0 } },
          { label: '6', footLength: { min: 22.1, max: 22.5 } },
          { label: '7', footLength: { min: 22.6, max: 23.5 } },
          { label: '8', footLength: { min: 23.6, max: 24.0 } },
          { label: '9', footLength: { min: 24.1, max: 25.0 } },
          { label: '10', footLength: { min: 25.1, max: 25.5 } },
          { label: '11', footLength: { min: 25.6, max: 26.5 } },
          { label: '12', footLength: { min: 26.6, max: 27.0 } },
          { label: '13', footLength: { min: 27.1, max: 27.5 } }
        ]
      }
    }
  }
};

// ============ HELPER FUNCTIONS ============

function getAvailableBrands() {
  return Object.entries(BRAND_CHARTS).map(([key, data]) => ({
    key,
    name: data.name,
    region: data.region,
    categories: Object.keys(data.categories)
  }));
}

function getSizeChart(brandKey, category) {
  const brand = BRAND_CHARTS[brandKey.toLowerCase()];
  if (!brand) return null;
  return brand.categories[category.toLowerCase()] || null;
}

function hasSizeChart(brandKey, category) {
  const brand = BRAND_CHARTS[brandKey.toLowerCase()];
  if (!brand) return false;
  return !!brand.categories[category.toLowerCase()];
}

function getSupportedCategories() {
  return ['tops', 'bottoms', 'dresses', 'shoes'];
}

function formatSizeChartForResponse(brandKey, category) {
  const chart = getSizeChart(brandKey, category);
  if (!chart) return null;

  const formatted = {};
  chart.sizes.forEach(size => {
    formatted[size.label] = {};
    if (size.bust) formatted[size.label].bust = `${size.bust.min}-${size.bust.max}`;
    if (size.waist) formatted[size.label].waist = `${size.waist.min}-${size.waist.max}`;
    if (size.hips) formatted[size.label].hips = `${size.hips.min}-${size.hips.max}`;
    if (size.footLength) formatted[size.label].footLength = `${size.footLength.min}-${size.footLength.max}`;
  });

  return formatted;
}

// ============ HANDLERS ============

async function listBrandsAndCategories(req) {
  try {
    const brands = getAvailableBrands();
    const categories = getSupportedCategories();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        brands,
        categories,
        totalBrands: brands.length
      }, {
        message: 'List of supported brands and categories'
      }))
    };
  } catch (error) {
    console.error('List brands error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve brand list'
      ))
    };
  }
}

async function calculateSize(req) {
  const rateLimit = checkRateLimit(`size_calc:${req.user.userId}`, 30, 60000);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.RATE_LIMITED,
        'Too many size calculations. Please try again later.',
        { retryAfter: rateLimit.retryAfter }
      ))
    };
  }

  try {
    const body = await parseRequestBody(req);

    const validation = validateRequest(body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          validation.error
        ))
      };
    }

    const { brand, category, measurements, preferredFit = 'regular' } = body;

    if (!hasSizeChart(brand, category)) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          `Size chart not found for ${brand} ${category}. Check available brands and categories with GET /api/size-calculator`
        ))
      };
    }

    const result = calculateMatchScore(brand, category, measurements, preferredFit);
    const sizeChart = formatSizeChartForResponse(brand, category);
    const fitNotes = generateFitNotes(result, preferredFit, category);

    const response = {
      success: true,
      data: {
        recommendedSize: result.recommended?.size || null,
        confidence: result.confidence,
        alternativeSizes: result.alternatives.map(a => a.size),
        sizeChart,
        fitNotes,
        measurements: {
          provided: measurements,
          matched: result.matchedMeasurements
        },
        brand: {
          name: BRAND_CHARTS[brand.toLowerCase()].name,
          region: BRAND_CHARTS[brand.toLowerCase()].region
        }
      },
      meta: {
        requestId: generateRequestId(),
        timestamp: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Calculate size error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to calculate size recommendation'
      ))
    };
  }
}

function validateRequest(body) {
  if (!body.brand || typeof body.brand !== 'string') {
    return { valid: false, error: 'Brand is required (string)' };
  }

  if (!body.category || typeof body.category !== 'string') {
    return { valid: false, error: 'Category is required (string)' };
  }

  if (!body.measurements || typeof body.measurements !== 'object') {
    return { valid: false, error: 'Measurements object is required' };
  }

  const validCategories = ['tops', 'bottoms', 'dresses', 'shoes'];
  if (!validCategories.includes(body.category.toLowerCase())) {
    return { valid: false, error: `Category must be one of: ${validCategories.join(', ')}` };
  }

  const measurements = body.measurements;
  const category = body.category.toLowerCase();

  if (category === 'shoes') {
    if (!measurements.footLength || typeof measurements.footLength !== 'number') {
      return { valid: false, error: 'Foot length (in cm) is required for shoes' };
    }
  } else {
    if (!measurements.bust || typeof measurements.bust !== 'number') {
      return { valid: false, error: 'Bust measurement (in cm) is required' };
    }
    if (!measurements.waist || typeof measurements.waist !== 'number') {
      return { valid: false, error: 'Waist measurement (in cm) is required' };
    }
    if (category === 'bottoms' || category === 'dresses') {
      if (!measurements.hips || typeof measurements.hips !== 'number') {
        return { valid: false, error: 'Hips measurement (in cm) is required for bottoms and dresses' };
      }
    }
  }

  const validFits = ['tight', 'regular', 'loose'];
  if (body.preferredFit && !validFits.includes(body.preferredFit.toLowerCase())) {
    return { valid: false, error: `Preferred fit must be one of: ${validFits.join(', ')}` };
  }

  return { valid: true };
}

function calculateMatchScore(brand, category, measurements, preferredFit) {
  const chart = getSizeChart(brand, category);
  const categoryLower = category.toLowerCase();

  const matches = chart.sizes.map(size => {
    let score = 0;
    let measurementsMatched = 0;
    const matchedMeasurements = {};

    if (categoryLower === 'shoes') {
      if (size.footLength && measurements.footLength) {
        const footScore = calculateMeasurementScore(
          measurements.footLength,
          size.footLength.min,
          size.footLength.max
        );
        score += footScore;
        measurementsMatched++;
        matchedMeasurements.footLength = {
          provided: measurements.footLength,
          range: `${size.footLength.min}-${size.footLength.max}`,
          score: footScore
        };
      }
    } else {
      if (size.bust && measurements.bust) {
        const bustScore = calculateMeasurementScore(
          measurements.bust,
          size.bust.min,
          size.bust.max
        );
        score += bustScore;
        measurementsMatched++;
        matchedMeasurements.bust = {
          provided: measurements.bust,
          range: `${size.bust.min}-${size.bust.max}`,
          score: bustScore
        };
      }

      if (size.waist && measurements.waist) {
        const waistScore = calculateMeasurementScore(
          measurements.waist,
          size.waist.min,
          size.waist.max
        );
        score += waistScore;
        measurementsMatched++;
        matchedMeasurements.waist = {
          provided: measurements.waist,
          range: `${size.waist.min}-${size.waist.max}`,
          score: waistScore
        };
      }

      if (size.hips && measurements.hips) {
        const hipsScore = calculateMeasurementScore(
          measurements.hips,
          size.hips.min,
          size.hips.max
        );
        score += hipsScore;
        measurementsMatched++;
        matchedMeasurements.hips = {
          provided: measurements.hips,
          range: `${size.hips.min}-${size.hips.max}`,
          score: hipsScore
        };
      }
    }

    const avgScore = measurementsMatched > 0 ? score / measurementsMatched : 0;

    return {
      size: size.label,
      score: avgScore,
      fit: size,
      matchedMeasurements
    };
  });

  matches.sort((a, b) => b.score - a.score);
  const adjustedMatches = applyFitPreference(matches, preferredFit.toLowerCase(), categoryLower);
  const confidence = Math.min(adjustedMatches[0]?.score || 0, 1);

  return {
    recommended: adjustedMatches[0],
    alternatives: adjustedMatches.slice(1, 3),
    confidence: parseFloat(confidence.toFixed(2)),
    matchedMeasurements: adjustedMatches[0]?.matchedMeasurements || {}
  };
}

function calculateMeasurementScore(value, min, max) {
  const range = max - min;
  const center = (min + max) / 2;
  
  if (value >= min && value <= max) {
    const distanceFromCenter = Math.abs(value - center);
    return 1 - (distanceFromCenter / range) * 0.1;
  }
  
  if (value < min) {
    const diff = min - value;
    return Math.max(0, 1 - (diff / range) * 0.5);
  }
  
  const diff = value - max;
  return Math.max(0, 1 - (diff / range) * 0.5);
}

function applyFitPreference(matches, preferredFit, category) {
  if (!matches.length) return matches;

  const adjusted = [...matches];

  if (preferredFit === 'tight') {
    const best = adjusted[0];
    const measurements = Object.keys(best.matchedMeasurements);
    
    let nearLowerBound = false;
    for (const m of measurements) {
      const data = best.matchedMeasurements[m];
      const range = data.range.split('-').map(Number);
      const mid = (range[0] + range[1]) / 2;
      if (data.provided < mid) {
        nearLowerBound = true;
        break;
      }
    }

    if (nearLowerBound && adjusted.length > 1) {
      if (best.score - adjusted[1].score < 0.1) {
        [adjusted[0], adjusted[1]] = [adjusted[1], adjusted[0]];
      }
    }
  } else if (preferredFit === 'loose') {
    const best = adjusted[0];
    const measurements = Object.keys(best.matchedMeasurements);
    
    let nearUpperBound = false;
    for (const m of measurements) {
      const data = best.matchedMeasurements[m];
      const range = data.range.split('-').map(Number);
      const mid = (range[0] + range[1]) / 2;
      if (data.provided > mid) {
        nearUpperBound = true;
        break;
      }
    }

    if (nearUpperBound && adjusted.length > 1) {
      if (adjusted[1].score > 0.7) {
        [adjusted[0], adjusted[1]] = [adjusted[1], adjusted[0]];
      }
    }
  }

  return adjusted;
}

function generateFitNotes(result, preferredFit, category) {
  const notes = [];
  
  if (!result.recommended) {
    return 'Unable to determine best size. Please check your measurements.';
  }

  const size = result.recommended.size;
  const confidence = result.confidence;

  if (confidence >= 0.9) {
    notes.push(`Size ${size} is a perfect match for your measurements.`);
  } else if (confidence >= 0.7) {
    notes.push(`Size ${size} should fit well based on your measurements.`);
  } else if (confidence >= 0.5) {
    notes.push(`Size ${size} is the closest match, but you may want to try both ${size} and ${result.alternatives[0]?.size || 'the next size'}.`);
  } else {
    notes.push(`Your measurements don't align perfectly with standard sizing. Consider trying multiple sizes or checking the brand's specific measurements.`);
  }

  if (preferredFit === 'tight') {
    notes.push('For a tighter fit, consider sizing down if between sizes.');
  } else if (preferredFit === 'loose') {
    notes.push('For a looser, more relaxed fit, consider sizing up if between sizes.');
  } else {
    notes.push('Regular fit will provide a comfortable, standard fit.');
  }

  if (category === 'shoes') {
    notes.push('For shoes, measure your foot length at the end of the day when feet are largest.');
  } else if (category === 'dresses') {
    notes.push('For dresses, consider the fabric stretch when choosing your size.');
  }

  return notes.join(' ');
}

function generateRequestId() {
  return `req_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

// ============ MAIN HANDLER WITH ROUTING ============

async function sizeCalculatorHandler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await listBrandsAndCategories(req);
      case 'POST':
        return await calculateSize(req);
      case 'OPTIONS':
        return {
          statusCode: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
            'Access-Control-Max-Age': '86400'
          },
          body: ''
        };
      default:
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            'METHOD_NOT_ALLOWED',
            `Method ${method} not allowed`
          ))
        };
    }
  } catch (error) {
    console.error('Size Calculator API Error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Internal server error'
      ))
    };
  }
}

module.exports = withAuth(sizeCalculatorHandler, { required: true });
