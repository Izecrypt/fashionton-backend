/**
 * FashionTON Wardrobe - Leaderboard API
 * GET /api/leaderboard/global - Top users by total XP
 * GET /api/leaderboard/weekly - Top users this week
 * GET /api/leaderboard/challenge/:id - Challenge-specific leaderboard
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES
} = require('../_utils');
const { getKVClient, KEY_PATTERNS, userDB } = require('../_db');
const { challengeDB, entryDB } = require('../challenges/index');

// Weekly leaderboard reset day (0 = Sunday, 1 = Monday)
const WEEKLY_RESET_DAY = 1; // Monday

/**
 * Leaderboard Database Operations
 */
const leaderboardDB = {
  /**
   * Get global leaderboard (sorted by total XP)
   */
  async getGlobal(limit = 100, offset = 0) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('global');
    
    // Get user IDs from sorted set (by XP)
    const userIds = await kv.zrange(leaderboardKey, offset, offset + limit - 1, { rev: true });
    
    const entries = [];
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const user = await userDB.get(userId);
      const stats = await userDB.getStats(userId);
      
      if (user) {
        entries.push({
          userId,
          username: user.username || user.firstName,
          avatarUrl: user.avatarUrl || null,
          totalXP: stats.totalXP || 0,
          level: stats.level || 1,
          challengesWon: stats.challengesWon || 0,
          rank: offset + i + 1
        });
      }
    }

    // Get total count
    const total = await kv.zcard(leaderboardKey);

    return { entries, total };
  },

  /**
   * Get weekly leaderboard
   */
  async getWeekly(limit = 100, offset = 0) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('weekly');
    
    // Check if we need to reset (new week)
    const lastReset = await kv.get('leaderboard:weekly:lastReset');
    const now = Date.now();
    
    if (!lastReset || shouldResetWeekly(parseInt(lastReset))) {
      // Reset weekly leaderboard
      await kv.del(leaderboardKey);
      await kv.set('leaderboard:weekly:lastReset', now);
    }

    // Get user IDs from sorted set (by weekly XP)
    const userIds = await kv.zrange(leaderboardKey, offset, offset + limit - 1, { rev: true });
    
    const entries = [];
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const user = await userDB.get(userId);
      const weeklyXP = await kv.zscore(leaderboardKey, userId);
      
      if (user) {
        entries.push({
          userId,
          username: user.username || user.firstName,
          avatarUrl: user.avatarUrl || null,
          weeklyXP: Math.round(weeklyXP || 0),
          rank: offset + i + 1
        });
      }
    }

    // Get total count
    const total = await kv.zcard(leaderboardKey);

    return { entries, total };
  },

  /**
   * Get challenge leaderboard
   */
  async getChallenge(challengeId, limit = 100) {
    const entries = await entryDB.list(challengeId, 'votes', limit);
    
    const ranked = entries.map((entry, index) => ({
      entryId: entry.id,
      userId: entry.userId,
      username: entry.username,
      photoUrl: entry.photoUrl,
      votes: entry.votes,
      rank: index + 1,
      prizeWon: entry.prizeWon,
      isWinner: index < 10 // Top 10 are considered winners
    }));

    return { entries: ranked, total: ranked.length };
  },

  /**
   * Update user's XP on global leaderboard
   */
  async updateGlobalXP(userId, totalXP) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('global');
    await kv.zadd(leaderboardKey, { score: totalXP, member: userId });
  },

  /**
   * Add weekly XP for user
   */
  async addWeeklyXP(userId, xpAmount) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('weekly');
    await kv.zincrby(leaderboardKey, xpAmount, userId);
  },

  /**
   * Get user's global rank
   */
  async getUserGlobalRank(userId) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('global');
    const rank = await kv.zrevrank(leaderboardKey, userId);
    return rank !== null ? rank + 1 : null;
  },

  /**
   * Get user's weekly rank
   */
  async getUserWeeklyRank(userId) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('weekly');
    const rank = await kv.zrevrank(leaderboardKey, userId);
    return rank !== null ? rank + 1 : null;
  }
};

/**
 * Check if weekly leaderboard should reset
 */
function shouldResetWeekly(lastResetTime) {
  const lastReset = new Date(lastResetTime);
  const now = new Date();
  
  // Find the most recent Monday
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() - WEEKLY_RESET_DAY + 7) % 7));
  lastMonday.setHours(0, 0, 0, 0);
  
  return lastReset < lastMonday;
}

/**
 * Leaderboard handler
 */
async function leaderboardHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Parse path
  const pathMatch = url.match(/\/api\/leaderboard\/([^\/\?]+)(?:\/([^\/\?]+))?/);
  const type = pathMatch ? pathMatch[1] : null;
  const id = pathMatch ? pathMatch[2] : null;

  try {
    switch (method) {
      case 'GET':
        if (type === 'global') {
          return await getGlobalLeaderboard(req);
        } else if (type === 'weekly') {
          return await getWeeklyLeaderboard(req);
        } else if (type === 'challenge' && id) {
          return await getChallengeLeaderboard(req, id);
        } else {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_INPUT,
              'Invalid leaderboard type. Use: global, weekly, or challenge/:id'
            ))
          };
        }
      case 'OPTIONS':
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
    console.error('Leaderboard API Error:', error);
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
 * GET /api/leaderboard/global - Top users by total XP
 */
