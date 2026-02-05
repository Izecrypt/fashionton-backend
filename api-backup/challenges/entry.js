/**
 * FashionTON Wardrobe - Challenge Entry API
 * POST /api/challenges/entry - Submit entry to current challenge
 * DELETE /api/challenges/entry/:id - Remove entry (before voting starts)
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
const { userDB } = require('../_db');
const { challengeDB, entryDB } = require('./index');
const { uploadImage } = require('../_cloudinary');

// Entry XP reward
const ENTRY_XP = 25;

/**
 * Entry handler
 */
async function entryHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Parse entry ID from path if present
  const pathMatch = url.match(/\/api\/challenges\/entry\/([^\/\?]+)/);
  const entryId = pathMatch ? pathMatch[1] : null;

  try {
    switch (method) {
      case 'POST':
        return await submitEntry(req);
      case 'DELETE':
        if (!entryId) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_INPUT,
              'Entry ID required for deletion'
            ))
          };
        }
        return await deleteEntry(req, entryId);
      case 'OPTIONS':
        return {
          statusCode: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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
    console.error('Entry API Error:', error);
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
 * POST /api/challenges/entry - Submit entry to current challenge
 */
async function submitEntry(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);

    // Get current challenge
    const challenge = await challengeDB.getCurrent();

    if (!challenge) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'No active challenge at this time'
        ))
      };
    }

    // Check challenge is in entry phase
    if (challenge.status !== 'active') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          `Challenge is no longer accepting entries (current status: ${challenge.status})`
        ))
      };
    }

    // Check if user already submitted an entry
    const existingEntry = await entryDB.getUserEntry(user.userId, challenge.id);
    if (existingEntry) {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'DUPLICATE_ENTRY',
          'You have already submitted an entry to this challenge',
          { entryId: existingEntry.id }
        ))
      };
    }

    // Handle photo upload
    let photoUrl = body.photoUrl;
    
    if (body.photoBase64) {
      try {
        const uploadResult = await uploadImage(body.photoBase64, {
          userId: user.userId,
          folder: 'fashionton/challenges',
          tags: ['challenge_entry', `challenge_${challenge.id}`]
        });

        // Check moderation status
        if (uploadResult.moderationStatus === 'rejected') {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_FILE,
              'Image failed content moderation. Please upload an appropriate fashion photo.'
            ))
          };
        }

        photoUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('Photo upload error:', uploadError);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            ERROR_CODES.UPLOAD_FAILED,
            'Failed to upload photo. Please try again.'
          ))
        };
      }
    }

    // Validate photo URL
    if (!photoUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Photo is required for challenge entry'
        ))
      };
    }

    // Validate outfit ID if provided
    let outfitId = null;
    if (body.outfitId) {
      const { outfitDB } = require('../_db');
      const outfit = await outfitDB.get(user.userId, body.outfitId);
      if (outfit) {
        outfitId = body.outfitId;
      }
    }

    // Create entry
    const entryData = {
      userId: user.userId,
      username: user.username || user.firstName,
      photoUrl,
      outfitId
    };

    const entry = await entryDB.create(challenge.id, entryData);

    // Award XP for submitting entry
    const stats = await userDB.getStats(user.userId);
    await userDB.updateStats(user.userId, {
      totalXP: (stats.totalXP || 0) + ENTRY_XP
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        id: entry.id,
        challengeId: entry.challengeId,
        photoUrl: entry.photoUrl,
        outfitId: entry.outfitId,
        createdAt: entry.createdAt,
        xpEarned: ENTRY_XP,
        message: 'Entry submitted successfully!'
      }, {
        message: 'Entry submitted successfully'
      }))
    };
  } catch (error) {
    console.error('Submit entry error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to submit entry'
      ))
    };
  }
}

/**
 * DELETE /api/challenges/entry/:id - Remove entry (before voting starts)
 */
async function deleteEntry(req, entryId) {
  const { user } = req;

  try {
    // Get current challenge
    const challenge = await challengeDB.getCurrent();

    if (!challenge) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'No active challenge'
        ))
      };
    }

    // Can only delete during entry phase
    if (challenge.status !== 'active') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'CANNOT_DELETE',
          'Cannot delete entry after submission phase has ended'
        ))
      };
    }

    // Get entry and verify ownership
    const entry = await entryDB.get(challenge.id, entryId);

    if (!entry) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Entry not found'
        ))
      };
    }

    if (entry.userId !== user.userId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'FORBIDDEN',
          'You can only delete your own entries'
        ))
      };
    }

    // Delete entry
    await entryDB.delete(challenge.id, entryId);

    // Remove XP (optional - could keep XP as participation reward)
    // const stats = await userDB.getStats(user.userId);
    // await userDB.updateStats(user.userId, {
    //   totalXP: Math.max(0, (stats.totalXP || 0) - ENTRY_XP)
    // });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        deletedEntryId: entryId,
        message: 'Entry deleted successfully'
      }))
    };
  } catch (error) {
    console.error('Delete entry error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to delete entry'
      ))
    };
  }
}

module.exports = withAuth(entryHandler, { required: true });
