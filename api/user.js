/**
 * FashionTON Wardrobe - Consolidated User API
 * Combines: user/index.js + _auth.js + checkin/index.js + xp/index.js
 * 
 * Endpoints:
 * - GET/POST/DELETE /api/user - User CRUD
 * - GET/POST /api/user/checkin - Daily check-in with streaks
 * - GET/POST /api/user/xp - XP/leveling system
 */

const crypto = require('crypto');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody,
  checkRateLimit,
  generateId
} = require('./_utils');
const { getKVClient, KEY_PATTERNS, userDB } = require('./_db');

// ============ AUTHENTICATION (from _auth.js) ============

/**
 * Verify Telegram WebApp initData
 */
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

// ============ USER HANDLERS (from user/index.js) ============

async function getUserProfile(req) {
  const { user } = req;
  const { includeStats = 'true' } = req.query || {};

  try {
    const userData = await userDB.get(user.userId);
    
    if (!userData) {
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

    if (includeStats === 'true') {
      const stats = await userDB.getStats(user.userId);
      const { wardrobeDB } = require('./_db');
      const categoryCounts = await wardrobeDB.getCategoryCounts(user.userId);
      
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

async function createOrUpdateUser(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);
    
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

    const existingUser = await userDB.get(user.userId);
    const isNewUser = !existingUser;

    if (isNewUser) {
      userData.createdAt = Date.now();
    }

    const savedUser = await userDB.upsert(userData);

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

async function deleteUserAccount(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);
    
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

    const { wardrobeDB, outfitDB } = require('./_db');
    const wardrobeData = await wardrobeDB.list(user.userId);
    const outfits = await outfitDB.list(user.userId);

    for (const item of wardrobeData.items) {
      await wardrobeDB.delete(user.userId, item.id);
    }

    for (const outfit of outfits) {
      await outfitDB.delete(user.userId, outfit.id);
    }

    const kv = getKVClient();
    await kv.del(`checkin:${user.userId}`);
    await kv.del(`xp:history:${user.userId}`);
    
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

// ============ CHECK-IN HANDLERS (from checkin/index.js) ============

const CHECKIN_XP = 50;
const STREAK_BONUS_XP = 10;
const MAX_STREAK_BONUS = 50;

async function getCheckinStatus(req) {
  const { user } = req;

  try {
    const kv = getKVClient();
    const checkinKey = `checkin:${user.userId}`;
    
    const checkinData = await kv.get(checkinKey) || {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      totalCheckins: 0,
      history: []
    };

    const today = getTodayDate();
    const canCheckInToday = checkinData.lastCheckIn !== today;
    const nextReward = calculateNextReward(checkinData.currentStreak);
    const recentHistory = checkinData.history.slice(-30).reverse();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        currentStreak: checkinData.currentStreak,
        longestStreak: checkinData.longestStreak,
        lastCheckIn: checkinData.lastCheckIn,
        totalCheckins: checkinData.totalCheckins,
        canCheckInToday,
        today,
        nextReward,
        recentHistory,
        streakAtRisk: isStreakAtRisk(checkinData.lastCheckIn)
      }, {
        message: canCheckInToday ? 'You can check in today!' : 'Already checked in today. Come back tomorrow!'
      }))
    };
  } catch (error) {
    console.error('Get check-in status error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve check-in status'
      ))
    };
  }
}