async function getGlobalLeaderboard(req) {
  const { user } = req;

  try {
    const { limit = '50', offset = '0' } = req.query || {};
    const parsedLimit = Math.min(parseInt(limit, 10), 100);
    const parsedOffset = parseInt(offset, 10);

    const { entries, total } = await leaderboardDB.getGlobal(parsedLimit, parsedOffset);

    // Get user's rank if not in the returned entries
    let userRank = null;
    const userInList = entries.find(e => e.userId === user.userId);
    
    if (!userInList) {
      userRank = await leaderboardDB.getUserGlobalRank(user.userId);
      const userData = await userDB.get(user.userId);
      const userStats = await userDB.getStats(user.userId);
      
      if (userData && userRank) {
        entries.push({
          userId: user.userId,
          username: userData.username || userData.firstName,
          avatarUrl: userData.avatarUrl || null,
          totalXP: userStats.totalXP || 0,
          level: userStats.level || 1,
          challengesWon: userStats.challengesWon || 0,
          rank: userRank,
          isCurrentUser: true
        });
      }
    } else {
      userInList.isCurrentUser = true;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        leaderboard: entries,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: total > parsedOffset + parsedLimit
        },
        userRank: userRank || (userInList ? userInList.rank : null)
      }))
    };
  } catch (error) {
    console.error('Get global leaderboard error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve global leaderboard'
      ))
    };
  }
}

/**
 * GET /api/leaderboard/weekly - Top users this week
 */
async function getWeeklyLeaderboard(req) {
  const { user } = req;

  try {
    const { limit = '50', offset = '0' } = req.query || {};
    const parsedLimit = Math.min(parseInt(limit, 10), 100);
    const parsedOffset = parseInt(offset, 10);

    const { entries, total } = await leaderboardDB.getWeekly(parsedLimit, parsedOffset);

    // Get user's rank if not in the returned entries
    let userRank = null;
    const userInList = entries.find(e => e.userId === user.userId);
    
    if (!userInList) {
      userRank = await leaderboardDB.getUserWeeklyRank(user.userId);
      const userData = await userDB.get(user.userId);
      const kv = getKVClient();
      const leaderboardKey = KEY_PATTERNS.leaderboard('weekly');
      const userWeeklyXP = await kv.zscore(leaderboardKey, user.userId);
      
      if (userData && userRank) {
        entries.push({
          userId: user.userId,
          username: userData.username || userData.firstName,
          avatarUrl: userData.avatarUrl || null,
          weeklyXP: Math.round(userWeeklyXP || 0),
          rank: userRank,
          isCurrentUser: true
        });
      }
    } else {
      userInList.isCurrentUser = true;
    }

    // Get time until reset
    const kv = getKVClient();
    const lastReset = await kv.get('leaderboard:weekly:lastReset');
    const nextReset = getNextWeeklyReset(lastReset ? parseInt(lastReset) : Date.now());

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        leaderboard: entries,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: total > parsedOffset + parsedLimit
        },
        userRank: userRank || (userInList ? userInList.rank : null),
        nextReset,
        timeRemaining: nextReset - Date.now()
      }))
    };
  } catch (error) {
    console.error('Get weekly leaderboard error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve weekly leaderboard'
      ))
    };
  }
}

/**
 * GET /api/leaderboard/challenge/:id - Challenge-specific leaderboard
 */
async function getChallengeLeaderboard(req, challengeId) {
  const { user } = req;

  try {
    const { limit = '50' } = req.query || {};
    const parsedLimit = Math.min(parseInt(limit, 10), 100);

    // Verify challenge exists
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

    const { entries, total } = await leaderboardDB.getChallenge(challengeId, parsedLimit);

    // Mark user's entry
    const userEntry = entries.find(e => e.userId === user.userId);
    if (userEntry) {
      userEntry.isCurrentUser = true;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        challengeId,
        theme: challenge.theme,
        status: challenge.status,
        prizePool: challenge.prizePool,
        leaderboard: entries,
        userEntry: userEntry ? {
          rank: userEntry.rank,
          votes: userEntry.votes,
          prizeWon: userEntry.prizeWon
        } : null,
        totalEntries: total
      }))
    };
  } catch (error) {
    console.error('Get challenge leaderboard error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve challenge leaderboard'
      ))
    };
  }
}

/**
 * Get next weekly reset time
 */
function getNextWeeklyReset(lastResetTime) {
  const lastReset = new Date(lastResetTime);
  const nextReset = new Date(lastReset);
  nextReset.setDate(lastReset.getDate() + 7);
  nextReset.setHours(0, 0, 0, 0);
  return nextReset.getTime();
}

// Export handler and database operations
module.exports = withAuth(leaderboardHandler, { required: true });
module.exports.leaderboardDB = leaderboardDB;
