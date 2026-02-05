/**
 * FashionTON Wardrobe - Consolidated Wardrobe API
 * Combines: wardrobe/index.js + upload/signature.js + _cloudinary.js
 * 
 * Endpoints:
 * - GET/POST/PUT/DELETE /api/wardrobe - Wardrobe CRUD
 * - GET /api/wardrobe/upload/signature - Image upload signature
 */

const { v2: cloudinary } = require('cloudinary');
const crypto = require('crypto');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  validators,
  parseRequestBody,
  generateId,
  checkRateLimit
} = require('./_utils');
const { wardrobeDB, userDB } = require('./_db');

// ============ CLOUDINARY HELPERS (from _cloudinary.js) ============

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function generateUploadSignature(options = {}) {
  configureCloudinary();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || 'fashionton/wardrobe';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'fashionton_uploads';

  const paramsToSign = {
    timestamp,
    folder,
    upload_preset: uploadPreset,
    moderation: 'aws_rek',
    ...(options.userId && { tags: `user_${options.userId}` })
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    uploadPreset,
    moderation: 'aws_rek'
  };
}

async function uploadImage(base64Data, options = {}) {
  configureCloudinary();

  const {
    folder = 'fashionton/wardrobe',
    userId,
    tags = [],
    transformation = []
  } = options;

  const data = base64Data.startsWith('data:') 
    ? base64Data 
    : `data:image/jpeg;base64,${base64Data}`;

  const uploadOptions = {
    folder,
    resource_type: 'image',
    moderation: 'aws_rek',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      ...transformation
    ],
    tags: [
      'fashionton',
      ...(userId ? [`user_${userId}`] : []),
      ...tags
    ]
  };

  try {
    const result = await cloudinary.uploader.upload(data, uploadOptions);
    
    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      thumbnailUrl: generateThumbnailUrl(result.public_id),
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      moderationStatus: result.moderation ? result.moderation[0].status : 'pending'
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

function generateThumbnailUrl(publicId) {
  configureCloudinary();
  
  return cloudinary.url(publicId, {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto'
  });
}

async function deleteImage(publicId) {
  configureCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

function extractPublicId(url) {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

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

// ============ LIMITS ============

const LIMITS = {
  free: { wardrobeItems: 20 },
  premium: { wardrobeItems: Infinity }
};

// ============ WARDROBE HANDLERS ============

async function listWardrobeItems(req) {
  const { user } = req;
  const { category, limit = '20', offset = '0' } = req.query || {};

  try {
    const options = {
      category,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };

    const result = await wardrobeDB.list(user.userId, options);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(result.items, {
        pagination: {
          total: result.total,
          limit: options.limit,
          offset: options.offset,
          hasMore: result.hasMore
        }
      }))
    };
  } catch (error) {
    console.error('List wardrobe items error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve wardrobe items'
      ))
    };
  }
}

async function addWardrobeItem(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);

    const stats = await userDB.getStats(user.userId);
    const isPremium = user.isPremium;
    const limit = isPremium ? LIMITS.premium.wardrobeItems : LIMITS.free.wardrobeItems;

    if (stats.wardrobeCount >= limit) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.LIMIT_EXCEEDED,
          `Free tier allows ${LIMITS.free.wardrobeItems} wardrobe items. Upgrade to premium for unlimited items.`,
          { upgradeUrl: '/premium' }
        ))
      };
    }

    const categoryValidation = validators.category(body.category);
    if (!categoryValidation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          categoryValidation.error
        ))
      };
    }

    let imageUrl = body.imageUrl;
    let thumbnailUrl = body.thumbnailUrl;

    if (body.imageBase64) {
      try {
        const uploadResult = await uploadImage(body.imageBase64, {
          userId: user.userId,
          folder: 'fashionton/wardrobe'
        });
        imageUrl = uploadResult.url;
        thumbnailUrl = uploadResult.thumbnailUrl;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            ERROR_CODES.UPLOAD_FAILED,
            'Failed to upload image. Please try again.'
          ))
        };
      }
    }

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Image URL or base64 data is required'
        ))
      };
    }

    const colorsValidation = validators.colors(body.colors || body.color);
    const brandValidation = validators.string(body.brand, 'Brand', { required: false, maxLength: 100 });
    const sizeValidation = validators.string(body.size, 'Size', { required: false, maxLength: 20 });
    const notesValidation = validators.string(body.notes, 'Notes', { required: false, maxLength: 1000 });

    const itemData = {
      id: generateId('item'),
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      category: categoryValidation.value,
      subcategory: body.subcategory || null,
      colors: colorsValidation.value,
      season: body.season || [],
      occasion: body.occasion || [],
      brand: brandValidation.value,
      size: sizeValidation.value,
      notes: notesValidation.value,
      isFavorite: body.isFavorite || false
    };

    const createdItem = await wardrobeDB.create(user.userId, itemData);

    await userDB.updateStats(user.userId, {
      totalXP: (stats.totalXP || 0) + 10
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(createdItem, {
        message: 'Item added to wardrobe successfully',
        xpEarned: 10
      }))
    };
  } catch (error) {
    console.error('Add wardrobe item error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to add wardrobe item'
      ))
    };
  }
}

