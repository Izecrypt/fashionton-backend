/**
 * FashionTON Wardrobe - Wardrobe API
 * GET: List user's wardrobe items
 * POST: Add new item (with Cloudinary upload)
 * PUT: Update item details
 * DELETE: Remove item
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  validators,
  parseRequestBody,
  generateId
} = require('../_utils');
const { wardrobeDB, userDB } = require('../_db');
const { uploadImage, deleteImage, validateImageFile } = require('../_cloudinary');

// Free tier limits
const LIMITS = {
  free: {
    wardrobeItems: 20
  },
  premium: {
    wardrobeItems: Infinity
  }
};

/**
 * Handler for all wardrobe API methods
 */
async function wardrobeHandler(req, res) {
  const { method } = req;
  const { searchParams } = new URL(req.url || `http://localhost${req.url}`, 'http://localhost');
  
  // Extract item ID from path if present (/api/wardrobe/:id)
  const url = req.url || '';
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

/**
 * GET /api/wardrobe - List user's wardrobe items
 */
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

/**
 * POST /api/wardrobe - Add new item
 */
async function addWardrobeItem(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);

    // Check free tier limit
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

    // Validate required fields
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

    // Validate image URL or handle base64 upload
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

    // Validate colors
    const colorsValidation = validators.colors(body.colors || body.color);
    
    // Validate optional fields
    const brandValidation = validators.string(body.brand, 'Brand', { required: false, maxLength: 100 });
    const sizeValidation = validators.string(body.size, 'Size', { required: false, maxLength: 20 });
    const notesValidation = validators.string(body.notes, 'Notes', { required: false, maxLength: 1000 });

    // Create item
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

    // Award XP for adding item
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

/**
 * PUT /api/wardrobe/:id - Update item details
 */
async function updateWardrobeItem(req, itemId) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);

    // Check item exists and belongs to user
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

    // Build updates object with only provided fields
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

    if (body.subcategory !== undefined) {
      updates.subcategory = body.subcategory || null;
    }

    if (body.season !== undefined) {
      updates.season = Array.isArray(body.season) ? body.season : [];
    }

    if (body.occasion !== undefined) {
      updates.occasion = Array.isArray(body.occasion) ? body.occasion : [];
    }

    if (body.isFavorite !== undefined) {
      updates.isFavorite = Boolean(body.isFavorite);
    }

    // Handle image update
    if (body.imageBase64) {
      try {
        const uploadResult = await uploadImage(body.imageBase64, {
          userId: user.userId,
          folder: 'fashionton/wardrobe'
        });
        updates.imageUrl = uploadResult.url;
        updates.thumbnailUrl = uploadResult.thumbnailUrl;

        // Delete old image if it exists
        if (existingItem.imageUrl) {
          try {
            const publicId = extractPublicId(existingItem.imageUrl);
            if (publicId) {
              await deleteImage(publicId);
            }
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

/**
 * DELETE /api/wardrobe/:id - Remove item
 */
async function deleteWardrobeItem(req, itemId) {
  const { user } = req;

  try {
    // Check item exists and belongs to user
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

    // Delete the item
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

    // Try to delete image from Cloudinary
    if (existingItem.imageUrl) {
      try {
        const publicId = extractPublicId(existingItem.imageUrl);
        if (publicId) {
          await deleteImage(publicId);
        }
      } catch (deleteError) {
        console.warn('Failed to delete image from Cloudinary:', deleteError);
        // Don't fail the request if image deletion fails
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

/**
 * Extract Cloudinary public ID from URL
 */
function extractPublicId(url) {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Export with authentication wrapper
module.exports = withAuth(wardrobeHandler, { required: true });
