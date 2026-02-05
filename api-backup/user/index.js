/**
 * FashionTON Wardrobe - User API
 * POST: Create/update user
 * GET: Get user profile
 * DELETE: Delete account (GDPR)
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody 
} = require('../_utils');
const { userDB, wardrobeDB, outfitDB, getKVClient } = require('../_db');

/**
 * Handler for all user API methods
 */
async function userHandler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getUserProfile(req);
      case 'POST':
        return await createOrUpdateUser(req);
      case 'DELETE':
        return await deleteUserAccount(req);
      case 'OPTIONS':
        return {
          statusCode: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    console.error('User API Error:', error);
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
 * GET /api/user - Get user profile
 */
async function getUserProfile(req) {
  const { user } = req;
  const { includeStats = 'true' } = req.query || {};

  try {
    // Get user data from database
    const userData = await userDB.get(user.userId);
    
    if (!userData) {
      // User not found, return basic auth info
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(successResponse({
          userId: user.userId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isPremium: user.isPremium,
          isNewUser: true
        }))
      };
    }

    // Build response
    const response = {
      userId: userData.userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatarUrl: userData.avatarUrl || null,
      isPremium: userData.isPremium || user.isPremium,
      languageCode: userData.languageCode || user.languageCode,
      joinedAt: userData.createdAt,
      lastActive: userData.updatedAt,
      isNewUser: false
    };

    // Include stats if requested
    if (includeStats === 'true') {
      const stats = await userDB.getStats(user.userId);
      const categoryCounts = await wardrobeDB.getCategoryCounts(user.userId);
      
      // Get check-in info for streak
      const kv = getKVClient();
      const checkinData = await kv.get(`checkin:${user.userId}`);
      
      response.stats = {
        totalXP: stats.totalXP,
        level: stats.level,
        title: getLevelTitle(stats.level),
        challengesWon: stats.challengesWon,
        outfitsCreated: stats.outfitsCreated,
        likesReceived: stats.likesReceived,
        wardrobeCount: stats.wardrobeCount,
        currentStreak: checkinData?.currentStreak || 0,
        longestStreak: checkinData?.longestStreak || 0,
        lastCheckIn: checkinData?.lastCheckIn || null,
        categoryCounts
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(response))
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve user profile'
      ))
    };
  }
}

/**
 * POST /api/user - Create or update user
 */
async function createOrUpdateUser(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);
    
    // Prepare user data
    const userData = {
      userId: user.userId,
      username: body.username || user.username,
      firstName: body.firstName || user.firstName,
      lastName: body.lastName || user.lastName,
      avatarUrl: body.avatarUrl || null,
      languageCode: body.languageCode || user.languageCode,
      isPremium: user.isPremium,
      updatedAt: Date.now()
    };

    // Check if user exists
    const existingUser = await userDB.get(user.userId);
    const isNewUser = !existingUser;

    if (isNewUser) {
      userData.createdAt = Date.now();
    }

    // Save user
    const savedUser = await userDB.upsert(userData);

    // Initialize stats for new users
    if (isNewUser) {
      await userDB.updateStats(user.userId, {
        totalXP: 0,
        level: 1,
        challengesWon: 0,
        outfitsCreated: 0,
        likesReceived: 0,
        wardrobeCount: 0,
        lastActive: Date.now()
      });
    }

    // Build response
    const response = {
      userId: savedUser.userId,
      username: savedUser.username,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      avatarUrl: savedUser.avatarUrl,
      isPremium: savedUser.isPremium,
      languageCode: savedUser.languageCode,
      joinedAt: savedUser.createdAt,
      isNewUser
    };

    return {
      statusCode: isNewUser ? 201 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(response, {
        isNewUser,
        message: isNewUser ? 'User created successfully' : 'User updated successfully'
      }))
    };
  } catch (error) {
    console.error('Create/update user error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to create/update user'
      ))
    };
  }
}

/**
 * DELETE /api/user - Delete user account (GDPR compliance)
 */
async function deleteUserAccount(req) {
  const { user } = req;

  try {
    // Parse request body for confirmation
    const body = await parseRequestBody(req);
    
    // Require explicit confirmation
    if (!body.confirmDelete || body.confirmDelete !== true) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Please confirm deletion by setting confirmDelete: true'
        ))
      };
    }

    // Get user's wardrobe items and outfits for cleanup
    const wardrobeData = await wardrobeDB.list(user.userId);
    const outfits = await outfitDB.list(user.userId);

    // Delete all wardrobe items
    for (const item of wardrobeData.items) {
      await wardrobeDB.delete(user.userId, item.id);
    }

    // Delete all outfits
    for (const outfit of outfits) {
      await outfitDB.delete(user.userId, outfit.id);
    }

    // Delete check-in data and XP history
    const kv = getKVClient();
    await kv.del(`checkin:${user.userId}`);
    await kv.del(`xp:history:${user.userId}`);
    
    // Delete user account
    const deleted = await userDB.delete(user.userId);

    if (!deleted) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          'User not found'
        ))
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        message: 'Account and all associated data deleted successfully',
        deletedAt: new Date().toISOString(),
        deletedItems: {
          wardrobeItems: wardrobeData.items.length,
          outfits: outfits.length
        }
      }))
    };
  } catch (error) {
    console.error('Delete user error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to delete account'
      ))
    };
  }
}

/**
 * Get level title based on level number
 */
function getLevelTitle(level) {
  const titles = {
    1: 'Fashion Newbie',
    2: 'Style Explorer',
    3: 'Trendsetter',
    4: 'Wardrobe Wizard',
    5: 'Fashionista',
    6: 'Style Icon',
    7: 'Trend Forecaster',
    8: 'Fashion Guru',
    9: 'Style Master',
    10: 'Fashion Legend'
  };
  return titles[level] || 'Fashion Newbie';
}

// Export with authentication wrapper
module.exports = withAuth(userHandler, { required: true });