async function updateWardrobeItem(req, itemId) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);

    const existingItem = await wardrobeDB.get(user.userId, itemId);
    if (!existingItem) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Wardrobe item not found'
        ))
      };
    }

    const updates = {};

    if (body.category !== undefined) {
      const validation = validators.category(body.category);
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
      updates.category = validation.value;
    }

    if (body.colors !== undefined) {
      const validation = validators.colors(body.colors);
      updates.colors = validation.value;
    }

    if (body.brand !== undefined) {
      const validation = validators.string(body.brand, 'Brand', { required: false, maxLength: 100 });
      updates.brand = validation.value;
    }

    if (body.size !== undefined) {
      const validation = validators.string(body.size, 'Size', { required: false, maxLength: 20 });
      updates.size = validation.value;
    }

    if (body.notes !== undefined) {
      const validation = validators.string(body.notes, 'Notes', { required: false, maxLength: 1000 });
      updates.notes = validation.value;
    }

    if (body.subcategory !== undefined) updates.subcategory = body.subcategory || null;
    if (body.season !== undefined) updates.season = Array.isArray(body.season) ? body.season : [];
    if (body.occasion !== undefined) updates.occasion = Array.isArray(body.occasion) ? body.occasion : [];
    if (body.isFavorite !== undefined) updates.isFavorite = Boolean(body.isFavorite);

    if (body.imageBase64) {
      try {
        const uploadResult = await uploadImage(body.imageBase64, {
          userId: user.userId,
          folder: 'fashionton/wardrobe'
        });
        updates.imageUrl = uploadResult.url;
        updates.thumbnailUrl = uploadResult.thumbnailUrl;

        if (existingItem.imageUrl) {
          try {
            const publicId = extractPublicId(existingItem.imageUrl);
            if (publicId) await deleteImage(publicId);
          } catch (deleteError) {
            console.warn('Failed to delete old image:', deleteError);
          }
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            ERROR_CODES.UPLOAD_FAILED,
            'Failed to upload new image'
          ))
        };
      }
    }

    const updatedItem = await wardrobeDB.update(user.userId, itemId, updates);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(updatedItem, {
        message: 'Item updated successfully'
      }))
    };
  } catch (error) {
    console.error('Update wardrobe item error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to update wardrobe item'
      ))
    };
  }
}

async function deleteWardrobeItem(req, itemId) {
  const { user } = req;

  try {
    const existingItem = await wardrobeDB.get(user.userId, itemId);
    if (!existingItem) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Wardrobe item not found'
        ))
      };
    }

    const deleted = await wardrobeDB.delete(user.userId, itemId);

    if (!deleted) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to delete item'
        ))
      };
    }

    if (existingItem.imageUrl) {
      try {
        const publicId = extractPublicId(existingItem.imageUrl);
        if (publicId) await deleteImage(publicId);
      } catch (deleteError) {
        console.warn('Failed to delete image from Cloudinary:', deleteError);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        deletedItemId: itemId,
        message: 'Item removed from wardrobe successfully'
      }))
    };
  } catch (error) {
    console.error('Delete wardrobe item error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to delete wardrobe item'
      ))
    };
  }
}

// ============ UPLOAD SIGNATURE HANDLER ============

async function getUploadSignature(req) {
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

// ============ MAIN HANDLER WITH ROUTING ============

async function wardrobeHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Check for upload signature sub-route
  if (url.includes('/upload/signature')) {
    return await getUploadSignature(req);
  }
  
  // Extract item ID from path if present
  const pathMatch = url.match(/\/api\/wardrobe\/([^\/\?]+)/);
  const itemId = pathMatch ? pathMatch[1] : null;

  try {
    switch (method) {
      case 'GET':
        return await listWardrobeItems(req);
      case 'POST':
        return await addWardrobeItem(req);
      case 'PUT':
        if (!itemId) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_INPUT,
              'Item ID required for update'
            ))
          };
        }
        return await updateWardrobeItem(req, itemId);
      case 'DELETE':
        if (!itemId) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_INPUT,
              'Item ID required for deletion'
            ))
          };
        }
        return await deleteWardrobeItem(req, itemId);
      case 'OPTIONS':
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
    console.error('Wardrobe API Error:', error);
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

module.exports = withAuth(wardrobeHandler, { required: true });
