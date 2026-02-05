/**
 * FashionTON Wardrobe - Size Calculator API
 * POST: Calculate recommended size based on measurements
 * GET: List supported brands and categories
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody,
  checkRateLimit
} = require('../_utils');
const { 
  BRAND_CHARTS, 
  getAvailableBrands, 
  getSizeChart, 
  hasSizeChart,
  getSupportedCategories,
  formatSizeChartForResponse
} = require('./brands');

/**
 * Handler for size calculator API
 */
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

/**
 * GET /api/size-calculator - List supported brands and categories
 */
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

/**
 * POST /api/size-calculator - Calculate recommended size
 */
async function calculateSize(req) {
  // Rate limiting - 30 calculations per minute per user
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

    // Validate required fields
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

    // Check if brand and category exist
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

    // Calculate recommended size
    const result = calculateMatchScore(brand, category, measurements, preferredFit);
    
    // Format size chart for response
    const sizeChart = formatSizeChartForResponse(brand, category);

    // Generate fit notes
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

/**
 * Validate size calculation request
 */
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

  // Validate measurements based on category
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

  // Validate preferred fit
  const validFits = ['tight', 'regular', 'loose'];
  if (body.preferredFit && !validFits.includes(body.preferredFit.toLowerCase())) {
    return { valid: false, error: `Preferred fit must be one of: ${validFits.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Calculate match score for each size
 */
function calculateMatchScore(brand, category, measurements, preferredFit) {
  const chart = getSizeChart(brand, category);
  const categoryLower = category.toLowerCase();

  // Calculate score for each size
  const matches = chart.sizes.map(size => {
    let score = 0;
    let measurementsMatched = 0;
    const matchedMeasurements = {};

    // Calculate score based on category
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
      // Tops, bottoms, dresses
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

    // Average score
    const avgScore = measurementsMatched > 0 ? score / measurementsMatched : 0;

    return {
      size: size.label,
      score: avgScore,
      fit: size,
      matchedMeasurements
    };
  });

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);

  // Apply fit preference adjustment
  const adjustedMatches = applyFitPreference(matches, preferredFit.toLowerCase(), categoryLower);

  // Calculate confidence (normalize to 0-1)
  const confidence = Math.min(adjustedMatches[0]?.score || 0, 1);

  return {
    recommended: adjustedMatches[0],
    alternatives: adjustedMatches.slice(1, 3),
    confidence: parseFloat(confidence.toFixed(2)),
    matchedMeasurements: adjustedMatches[0]?.matchedMeasurements || {}
  };
}

/**
 * Calculate individual measurement score
 * Score is 1.0 if measurement is within range, decreases as it moves away
 */
function calculateMeasurementScore(value, min, max) {
  const range = max - min;
  const center = (min + max) / 2;
  
  // Within range - perfect score
  if (value >= min && value <= max) {
    // Slight bonus for being closer to center
    const distanceFromCenter = Math.abs(value - center);
    return 1 - (distanceFromCenter / range) * 0.1;
  }
  
  // Below range
  if (value < min) {
    const diff = min - value;
    return Math.max(0, 1 - (diff / range) * 0.5);
  }
  
  // Above range
  const diff = value - max;
  return Math.max(0, 1 - (diff / range) * 0.5);
}

/**
 * Apply fit preference adjustment to recommendations
 */
function applyFitPreference(matches, preferredFit, category) {
  if (!matches.length) return matches;

  const adjusted = [...matches];

  if (preferredFit === 'tight') {
    // For tight fit, prefer smaller size if borderline
    // Find if best match is at the lower end of its range
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

    // If measurements are in lower half, suggest next size down if available
    if (nearLowerBound && adjusted.length > 1) {
      // Check if second option is one size smaller
      // For now, we just boost the second option slightly if scores are close
      if (best.score - adjusted[1].score < 0.1) {
        // Swap if second option provides tighter fit
        [adjusted[0], adjusted[1]] = [adjusted[1], adjusted[0]];
      }
    }
  } else if (preferredFit === 'loose') {
    // For loose fit, prefer larger size if borderline
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

    // If measurements are in upper half, suggest next size up if available
    if (nearUpperBound && adjusted.length > 1) {
      if (adjusted[1].score > 0.7) {
        // Swap if second option provides looser fit
        [adjusted[0], adjusted[1]] = [adjusted[1], adjusted[0]];
      }
    }
  }

  return adjusted;
}

/**
 * Generate human-readable fit notes
 */
function generateFitNotes(result, preferredFit, category) {
  const notes = [];
  
  if (!result.recommended) {
    return 'Unable to determine best size. Please check your measurements.';
  }

  const size = result.recommended.size;
  const confidence = result.confidence;

  // Confidence-based notes
  if (confidence >= 0.9) {
    notes.push(`Size ${size} is a perfect match for your measurements.`);
  } else if (confidence >= 0.7) {
    notes.push(`Size ${size} should fit well based on your measurements.`);
  } else if (confidence >= 0.5) {
    notes.push(`Size ${size} is the closest match, but you may want to try both ${size} and ${result.alternatives[0]?.size || 'the next size'}.`);
  } else {
    notes.push(`Your measurements don't align perfectly with standard sizing. Consider trying multiple sizes or checking the brand's specific measurements.`);
  }

  // Fit preference notes
  if (preferredFit === 'tight') {
    notes.push('For a tighter fit, consider sizing down if between sizes.');
  } else if (preferredFit === 'loose') {
    notes.push('For a looser, more relaxed fit, consider sizing up if between sizes.');
  } else {
    notes.push('Regular fit will provide a comfortable, standard fit.');
  }

  // Category-specific notes
  if (category === 'shoes') {
    notes.push('For shoes, measure your foot length at the end of the day when feet are largest.');
  } else if (category === 'dresses') {
    notes.push('For dresses, consider the fabric stretch when choosing your size.');
  }

  return notes.join(' ');
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

// Export with authentication wrapper
module.exports = withAuth(sizeCalculatorHandler, { required: true });
