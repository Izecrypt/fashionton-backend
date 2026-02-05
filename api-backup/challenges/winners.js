/**
 * FashionTON Wardrobe - Winners & Prize Distribution API
 * POST /api/challenges/close - Close challenge and distribute prizes (Admin/Cron)
 * GET /api/challenges/winners/:id - Get winners for a challenge
 */

const { withAuth } = require('../_auth');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  parseRequestBody
} = require('../_utils');
const { getKVClient, KEY_PATTERNS, userDB } = require('../_db');
const { challengeDB, entryDB } = require('./index');
const { leaderboardDB } = require('../leaderboard/index');

// Admin user IDs
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [];

// Prize distribution percentages
const PRIZE_DISTRIBUTION = {
  1: 0.50,  // 1st place: 50%
  2: 0.30,  // 2nd place: 30%
  3: 0.15,  // 3rd place: 15%
  4: 0.025, // 4th place: 2.5%
  5: 0.025  // 5th place: 2.5%
};

// XP rewards for challenge participation
const XP_REWARDS = {
  submitEntry: 25,
  vote: 5,
  win1st: 500,
  win2nd: 300,
  win3rd: 150,
  top10: 50
};

/**
 * Winners Database Operations
 */
const winnersDB = {
  /**
   * Save winners for a challenge
   */
  async saveWinners(challengeId, winners) {
    const kv = getKVClient();
    const key = `winners:${challengeId}`;
    
    const winnersData = {
      challengeId,
      winners,
      distributedAt: Date.now(),
      totalPrizeDistributed: winners.reduce((sum, w) => sum + BigInt(w.prizeWon || 0), 0n).toString()
    };

    await kv.set(key, winnersData);
    return winnersData;
  },

  /**
   * Get winners for a challenge
   */
  async getWinners(challengeId) {
    const kv = getKVClient();
    const key = `winners:${challengeId}`;
    return await kv.get(key);
  },

  /**
   * Record prize transaction
   */
  async recordTransaction(userId, challengeId, amount, type = 'prize') {
    const kv = getKVClient();
    const txId = generateId('tx');
    const key = `transaction:${txId}`;
    
    const transaction = {
      id: txId,
      userId,
      challengeId,
      amount: amount.toString(),
      type,
      status: 'pending', // pending, completed, failed
      createdAt: Date.now()
    };

    await kv.set(key, transaction);
    
    // Add to user's transaction history
    const userTxKey = `transactions:${userId}`;
    await kv.zadd(userTxKey, { score: Date.now(), member: txId });

    return transaction;
  }
};

/**
 * Winners handler
 */
async function winnersHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Parse path
  const pathMatch = url.match(/\/api\/challenges\/winners\/([^\/\?]+)/);
  const challengeId = pathMatch ? pathMatch[1] : null;

  try {
    switch (method) {
      case 'POST':
        return await closeChallenge(req);
      case 'GET':
        if (!challengeId) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse(
              ERROR_CODES.INVALID_INPUT,
              'Challenge ID required'
            ))
          };
        }
        return await getWinners(req, challengeId);
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
    console.error('Winners API Error:', error);
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
 * POST /api/challenges/close - Close challenge and distribute prizes
 */
