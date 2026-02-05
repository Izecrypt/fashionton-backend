/**
 * FashionTON Wardrobe - XP & Leveling System API
 * GET: Get user's XP and level info
 * POST: Award XP for specific actions
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody,
  checkRateLimit
} = require('../_utils');
const { getKVClient, userDB, generateId } = require('../_db');

// XP Rewards Table
const XP_REWARDS = {
  CHECKIN: { xp: 50, name: 'Daily Check-in', cooldown: 0 },
  UPLOAD_ITEM: { xp: 25, name: 'Upload Wardrobe Item', cooldown: 0 },
  CREATE_OUTFIT: { xp: 50, name: 'Create Outfit', cooldown: 60 * 1000 }, // 1 min between outfits
  WIN_CHALLENGE: { xp: 100, name: 'Win Challenge', cooldown: 0 },
  SHARE_OUTFIT: { xp: 25, name: 'Share Outfit', cooldown: 5 * 60 * 1000 }, // 5 min between shares
  COMPLETE_PROFILE: { xp: 100, name: 'Complete Profile', cooldown: 0, once: true },
  LIKE_OUTFIT: { xp: 5, name: 'Like Outfit', cooldown: 1000, dailyLimit: 50 }, // Max 50 likes per day
  STREAK_BONUS: { xp: 0, name: 'Streak Bonus', cooldown: 0 } // Dynamic XP
};

// Level thresholds
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

/**
 * Handler for XP API
 */
async function xpHandler(req, res) {
  const { method } = req;

  try {
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
          body: JSON.stringify(errorResponse(
            'METHOD_NOT_ALLOWED',
            `Method ${method} not allowed`
          ))
        };
    }
  } catch (error) {
    console.error('XP API Error:', error);
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
 * GET /api/xp - Get user's XP and level information
 */
async function getXPStatus(req) {
  const { user } = req;

  try {
    const stats = await userDB.getStats(user.userId);
    const totalXP = stats.totalXP || 0;
    const currentLevel = stats.level || 1;
    
    // Calculate level details
    const levelInfo = getLevelInfo(currentLevel);
    const nextLevelInfo = getLevelInfo(currentLevel + 1);
    
    // Calculate progress to next level
    const xpToNextLevel = nextLevelInfo ? nextLevelInfo.xp - totalXP : 0;
    const xpInCurrentLevel = totalXP - levelInfo.xp;
    const xpNeededForLevel = nextLevelInfo ? nextLevelInfo.xp - levelInfo.xp : 0;
    const progressPercent = nextLevelInfo 
      ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
      : 100;

    // Get recent XP history
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

/**
 * POST /api/xp - Award XP for an action
 */
async function awardXP(req) {
  const { user } = req;

  // Rate limiting - max 30 XP awards per minute
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
    
    // Validate action
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

    // Check cooldown
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

    // Check one-time actions
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

    // Check daily limits
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
      await kv.set(dailyKey, dailyCount + 1, { ex: 86400 }); // Expire after 24 hours
    }

    // Calculate XP to award (allow custom XP for streak bonuses)
    const xpToAward = body.xp || rewardConfig.xp;

    // Get current stats
    const stats = await userDB.getStats(user.userId);
    const oldLevel = stats.level || 1;
    const oldXP = stats.totalXP || 0;
    const newXP = oldXP + xpToAward;
    const newLevel = calculateLevel(newXP);

    // Update stats
    await userDB.updateStats(user.userId, {
      totalXP: newXP,
      level: newLevel
    });

    // Set cooldown
    if (rewardConfig.cooldown > 0) {
      await kv.set(cooldownKey, now, { ex: Math.ceil(rewardConfig.cooldown / 1000) });
    }

    // Record in history
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
    await kv.set(historyKey, history.slice(-100)); // Keep last 100 entries

    // Build response
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

/**
 * Get level information
 */
function getLevelInfo(level) {
  return LEVELS.find(l => l.level === level) || LEVELS[LEVELS.length - 1];
}

/**
 * Calculate user's level based on total XP
 */
function calculateLevel(totalXP) {
  let level = 1;
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.xp) {
      level = lvl.level;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Calculate XP needed for next level
 */
function getXPToNextLevel(totalXP, currentLevel) {
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
  if (!nextLevel) return 0;
  return nextLevel.xp - totalXP;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Export with authentication wrapper
module.exports = withAuth(xpHandler, { required: true });
