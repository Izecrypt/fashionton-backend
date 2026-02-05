/**
 * FashionTON Wardrobe - Challenge Management API
 * GET /api/challenges/current - Get today's active challenge
 * GET /api/challenges/:id - Get specific challenge details
 * POST /api/challenges - Create new challenge (Admin)
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
const { getKVClient, KEY_PATTERNS, userDB } = require('../_db');

// Challenge constants
const CHALLENGE_DURATION = 86400000; // 24 hours in ms
const VOTING_DURATION = 86400000; // 24 hours in ms
const DEFAULT_PRIZE_POOL = 50000000000n; // 50 TON in nanoton

// Admin user IDs (should be in env vars for production)
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [];

/**
 * Challenge Database Operations
 */
const challengeDB = {
  /**
   * Create new challenge
   */
  async create(challengeData) {
    const kv = getKVClient();
    const challengeId = generateId('challenge');
    const key = KEY_PATTERNS.challenge(challengeId);
    const listKey = 'challenges:list';

    const now = Date.now();
    const challenge = {
      id: challengeId,
      theme: challengeData.theme,
      description: challengeData.description,
      prizePool: challengeData.prizePool || DEFAULT_PRIZE_POOL.toString(),
      startTime: challengeData.startTime || now,
      endTime: challengeData.endTime || (now + CHALLENGE_DURATION),
      votingEndTime: challengeData.votingEndTime || (now + CHALLENGE_DURATION + VOTING_DURATION),
      status: 'active',
      entryCount: 0,
      voteCount: 0,
      createdAt: now,
      createdBy: challengeData.createdBy
    };

    await kv.set(key, challenge);
    await kv.zadd(listKey, { score: challenge.startTime, member: challengeId });
    
    // Set as current challenge
    await kv.set('challenge:current', challengeId);

    return challenge;
  },

  /**
   * Get challenge by ID
   */
  async get(challengeId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.challenge(challengeId));
  },

  /**
   * Get current active challenge
   */
  async getCurrent() {
    const kv = getKVClient();
    const currentId = await kv.get('challenge:current');
    if (!currentId) return null;
    
    const challenge = await this.get(currentId);
    if (!challenge) return null;

    // Auto-update status based on time
    const now = Date.now();
    let statusChanged = false;

    if (challenge.status === 'active' && now >= challenge.endTime) {
      challenge.status = 'voting';
      statusChanged = true;
    } else if (challenge.status === 'voting' && now >= challenge.votingEndTime) {
      challenge.status = 'completed';
      statusChanged = true;
    }

    if (statusChanged) {
      await kv.set(KEY_PATTERNS.challenge(currentId), challenge);
    }

    return challenge;
  },

  /**
   * Update challenge
   */
  async update(challengeId, updates) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.challenge(challengeId);
    
    const existing = await kv.get(key);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    await kv.set(key, updated);
    return updated;
  },

  /**
   * List recent challenges
   */
  async list(limit = 10) {
    const kv = getKVClient();
    const listKey = 'challenges:list';
    
    const challengeIds = await kv.zrange(listKey, 0, limit - 1, { rev: true });
    
    const challenges = [];
    for (const id of challengeIds) {
      const challenge = await this.get(id);
      if (challenge) {
        challenges.push(challenge);
      }
    }

    return challenges;
  }
};

/**
 * Entry Database Operations
 */