async function closeChallenge(req) {
  const { user } = req;

  try {
    // Check admin access or cron secret
    const body = await parseRequestBody(req);
    const cronSecret = req.headers['x-cron-secret'];
    const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
    
    if (!isAdmin(user.userId) && !isCron) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'FORBIDDEN',
          'Admin or cron access required'
        ))
      };
    }

    // Get challenge
    let challenge;
    if (body.challengeId) {
      challenge = await challengeDB.get(body.challengeId);
    } else {
      challenge = await challengeDB.getCurrent();
    }

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

    // Check if challenge is ready to close (voting period ended)
    const now = Date.now();
    if (challenge.status !== 'voting' && challenge.status !== 'completed') {
      // Allow manual close if explicitly requested
      if (!body.forceClose) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(errorResponse(
            ERROR_CODES.INVALID_INPUT,
            `Challenge is not in voting phase (current status: ${challenge.status})`,
            { useForceClose: true }
          ))
        };
      }
    }

    // Get all entries sorted by votes
    const entries = await entryDB.list(challenge.id, 'votes', 100);

    if (entries.length === 0) {
      // No entries, just mark as completed
      await challengeDB.update(challenge.id, {
        status: 'completed',
        completedAt: now
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(successResponse({
          challengeId: challenge.id,
          status: 'completed',
          message: 'Challenge closed with no entries'
        }))
      };
    }

    // Calculate prizes
    const prizePool = BigInt(challenge.prizePool);
    const winners = calculateWinners(entries, prizePool);

    // Update entries with ranks and prizes
    for (const winner of winners) {
      await entryDB.updateRank(challenge.id, winner.entryId, winner.rank, winner.prizeWon);
      
      // Award XP based on rank
      let xpAwarded = 0;
      let challengesWonDelta = 0;
      
      if (winner.rank === 1) {
        xpAwarded = XP_REWARDS.win1st;
        challengesWonDelta = 1;
      } else if (winner.rank === 2) {
        xpAwarded = XP_REWARDS.win2nd;
      } else if (winner.rank === 3) {
        xpAwarded = XP_REWARDS.win3rd;
      } else if (winner.rank <= 10) {
        xpAwarded = XP_REWARDS.top10;
      }

      // Get user stats
      const stats = await userDB.getStats(winner.userId);
      const newTotalXP = (stats.totalXP || 0) + xpAwarded;
      
      await userDB.updateStats(winner.userId, {
        totalXP: newTotalXP,
        challengesWon: (stats.challengesWon || 0) + challengesWonDelta
      });

      // Update global leaderboard
      await leaderboardDB.updateGlobalXP(winner.userId, newTotalXP);

      // Record transaction
      if (winner.prizeWon > 0) {
        await winnersDB.recordTransaction(
          winner.userId,
          challenge.id,
          BigInt(winner.prizeWon),
          'prize'
        );
      }

      winner.xpAwarded = xpAwarded;
    }

    // Award XP to all participants who submitted entries
    for (const entry of entries) {
      const isWinner = winners.some(w => w.entryId === entry.id);
      if (!isWinner) {
        const stats = await userDB.getStats(entry.userId);
        const newTotalXP = (stats.totalXP || 0) + XP_REWARDS.submitEntry;
        
        await userDB.updateStats(entry.userId, {
          totalXP: newTotalXP
        });
        
        await leaderboardDB.updateGlobalXP(entry.userId, newTotalXP);
        await leaderboardDB.addWeeklyXP(entry.userId, XP_REWARDS.submitEntry);
      }
    }

    // Award XP to all voters
    // (Would need to track all voters separately for this)

    // Save winners
    await winnersDB.saveWinners(challenge.id, winners);

    // Update challenge status
    await challengeDB.update(challenge.id, {
      status: 'completed',
      completedAt: now,
      winnerCount: winners.length
    });

    // Create new challenge (auto-create next one)
    if (body.autoCreateNext !== false) {
      await createNextChallenge(challenge);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse({
        challengeId: challenge.id,
        status: 'completed',
        totalEntries: entries.length,
        prizePool: challenge.prizePool,
        totalDistributed: winners.reduce((sum, w) => sum + BigInt(w.prizeWon || 0), 0n).toString(),
        winners: winners.map(w => ({
          rank: w.rank,
          entryId: w.entryId,
          userId: w.userId,
          username: w.username,
          votes: w.votes,
          prizeWon: w.prizeWon,
          xpAwarded: w.xpAwarded
        })),
        message: 'Challenge closed and prizes distributed successfully'
      }))
    };
  } catch (error) {
    console.error('Close challenge error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to close challenge'
      ))
    };
  }
}

/**
 * Calculate winners and prize distribution
 */
