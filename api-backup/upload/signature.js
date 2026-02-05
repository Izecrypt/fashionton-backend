/**
 * FashionTON Wardrobe - Cloudinary Upload Signature
 * Generates signed upload parameters for client-side uploads
 */

const { withAuth } = require('../_auth');
const { successResponse, errorResponse, HTTP_STATUS, ERROR_CODES } = require('../_utils');
const { generateUploadSignature } = require('../_cloudinary');
const { checkRateLimit } = require('../_utils');

/**
 * GET /api/upload/signature - Get signed upload parameters
 */
async function signatureHandler(req, res) {
  if (req.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  if (req.method !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        'METHOD_NOT_ALLOWED',
        'Only GET method is allowed'
      ))
    };
  }

  try {
    const { user } = req;

    // Rate limit: 10 signature requests per minute per user
    const rateLimit = checkRateLimit(`upload:${user.userId}`, 10, 60000);
    if (!rateLimit.allowed) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.RATE_LIMITED,
          'Too many upload requests. Please wait a moment.'
        ))
      };
    }

    // Generate upload signature
    const signatureData = generateUploadSignature({
      userId: user.userId,
      folder: 'fashionton/wardrobe'
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(successResponse(signatureData, {
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      }))
    };
  } catch (error) {
    console.error('Upload signature error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to generate upload signature'
      ))
    };
  }
}

module.exports = withAuth(signatureHandler, { required: true });