const entryDB = {
  /**
   * Create entry
   */
  async create(challengeId, entryData) {
    const kv = getKVClient();
    const entryId = generateId('entry');
    const key = KEY_PATTERNS.entry(challengeId, entryId);
    const listKey = KEY_PATTERNS.entryList(challengeId);
    const userEntryKey = `entry:user:${entryData.userId}:${challengeId}`;

    const entry = {
      id: entryId,
      challengeId,
      userId: entryData.userId,
      username: entryData.username,
      photoUrl: entryData.photoUrl,
      outfitId: entryData.outfitId || null,
      votes: 0,
      voters: [],
      rank: null,
      prizeWon: null,
      createdAt: Date.now()
    };

    await kv.set(key, entry);
    await kv.zadd(listKey, { score: entry.createdAt, member: entryId });
    
    // Track user's entry for this challenge
    await kv.set(userEntryKey, entryId);

    // Update entry count
    const challenge = await challengeDB.get(challengeId);
    if (challenge) {
      challenge.entryCount = (await kv.zcard(listKey)) || 0;
      await kv.set(KEY_PATTERNS.challenge(challengeId), challenge);
    }

    return entry;
  },

  /**
   * Get entry by ID
   */
  async get(challengeId, entryId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.entry(challengeId, entryId));
  },

  /**
   * Get user's entry for a challenge
   */
  async getUserEntry(userId, challengeId) {
    const kv = getKVClient();
    const userEntryKey = `entry:user:${userId}:${challengeId}`;
    const entryId = await kv.get(userEntryKey);
    
    if (!entryId) return null;
    return await this.get(challengeId, entryId);
  },

  /**
   * List entries for challenge
   */
  async list(challengeId, sortBy = 'votes', limit = 100) {
    const kv = getKVClient();
    const listKey = KEY_PATTERNS.entryList(challengeId);
    
    let entryIds;
    if (sortBy === 'votes') {
      // Get all entries and sort by votes manually
      entryIds = await kv.zrange(listKey, 0, -1);
    } else {
      entryIds = await kv.zrange(listKey, 0, limit - 1, { rev: true });
    }

    const entries = [];
    for (const id of entryIds) {
      const entry = await this.get(challengeId, id);
      if (entry) {
        entries.push(entry);
      }
    }

    // Sort by votes if requested
    if (sortBy === 'votes') {
      entries.sort((a, b) => b.votes - a.votes);
    }

    return entries.slice(0, limit);
  },

  /**
   * Update entry votes
   */
  async addVote(challengeId, entryId, userId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.entry(challengeId, entryId);
    
    const entry = await kv.get(key);
    if (!entry) return null;

    // Check if user already voted for this entry
    if (entry.voters.includes(userId)) {
      return { error: 'ALREADY_VOTED' };
    }

    entry.voters.push(userId);
    entry.votes = entry.voters.length;

    await kv.set(key, entry);
    return entry;
  },

  /**
   * Delete entry
   */
  async delete(challengeId, entryId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.entry(challengeId, entryId);
    const listKey = KEY_PATTERNS.entryList(challengeId);
    
    const entry = await kv.get(key);
    if (!entry) return false;

    // Remove user's entry tracking
    const userEntryKey = `entry:user:${entry.userId}:${challengeId}`;
    await kv.del(userEntryKey);

    await kv.del(key);
    await kv.zrem(listKey, entryId);

    // Update entry count
    const challenge = await challengeDB.get(challengeId);
    if (challenge) {
      challenge.entryCount = (await kv.zcard(listKey)) || 0;
      await kv.set(KEY_PATTERNS.challenge(challengeId), challenge);
    }

    return true;
  },

  /**
   * Update entry rank and prize
   */
  async updateRank(challengeId, entryId, rank, prizeWon) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.entry(challengeId, entryId);
    
    const entry = await kv.get(key);
    if (!entry) return null;

    entry.rank = rank;
    entry.prizeWon = prizeWon;
    entry.updatedAt = Date.now();

    await kv.set(key, entry);
    return entry;
  }
};

/**
 * Vote Database Operations
 */
const voteDB = {
  /**
   * Record a vote
   */
  async create(voteData) {
    const kv = getKVClient();
    const voteId = `vote:${voteData.userId}:${voteData.challengeId}`;
    
    const vote = {
      userId: voteData.userId,
      challengeId: voteData.challengeId,
      entryId: voteData.entryId,
      timestamp: Date.now()
    };

    await kv.set(voteId, vote);
    return vote;
  },

  /**
   * Get user's vote for a challenge
   */
  async getUserVote(userId, challengeId) {
    const kv = getKVClient();
    const voteId = `vote:${userId}:${challengeId}`;
    return await kv.get(voteId);
  },

  /**
   * Check if user has voted in challenge
   */
  async hasVoted(userId, challengeId) {
    const vote = await this.getUserVote(userId, challengeId);
    return vote !== null;
  }
};

/**
 * Main challenge handler
 */
async function challengeHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Parse path
  const pathMatch = url.match(/\/api\/challenges\/([^\/\?]+)/);
  const pathId = pathMatch ? pathMatch[1] : null;

  try {
    switch (method) {
      case 'GET':
        if (pathId === 'current') {
          return await getCurrentChallenge(req);
        } else if (pathId) {
          return await getChallengeById(req, pathId);
        } else {
          return await listChallenges(req);
        }
      case 'POST':
        return await createChallenge(req);
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
    console.error('Challenge API Error:', error);
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
 * GET /api/challenges/current - Get today's active challenge
 */
async function getCurrentChallenge(req) {
  const { user } = req;

  try {
    const challenge = await challengeDB.getCurrent();

    if (!challenge) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(successResponse({
          active: false,
          message: 'No active challenge at this time'
        }))
      };
    }

    // Calculate time remaining
    const now = Date.now();
    let timeRemaining = 0;
    let phase = 'entry';

    if (challenge.status === 'active') {
      timeRemaining = challenge.endTime - now;
      phase = 'entry';
    } else if (challenge.status === 'voting') {
      timeRemaining = challenge.votingEndTime - now;
      phase = 'voting';
    }

    // Get user's entry status
    const userEntry = await entryDB.getUserEntry(user.userId, challenge.id);
    const userVote = await voteDB.getUserVote(user.userId, challenge.id);

    // Get entries if in voting phase or completed
    let entries = [];
    let hasVoted = false;
    
    if (challenge.status === 'voting' || challenge.status === 'completed') {
      entries = await entryDB.list(challenge.id, 'votes', 100);
      hasVoted = await voteDB.hasVoted(user.userId, challenge.id);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        id: challenge.id,
        theme: challenge.theme,
        description: challenge.description,
        prizePool: challenge.prizePool,
        status: challenge.status,
        phase,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        votingEndTime: challenge.votingEndTime,
        timeRemaining: Math.max(0, timeRemaining),
        entryCount: challenge.entryCount,
        userEntry: userEntry ? {
          id: userEntry.id,
          photoUrl: userEntry.photoUrl,
          votes: userEntry.votes,
          rank: userEntry.rank
        } : null,
        hasSubmitted: !!userEntry,
        hasVoted,
        votedFor: userVote ? userVote.entryId : null,
        entries: entries.map(e => ({
          id: e.id,
          userId: e.userId,
          username: e.username,
          photoUrl: e.photoUrl,
          votes: e.votes,
          rank: e.rank,
          isOwnEntry: e.userId === user.userId
        }))
      }))
    };
  } catch (error) {
    console.error('Get current challenge error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve current challenge'
      ))
    };
  }
}

