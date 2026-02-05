/**
 * FashionTON Wardrobe - Consolidated Leaderboard API
 * Based on: leaderboard/index.js + user stats endpoint
 * 
 * Endpoints:
 * - GET /api/leaderboard/global - Global leaderboard
 * - GET /api/leaderboard/weekly - Weekly leaderboard
 * - GET /api/leaderboard/challenge/:id - Challenge leaderboard
 * - GET /api/leaderboard/user/:id - User stats/rank
 */

const crypto = require('crypto');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES
} = require('./_utils');
const { getKVClient, KEY_PATTERNS, userDB } = require('./_db');

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
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// ============ WEEKLY RESET ============

const WEEKLY_RESET_DAY = 1; // Monday

function shouldResetWeekly(lastResetTime) {
  const lastReset = new Date(lastResetTime);
  const now = new Date();
  
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() - WEEKLY_RESET_DAY + 7) % 7));
  lastMonday.setHours(0, 0, 0, 0);
  
  return lastReset < lastMonday;
}

function getNextWeeklyReset(lastResetTime) {
  const lastReset = new Date(lastResetTime);
  const nextReset = new Date(lastReset);
  nextReset.setDate(lastReset.getDate() + 7);
  nextReset.setHours(0, 0, 0, 0);
  return nextReset.getTime();
}

// ============ ENTRY DATABASE (for challenge leaderboard) ============

const entryDB = {
  async list(challengeId, sortBy = 'votes', limit = 100) {
    const kv = getKVClient();
    const listKey = KEY_PATTERNS.entryList(challengeId);
    
    let entryIds;
    if (sortBy === 'votes') {
      entryIds = await kv.zrange(listKey, 0, -1);
    } else {
      entryIds = await kv.zrange(listKey, 0, limit - 1, { rev: true });
    }

    const entries = [];
    for (const id of entryIds) {
      const entry = await kv.get(KEY_PATTERNS.entry(challengeId, id));
      if (entry) entries.push(entry);
    }

    if (sortBy === 'votes') {
      entries.sort((a, b) => b.votes - a.votes);
    }

    return entries.slice(0, limit);
  }
};

// ============ LEADERBOARD DATABASE ============

const leaderboardDB = {
  async getGlobal(limit = 100, offset = 0) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('global');
    
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

    const total = await kv.zcard(leaderboardKey);
    return { entries, total };
  },

  async getWeekly(limit = 100, offset = 0) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('weekly');
    
    const lastReset = await kv.get('leaderboard:weekly:lastReset');
    const now = Date.now();
    
    if (!lastReset || shouldResetWeekly(parseInt(lastReset))) {
      await kv.del(leaderboardKey);
      await kv.set('leaderboard:weekly:lastReset', now);
    }

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

    const total = await kv.zcard(leaderboardKey);
    return { entries, total };
  },

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
      isWinner: index < 10
    }));

    return { entries: ranked, total: ranked.length };
  },

  async getUserGlobalRank(userId) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('global');
    const rank = await kv.zrevrank(leaderboardKey, userId);
    return rank !== null ? rank + 1 : null;
  },

  async getUserWeeklyRank(userId) {
    const kv = getKVClient();
    const leaderboardKey = KEY_PATTERNS.leaderboard('weekly');
    const rank = await kv.zrevrank(leaderboardKey, userId);
    return rank !== null ? rank + 1 : null;
  }
};

// ============ HANDLERS ============

async function getGlobalLeaderboard(req) {
  const { user } = req;

  try {
    const { limit = '50', offset = '0' } = req.query || {};
    const parsedLimit = Math.min(parseInt(limit, 10), 100);
    const parsedOffset = parseInt(offset, 10);

    const { entries, total } = await leaderboardDB.getGlobal(parsedLimit, parsedOffset);

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

async function getWeeklyLeaderboard(req) {
  const { user } = req;

  try {
    const { limit = '50', offset = '0' } = req.query || {};
    const parsedLimit = Math.min(parseInt(limit, 10), 100);
    const parsedOffset = parseInt(offset, 10);

    const { entries, total } = await leaderboardDB.getWeekly(parsedLimit, parsedOffset);

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

async function getChallengeLeaderboard(req, challengeId) {
  const { user } = req;

  try {
    const { limit = '50' } = req.query || {};
    const parsedLimit = Math.min(parseInt(limit, 10), 100);

    const kv = getKVClient();
    const challenge = await kv.get(KEY_PATTERNS.challenge(challengeId));
    
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

// ============ USER STATS HANDLER (NEW) ============

async function getUserStats(req, targetUserId) {
  const { user } = req;

  try {
    const userId = targetUserId || user.userId;
    
    // Get user data
    const userData = await userDB.get(userId);
    if (!userData) {
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

    // Get user stats
    const stats = await userDB.getStats(userId);
    
    // Get rankings
    const globalRank = await leaderboardDB.getUserGlobalRank(userId);
    const weeklyRank = await leaderboardDB.getUserWeeklyRank(userId);
    
    // Get weekly XP
    const kv = getKVClient();
    const weeklyKey = KEY_PATTERNS.leaderboard('weekly');
    const weeklyXP = await kv.zscore(weeklyKey, userId);

    // Get check-in data
    const checkinData = await kv.get(`checkin:${userId}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        user: {
          userId: userData.userId,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatarUrl: userData.avatarUrl,
          isPremium: userData.isPremium,
          joinedAt: userData.createdAt
        },
        stats: {
          totalXP: stats.totalXP || 0,
          level: stats.level || 1,
          challengesWon: stats.challengesWon || 0,
          outfitsCreated: stats.outfitsCreated || 0,
          likesReceived: stats.likesReceived || 0,
          wardrobeCount: stats.wardrobeCount || 0
        },
        rankings: {
          global: globalRank,
          weekly: weeklyRank
        },
        weeklyXP: Math.round(weeklyXP || 0),
        checkin: {
          currentStreak: checkinData?.currentStreak || 0,
          longestStreak: checkinData?.longestStreak || 0,
          totalCheckins: checkinData?.totalCheckins || 0,
          lastCheckIn: checkinData?.lastCheckIn || null
        },
        isCurrentUser: userId === user.userId
      }))
    };
  } catch (error) {
    console.error('Get user stats error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve user stats'
      ))
    };
  }
}

// ============ MAIN HANDLER WITH ROUTING ============

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
        } else if (type === 'user') {
          // User stats endpoint - can get own stats or another user's by ID
          return await getUserStats(req, id);
        } else if (type === 'me') {
          // Shortcut to get current user's stats
          return await getUserStats(req, null);
        } else {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_INPUT,
              'Invalid leaderboard type. Use: global, weekly, challenge/:id, user/:id, or me'
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

module.exports = withAuth(leaderboardHandler, { required: true });