async function recordCheckin(req) {
  const { user } = req;

  const rateLimit = checkRateLimit(`checkin:${user.userId}`, 5, 60000);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.RATE_LIMITED,
        'Too many check-in attempts. Please try again later.'
      ))
    };
  }

  try {
    const kv = getKVClient();
    const checkinKey = `checkin:${user.userId}`;
    const today = getTodayDate();
    const now = Date.now();

    let checkinData = await kv.get(checkinKey) || {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      totalCheckins: 0,
      history: []
    };

    if (checkinData.lastCheckIn === today) {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'ALREADY_CHECKED_IN',
          'You have already checked in today. Come back tomorrow!',
          {
            lastCheckIn: checkinData.lastCheckIn,
            currentStreak: checkinData.currentStreak,
            nextCheckIn: getTomorrowDate()
          }
        ))
      };
    }

    let newStreak = 1;
    if (checkinData.lastCheckIn) {
      const lastCheckDate = new Date(checkinData.lastCheckIn);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastCheckDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = checkinData.currentStreak + 1;
      } else if (diffDays < 1) {
        return {
          statusCode: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            'ALREADY_CHECKED_IN',
            'You have already checked in today.'
          ))
        };
      }
    }

    const streakBonus = Math.min((newStreak - 1) * STREAK_BONUS_XP, MAX_STREAK_BONUS);
    const totalXP = CHECKIN_XP + streakBonus;

    const updatedCheckinData = {
      currentStreak: newStreak,
      longestStreak: Math.max(checkinData.longestStreak, newStreak),
      lastCheckIn: today,
      totalCheckins: checkinData.totalCheckins + 1,
      history: [
        ...checkinData.history,
        {
          date: today,
          streak: newStreak,
          xpAwarded: totalXP,
          timestamp: now
        }
      ].slice(-90)
    };

    await kv.set(checkinKey, updatedCheckinData);

    const userStats = await userDB.getStats(user.userId);
    const newTotalXP = (userStats.totalXP || 0) + totalXP;
    const newLevel = calculateLevelFromXP(newTotalXP);

    await userDB.updateStats(user.userId, {
      totalXP: newTotalXP,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak: updatedCheckinData.longestStreak,
      lastCheckIn: today
    });

    const response = {
      success: true,
      data: {
        checkIn: {
          date: today,
          streak: newStreak,
          xpAwarded: totalXP,
          breakdown: {
            base: CHECKIN_XP,
            streakBonus: streakBonus
          }
        },
        stats: {
          currentStreak: newStreak,
          longestStreak: updatedCheckinData.longestStreak,
          totalCheckins: updatedCheckinData.totalCheckins,
          totalXP: newTotalXP,
          level: newLevel,
          leveledUp: newLevel > (userStats.level || 1)
        },
        nextReward: calculateNextReward(newStreak),
        message: generateCheckinMessage(newStreak, newLevel > (userStats.level || 1))
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Record check-in error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to record check-in'
      ))
    };
  }
}

function calculateNextReward(currentStreak) {
  const milestones = [
    { days: 7, reward: '7-Day Streak Badge', xp: 100 },
    { days: 14, reward: '2-Week Streak Badge', xp: 250 },
    { days: 30, reward: 'Monthly Streak Badge', xp: 500 },
    { days: 60, reward: '2-Month Streak Badge', xp: 1000 },
    { days: 100, reward: 'Centurion Badge', xp: 2000 },
    { days: 365, reward: 'Year Streak Badge', xp: 10000 }
  ];

  for (const milestone of milestones) {
    if (currentStreak < milestone.days) {
      return {
        type: 'streak_milestone',
        daysRequired: milestone.days,
        reward: milestone.reward,
        xpBonus: milestone.xp,
        daysRemaining: milestone.days - currentStreak
      };
    }
  }

  return {
    type: 'maintenance',
    message: 'Incredible! You\'ve achieved all streak milestones. Keep it up!',
    currentStreak
  };
}

function isStreakAtRisk(lastCheckIn) {
  if (!lastCheckIn) return false;
  const lastDate = new Date(lastCheckIn);
  const now = new Date();
  const diffHours = (now - lastDate) / (1000 * 60 * 60);
  return diffHours > 24 && diffHours < 48;
}

function generateCheckinMessage(streak, leveledUp) {
  if (leveledUp) return '🎉 Level up! Keep the momentum going!';
  if (streak === 1) return 'Welcome back! Start your streak today! 🔥';
  if (streak === 7) return '🔥 One week streak! You\'re on fire!';
  if (streak === 30) return '🌟 Monthly milestone! Amazing dedication!';
  if (streak === 100) return '💯 Incredible! 100 days strong!';
  if (streak === 365) return '👑 LEGENDARY! A full year of consistency!';
  if (streak % 10 === 0) return `🔥 ${streak} day streak! Keep it up!`;
  if (streak > 30) return `✨ ${streak} days and counting! You're unstoppable!`;
  return `🔥 ${streak} day streak! Keep going!`;
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function calculateLevelFromXP(totalXP) {
  const levels = [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 250 },
    { level: 4, xp: 500 },
    { level: 5, xp: 1000 },
    { level: 6, xp: 2000 },
    { level: 7, xp: 3500 },
    { level: 8, xp: 5500 },
    { level: 9, xp: 8000 },
    { level: 10, xp: 11000 }
  ];

  let level = 1;
  for (const lvl of levels) {
    if (totalXP >= lvl.xp) {
      level = lvl.level;
    } else {
      break;
    }
  }
  return level;
}