/**
 * GET /api/challenges/:id - Get specific challenge details
 */
async function getChallengeById(req, challengeId) {
  const { user } = req;

  try {
    const challenge = await challengeDB.get(challengeId);

    if (!challenge) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Challenge not found'
        ))
      };
    }

    // Get all entries sorted by votes
    const entries = await entryDB.list(challengeId, 'votes', 100);
    const userVote = await voteDB.getUserVote(user.userId, challengeId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        id: challenge.id,
        theme: challenge.theme,
        description: challenge.description,
        prizePool: challenge.prizePool,
        status: challenge.status,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        votingEndTime: challenge.votingEndTime,
        entryCount: challenge.entryCount,
        entries: entries.map(e => ({
          id: e.id,
          userId: e.userId,
          username: e.username,
          photoUrl: e.photoUrl,
          votes: e.votes,
          rank: e.rank,
          prizeWon: e.prizeWon,
          isOwnEntry: e.userId === user.userId,
          isVotedFor: userVote && userVote.entryId === e.id
        })),
        userVote: userVote ? {
          entryId: userVote.entryId,
          timestamp: userVote.timestamp
        } : null
      }))
    };
  } catch (error) {
    console.error('Get challenge error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve challenge'
      ))
    };
  }
}

/**
 * GET /api/challenges - List recent challenges
 */
async function listChallenges(req) {
  try {
    const { limit = '10' } = req.query || {};
    const challenges = await challengeDB.list(parseInt(limit, 10));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(challenges.map(c => ({
        id: c.id,
        theme: c.theme,
        description: c.description,
        prizePool: c.prizePool,
        status: c.status,
        startTime: c.startTime,
        endTime: c.endTime,
        entryCount: c.entryCount
      }))))
    };
  } catch (error) {
    console.error('List challenges error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to list challenges'
      ))
    };
  }
}

/**
 * POST /api/challenges - Create new challenge (Admin only)
 */
async function createChallenge(req) {
  const { user } = req;

  try {
    // Check admin access
    if (!isAdmin(user.userId)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'FORBIDDEN',
          'Admin access required'
        ))
      };
    }

    const body = await parseRequestBody(req);

    // Validate required fields
    const themeValidation = validators.string(body.theme, 'Theme', { minLength: 3, maxLength: 100 });
    if (!themeValidation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          themeValidation.error
        ))
      };
    }

    const descValidation = validators.string(body.description, 'Description', { 
      minLength: 10, 
      maxLength: 500 
    });
    if (!descValidation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          descValidation.error
        ))
      };
    }

    // Create challenge
    const challengeData = {
      theme: themeValidation.value,
      description: descValidation.value,
      prizePool: body.prizePool ? BigInt(body.prizePool).toString() : DEFAULT_PRIZE_POOL.toString(),
      startTime: body.startTime || Date.now(),
      endTime: body.endTime || (Date.now() + (body.duration || CHALLENGE_DURATION)),
      createdBy: user.userId
    };

    const challenge = await challengeDB.create(challengeData);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(challenge, {
        message: 'Challenge created successfully'
      }))
    };
  } catch (error) {
    console.error('Create challenge error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to create challenge'
      ))
    };
  }
}

/**
 * Check if user is admin
 */
function isAdmin(userId) {
  return ADMIN_USER_IDS.includes(userId);
}

// Export handler and database operations
module.exports = withAuth(challengeHandler, { required: true });
module.exports.challengeDB = challengeDB;
module.exports.entryDB = entryDB;
module.exports.voteDB = voteDB;
