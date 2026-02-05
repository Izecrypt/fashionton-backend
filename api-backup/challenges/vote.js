/**
 * FashionTON Wardrobe - Voting System API
 * POST /api/challenges/vote - Vote for an entry
 * GET /api/challenges/votes - Get user's votes for current challenge
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody
} = require('../_utils');
const { getKVClient } = require('../_db');
const { challengeDB, entryDB, voteDB } = require('./index');

// Rate limiting store (in production, use Redis/Vercel KV)
const voteRateLimits = new Map();
const VOTE_RATE_LIMIT = 1000; // 1 second between votes

/**
 * Vote handler
 */
async function voteHandler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await castVote(req);
      case 'GET':
        return await getUserVotes(req);
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
    console.error('Vote API Error:', error);
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
 * POST /api/challenges/vote - Vote for an entry
 */
async function castVote(req) {
  const { user } = req;

  try {
    // Rate limiting check
    const rateLimitKey = `vote:${user.userId}`;
    const lastVoteTime = voteRateLimits.get(rateLimitKey);
    const now = Date.now();

    if (lastVoteTime && (now - lastVoteTime) < VOTE_RATE_LIMIT) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': Math.ceil((VOTE_RATE_LIMIT - (now - lastVoteTime)) / 1000)
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.RATE_LIMITED,
          'Please wait before voting again',
          { retryAfter: Math.ceil((VOTE_RATE_LIMIT - (now - lastVoteTime)) / 1000) }
        ))
      };
    }

    const body = await parseRequestBody(req);
    const { entryId } = body;

    if (!entryId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Entry ID is required'
        ))
      };
    }

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

    // Check challenge is in voting phase
    if (challenge.status !== 'voting') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          `Voting is not open yet (current status: ${challenge.status})`
        ))
      };
    }

    // Check if user has already voted in this challenge
    const existingVote = await voteDB.getUserVote(user.userId, challenge.id);
    if (existingVote) {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'ALREADY_VOTED',
          'You have already voted in this challenge',
          { votedFor: existingVote.entryId }
        ))
      };
    }

    // Get the entry
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

    // Prevent self-voting
    if (entry.userId === user.userId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'SELF_VOTE_NOT_ALLOWED',
          'You cannot vote for your own entry'
        ))
      };
    }

    // Add vote to entry
    const updatedEntry = await entryDB.addVote(challenge.id, entryId, user.userId);

    if (updatedEntry.error === 'ALREADY_VOTED') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'ALREADY_VOTED',
          'You have already voted for this entry'
        ))
      };
    }

    // Record the vote
    const vote = await voteDB.create({
      userId: user.userId,
      challengeId: challenge.id,
      entryId
    });

    // Update rate limit
    voteRateLimits.set(rateLimitKey, now);

    // Clean up old rate limit entries (older than 1 minute)
    for (const [key, time] of voteRateLimits.entries()) {
      if (now - time > 60000) {
        voteRateLimits.delete(key);
      }
    }

    // Update challenge vote count
    const kv = getKVClient();
    challenge.voteCount = (challenge.voteCount || 0) + 1;
    await kv.set(KEY_PATTERNS.challenge(challenge.id), challenge);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        vote,
        entry: {
          id: updatedEntry.id,
          votes: updatedEntry.votes
        },
        message: 'Vote cast successfully!'
      }))
    };
  } catch (error) {
    console.error('Cast vote error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to cast vote'
      ))
    };
  }
}

/**
 * GET /api/challenges/votes - Get user's votes for current challenge
 */
async function getUserVotes(req) {
  const { user } = req;

  try {
    // Get current challenge
    const challenge = await challengeDB.getCurrent();

    if (!challenge) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(successResponse({
          hasVoted: false,
          message: 'No active challenge'
        }))
      };
    }

    // Get user's vote
    const vote = await voteDB.getUserVote(user.userId, challenge.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        challengeId: challenge.id,
        hasVoted: !!vote,
        vote: vote ? {
          entryId: vote.entryId,
          timestamp: vote.timestamp
        } : null
      }))
    };
  } catch (error) {
    console.error('Get user votes error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve vote information'
      ))
    };
  }
}

module.exports = withAuth(voteHandler, { required: true });