function calculateWinners(entries, prizePool) {
  // Sort by votes (descending)
  const sorted = [...entries].sort((a, b) => b.votes - a.votes);
  
  const winners = [];
  let remainingPool = prizePool;

  // Distribute to top 5 according to percentages
  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    const entry = sorted[i];
    const rank = i + 1;
    const percentage = PRIZE_DISTRIBUTION[rank] || 0;
    
    if (percentage > 0) {
      const prizeWon = (prizePool * BigInt(Math.floor(percentage * 10000)) / 10000n).toString();
      
      winners.push({
        rank,
        entryId: entry.id,
        userId: entry.userId,
        username: entry.username,
        votes: entry.votes,
        prizeWon,
        percentage: percentage * 100
      });

      remainingPool -= BigInt(prizeWon);
    }
  }

  // Split remaining among 6-10 (or fewer if not enough entries)
  const remainingWinners = sorted.slice(5, 10);
  if (remainingWinners.length > 0 && remainingPool > 0) {
    const splitAmount = remainingPool / BigInt(remainingWinners.length);
    
    for (let i = 0; i < remainingWinners.length; i++) {
      const entry = remainingWinners[i];
      const rank = i + 6;
      
      winners.push({
        rank,
        entryId: entry.id,
        userId: entry.userId,
        username: entry.username,
        votes: entry.votes,
        prizeWon: splitAmount.toString(),
        percentage: null // Split pot
      });
    }
  }

  return winners;
}

/**
 * Create next challenge (helper)
 */
async function createNextChallenge(previousChallenge) {
  // Predefined themes for auto-creation
  const THEMES = [
    { theme: 'Summer Vibes ☀️', description: 'Show your best summer look! Beach, picnic, or just staying cool.' },
    { theme: 'Office Chic 💼', description: 'Professional outfits for the workplace.' },
    { theme: 'Street Style 🛹', description: 'Urban fashion that turns heads.' },
    { theme: 'Cozy Comfort 🧶', description: 'Loungewear and comfy outfits for relaxing.' },
    { theme: 'Date Night 💕', description: 'Outfits perfect for a romantic evening.' },
    { theme: 'Sporty Look 🏃', description: 'Athletic wear and active lifestyle outfits.' },
    { theme: 'Vintage Vibes 🕰️', description: 'Retro-inspired fashion from any era.' },
    { theme: 'Monochrome Magic ⚫⚪', description: 'Single-color outfits that make a statement.' },
    { theme: 'Pattern Play 🎨', description: 'Mix and match prints and patterns.' },
    { theme: 'Minimalist Style ✨', description: 'Less is more - clean, simple outfits.' },
    { theme: 'Festival Ready 🎪', description: 'Bold looks for music festivals and events.' },
    { theme: 'Winter Wonderland ❄️', description: 'Cozy and stylish winter outfits.' },
    { theme: 'Spring Bloom 🌸', description: 'Fresh looks inspired by spring colors.' },
    { theme: 'Autumn Tones 🍂', description: 'Warm colors and fall fashion.' }
  ];

  // Pick a random theme different from previous
  let themeIndex = Math.floor(Math.random() * THEMES.length);
  if (previousChallenge && THEMES[themeIndex].theme === previousChallenge.theme) {
    themeIndex = (themeIndex + 1) % THEMES.length;
  }
  
  const theme = THEMES[themeIndex];
  const now = Date.now();
  const DAY = 86400000;

  await challengeDB.create({
    theme: theme.theme,
    description: theme.description,
    prizePool: previousChallenge?.prizePool || '50000000000',
    startTime: now,
    endTime: now + DAY, // 24h entry
    votingEndTime: now + (DAY * 2), // 24h voting after entry
    createdBy: 'system'
  });
}

/**
 * GET /api/challenges/winners/:id - Get winners for a challenge
 */
async function getWinners(req, challengeId) {
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

    // If challenge not completed, return current standings
    if (challenge.status !== 'completed') {
      const entries = await entryDB.list(challengeId, 'votes', 10);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(successResponse({
          challengeId,
          status: challenge.status,
          isFinal: false,
          currentStandings: entries.map((e, i) => ({
            rank: i + 1,
            entryId: e.id,
            userId: e.userId,
            username: e.username,
            votes: e.votes,
            photoUrl: e.photoUrl
          }))
        }))
      };
    }

    // Return final winners
    const winnersData = await winnersDB.getWinners(challengeId);
    
    if (!winnersData) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Winners data not found'
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
        challengeId,
        status: 'completed',
        isFinal: true,
        distributedAt: winnersData.distributedAt,
        totalPrizeDistributed: winnersData.totalPrizeDistributed,
        winners: winnersData.winners
      }))
    };
  } catch (error) {
    console.error('Get winners error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve winners'
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

/**
 * Generate unique ID
 */
function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

// Export handler
module.exports = withAuth(winnersHandler, { required: true });
