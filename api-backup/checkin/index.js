/**
 * FashionTON Wardrobe - Daily Check-in API
 * POST: Record daily check-in with streak tracking
 * GET: Get check-in history and streak info
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
const { getKVClient, KEY_PATTERNS, userDB, generateId } = require('../_db');

// XP rewards
const CHECKIN_XP = 50;
const STREAK_BONUS_XP = 10; // Additional XP per day of streak (capped)
const MAX_STREAK_BONUS = 50; // Max 50 bonus XP
const STREAK_RESET_HOURS = 48; // Reset streak if not checked in within 48 hours

/**
 * Handler for check-in API
 */
async function checkinHandler(req, res) {
  const { method } = req;

  try {
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
          body: JSON.stringify(errorResponse(
            'METHOD_NOT_ALLOWED',
            `Method ${method} not allowed`
          ))
        };
    }
  } catch (error) {
    console.error('Check-in API Error:', error);
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
 * GET /api/checkin - Get user's check-in status and history
 */
async function getCheckinStatus(req) {
  const { user } = req;

  try {
    const kv = getKVClient();
    const checkinKey = `checkin:${user.userId}`;
    
    // Get check-in data
    const checkinData = await kv.get(checkinKey) || {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      totalCheckins: 0,
      history: []
    };

    // Get today's date in user's timezone (or UTC if not set)
    const today = getTodayDate();
    const canCheckInToday = checkinData.lastCheckIn !== today;

    // Calculate next reward preview
    const nextReward = calculateNextReward(checkinData.currentStreak);

    // Get recent history (last 30 days)
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

/**
 * POST /api/checkin - Record daily check-in
 */
async function recordCheckin(req) {
  const { user } = req;

  // Rate limiting - max 5 check-in attempts per minute
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

    // Get existing check-in data
    let checkinData = await kv.get(checkinKey) || {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      totalCheckins: 0,
      history: []
    };

    // Check if already checked in today
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

    // Calculate new streak
    let newStreak = 1;
    if (checkinData.lastCheckIn) {
      const lastCheckDate = new Date(checkinData.lastCheckIn);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastCheckDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        newStreak = checkinData.currentStreak + 1;
      } else if (diffDays < 1) {
        // Same day (shouldn't happen due to date string check, but safety)
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
      // If diffDays > 1, streak resets to 1
    }

    // Calculate XP reward
    const streakBonus = Math.min((newStreak - 1) * STREAK_BONUS_XP, MAX_STREAK_BONUS);
    const totalXP = CHECKIN_XP + streakBonus;

    // Update check-in data
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
      ].slice(-90) // Keep last 90 days
    };

    // Save check-in data
    await kv.set(checkinKey, updatedCheckinData);

    // Award XP to user
    const userStats = await userDB.getStats(user.userId);
    const newTotalXP = (userStats.totalXP || 0) + totalXP;
    const newLevel = calculateLevel(newTotalXP);

    await userDB.updateStats(user.userId, {
      totalXP: newTotalXP,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak: updatedCheckinData.longestStreak,
      lastCheckIn: today
    });

    // Build response
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

/**
 * Calculate user's level based on total XP
 */
function calculateLevel(totalXP) {
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

/**
 * Calculate next reward preview
 */
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

  // All milestones achieved
  return {
    type: 'maintenance',
    message: 'Incredible! You\'ve achieved all streak milestones. Keep it up!',
    currentStreak
  };
}

/**
 * Check if streak is at risk of being reset
 */
function isStreakAtRisk(lastCheckIn) {
  if (!lastCheckIn) return false;

  const lastDate = new Date(lastCheckIn);
  const now = new Date();
  const diffHours = (now - lastDate) / (1000 * 60 * 60);

  return diffHours > 24 && diffHours < STREAK_RESET_HOURS;
}

/**
 * Generate personalized check-in message
 */
function generateCheckinMessage(streak, leveledUp) {
  if (leveledUp) {
    return '🎉 Level up! Keep the momentum going!';
  }

  if (streak === 1) {
    return 'Welcome back! Start your streak today! 🔥';
  } else if (streak === 7) {
    return '🔥 One week streak! You\'re on fire!';
  } else if (streak === 30) {
    return '🌟 Monthly milestone! Amazing dedication!';
  } else if (streak === 100) {
    return '💯 Incredible! 100 days strong!';
  } else if (streak === 365) {
    return '👑 LEGENDARY! A full year of consistency!';
  } else if (streak % 10 === 0) {
    return `🔥 ${streak} day streak! Keep it up!`;
  } else if (streak > 30) {
    return `✨ ${streak} days and counting! You're unstoppable!`;
  } else {
    return `🔥 ${streak} day streak! Keep going!`;
  }
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get tomorrow's date as YYYY-MM-DD string
 */
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Export with authentication wrapper
module.exports = withAuth(checkinHandler, { required: true });