// ============ XP HANDLERS (from xp/index.js) ============

const XP_REWARDS = {
  CHECKIN: { xp: 50, name: 'Daily Check-in', cooldown: 0 },
  UPLOAD_ITEM: { xp: 25, name: 'Upload Wardrobe Item', cooldown: 0 },
  CREATE_OUTFIT: { xp: 50, name: 'Create Outfit', cooldown: 60 * 1000 },
  WIN_CHALLENGE: { xp: 100, name: 'Win Challenge', cooldown: 0 },
  SHARE_OUTFIT: { xp: 25, name: 'Share Outfit', cooldown: 5 * 60 * 1000 },
  COMPLETE_PROFILE: { xp: 100, name: 'Complete Profile', cooldown: 0, once: true },
  LIKE_OUTFIT: { xp: 5, name: 'Like Outfit', cooldown: 1000, dailyLimit: 50 },
  STREAK_BONUS: { xp: 0, name: 'Streak Bonus', cooldown: 0 }
};

const LEVELS = [
  { level: 1, xp: 0, title: 'Fashion Newbie', perks: ['Starter wardrobe'] },
  { level: 2, xp: 100, title: 'Style Explorer', perks: ['+5 wardrobe slots'] },
  { level: 3, xp: 250, title: 'Trendsetter', perks: ['Title: Stylist'] },
  { level: 4, xp: 500, title: 'Wardrobe Wizard', perks: ['+10 wardrobe slots'] },
  { level: 5, xp: 1000, title: 'Fashionista', perks: ['Title: Fashionista', 'Early access to challenges'] },
  { level: 6, xp: 2000, title: 'Style Icon', perks: ['+15 wardrobe slots', 'Custom profile badge'] },
  { level: 7, xp: 3500, title: 'Trend Forecaster', perks: ['Priority voting in challenges'] },
  { level: 8, xp: 5500, title: 'Fashion Guru', perks: ['+20 wardrobe slots', 'Exclusive frames'] },
  { level: 9, xp: 8000, title: 'Style Master', perks: ['VIP challenge entries'] },
  { level: 10, xp: 11000, title: 'Fashion Legend', perks: ['Legendary badge', 'Unlimited wardrobe'] }
];

async function getXPStatus(req) {
  const { user } = req;

  try {
    const stats = await userDB.getStats(user.userId);
    const totalXP = stats.totalXP || 0;
    const currentLevel = stats.level || 1;
    
    const levelInfo = LEVELS.find(l => l.level === currentLevel) || LEVELS[LEVELS.length - 1];
    const nextLevelInfo = LEVELS.find(l => l.level === currentLevel + 1);
    
    const xpToNextLevel = nextLevelInfo ? nextLevelInfo.xp - totalXP : 0;
    const xpInCurrentLevel = totalXP - levelInfo.xp;
    const xpNeededForLevel = nextLevelInfo ? nextLevelInfo.xp - levelInfo.xp : 0;
    const progressPercent = nextLevelInfo 
      ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
      : 100;

    const kv = getKVClient();
    const historyKey = `xp:history:${user.userId}`;
    const history = await kv.get(historyKey) || [];
    const recentHistory = history.slice(-20).reverse();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        current: {
          level: currentLevel,
          title: levelInfo.title,
          totalXP,
          perks: levelInfo.perks
        },
        next: nextLevelInfo ? {
          level: nextLevelInfo.level,
          title: nextLevelInfo.title,
          xpRequired: nextLevelInfo.xp,
          xpNeeded: xpToNextLevel,
          progressPercent,
          perks: nextLevelInfo.perks
        } : null,
        progress: {
          current: xpInCurrentLevel,
          target: xpNeededForLevel,
          percent: progressPercent
        },
        allLevels: LEVELS,
        recentHistory,
        actionRewards: Object.entries(XP_REWARDS).map(([key, value]) => ({
          action: key,
          name: value.name,
          xp: value.xp,
          cooldown: value.cooldown,
          once: value.once || false
        }))
      }, {
        message: `Level ${currentLevel} - ${levelInfo.title}`
      }))
    };
  } catch (error) {
    console.error('Get XP status error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve XP status'
      ))
    };
  }
}

async function awardXP(req) {
  const { user } = req;

  const rateLimit = checkRateLimit(`xp_award:${user.userId}`, 30, 60000);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.RATE_LIMITED,
        'Too many XP requests. Please try again later.'
      ))
    };
  }

  try {
    const body = await parseRequestBody(req);
    const action = body.action?.toUpperCase();
    
    if (!action || !XP_REWARDS[action]) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.INVALID_INPUT,
          `Invalid action. Valid actions: ${Object.keys(XP_REWARDS).join(', ')}`
        ))
      };
    }

    const rewardConfig = XP_REWARDS[action];
    const kv = getKVClient();
    const cooldownKey = `xp:cooldown:${user.userId}:${action}`;
    const lastAward = await kv.get(cooldownKey);
    const now = Date.now();

    if (lastAward && rewardConfig.cooldown > 0) {
      const timeSinceLast = now - lastAward;
      if (timeSinceLast < rewardConfig.cooldown) {
        const remainingMs = rewardConfig.cooldown - timeSinceLast;
        return {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            'COOLDOWN_ACTIVE',
            `Please wait ${Math.ceil(remainingMs / 1000)} seconds before this action.`,
            { retryAfter: Math.ceil(remainingMs / 1000) }
          ))
        };
      }
    }

    if (rewardConfig.once) {
      const completedKey = `xp:completed:${user.userId}:${action}`;
      const alreadyCompleted = await kv.get(completedKey);
      if (alreadyCompleted) {
        return {
          statusCode: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            'ALREADY_COMPLETED',
            'This one-time reward has already been claimed.'
          ))
        };
      }
      await kv.set(completedKey, true);
    }

    if (rewardConfig.dailyLimit) {
      const today = getTodayDate();
      const dailyKey = `xp:daily:${user.userId}:${action}:${today}`;
      const dailyCount = await kv.get(dailyKey) || 0;
      
      if (dailyCount >= rewardConfig.dailyLimit) {
        return {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            'DAILY_LIMIT_REACHED',
            `Daily limit of ${rewardConfig.dailyLimit} reached for this action.`
          ))
        };
      }
      await kv.set(dailyKey, dailyCount + 1, { ex: 86400 });
    }

    const xpToAward = body.xp || rewardConfig.xp;
    const stats = await userDB.getStats(user.userId);
    const oldLevel = stats.level || 1;
    const oldXP = stats.totalXP || 0;
    const newXP = oldXP + xpToAward;
    const newLevel = calculateLevelFromXP(newXP);

    await userDB.updateStats(user.userId, {
      totalXP: newXP,
      level: newLevel
    });

    if (rewardConfig.cooldown > 0) {
      await kv.set(cooldownKey, now, { ex: Math.ceil(rewardConfig.cooldown / 1000) });
    }

    const historyKey = `xp:history:${user.userId}`;
    const history = await kv.get(historyKey) || [];
    history.push({
      id: generateId('xp'),
      action,
      name: rewardConfig.name,
      xp: xpToAward,
      timestamp: now,
      totalXP: newXP,
      level: newLevel
    });
    await kv.set(historyKey, history.slice(-100));

    const leveledUp = newLevel > oldLevel;
    const response = {
      success: true,
      data: {
        awarded: {
          action,
          name: rewardConfig.name,
          xp: xpToAward
        },
        stats: {
          oldLevel,
          newLevel,
          oldXP,
          newXP,
          leveledUp,
          xpToNextLevel: getXPToNextLevel(newXP, newLevel)
        },
        message: leveledUp 
          ? `🎉 Level Up! You are now level ${newLevel}!` 
          : `+${xpToAward} XP! Keep it up!`
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Award XP error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to award XP'
      ))
    };
  }
}

function getXPToNextLevel(totalXP, currentLevel) {
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
  if (!nextLevel) return 0;
  return nextLevel.xp - totalXP;
}

// ============ MAIN HANDLER WITH ROUTING ============

async function userHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Parse path for sub-routes
  const pathMatch = url.match(/\/api\/user\/([^\/\?]+)/);
  const subPath = pathMatch ? pathMatch[1] : null;

  try {
    // Route to appropriate handler based on sub-path
    if (subPath === 'checkin') {
      switch (method) {
        case 'GET':
          return await getCheckinStatus(req);
        case 'POST':
          return await recordCheckin(req);
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
            body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
          };
      }
    }
    
    if (subPath === 'xp') {
      switch (method) {
        case 'GET':
          return await getXPStatus(req);
        case 'POST':
          return await awardXP(req);
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
            body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
          };
      }
    }

    // Main user routes
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
          body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
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
      body: JSON.stringify(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Internal server error'))
    };
  }
}

module.exports = withAuth(userHandler, { required: true });
