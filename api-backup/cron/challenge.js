/**
 * FashionTON Wardrobe - Challenge Lifecycle Cron Job
 * Automated challenge management
 * Runs daily at 00:00 UTC
 */

const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES
} = require('../_utils');
const { getKVClient, KEY_PATTERNS } = require('../_db');
const { challengeDB, entryDB } = require('../challenges/index');

const CRON_SECRET = process.env.CRON_SECRET;

const CHALLENGE_THEMES = [
  { theme: 'Summer Vibes ☀️', description: 'Show your best summer look! Beach, picnic, or just staying cool in the heat.' },
  { theme: 'Office Chic 💼', description: 'Professional outfits that make you feel confident at work.' },
  { theme: 'Street Style 🛹', description: 'Urban fashion that turns heads on the sidewalk.' },
  { theme: 'Cozy Comfort 🧶', description: 'Loungewear and comfy outfits for relaxing at home.' },
  { theme: 'Date Night 💕', description: 'Outfits perfect for a romantic evening out.' },
  { theme: 'Sporty Look 🏃', description: 'Athletic wear and active lifestyle outfits.' },
  { theme: 'Vintage Vibes 🕰️', description: 'Retro-inspired fashion from any era you love.' },
  { theme: 'Monochrome Magic ⚫⚪', description: 'Single-color outfits that make a bold statement.' },
  { theme: 'Pattern Play 🎨', description: 'Mix and match prints and patterns fearlessly.' },
  { theme: 'Minimalist Style ✨', description: 'Less is more - clean, simple, elegant outfits.' },
  { theme: 'Festival Ready 🎪', description: 'Bold looks for music festivals and events.' },
  { theme: 'Winter Wonderland ❄️', description: 'Cozy and stylish winter outfits.' },
  { theme: 'Spring Bloom 🌸', description: 'Fresh looks inspired by spring colors and flowers.' },
  { theme: 'Autumn Tones 🍂', description: 'Warm colors and fall fashion favorites.' },
  { theme: 'Night Out 🌃', description: 'Perfect outfits for evening entertainment.' },
  { theme: 'Beach Day 🏖️', description: 'Swimwear and beach-ready looks.' },
  { theme: 'Travel Style ✈️', description: 'Comfortable yet stylish outfits for traveling.' },
  { theme: 'Party Time 🎉', description: 'Celebration outfits for any special occasion.' },
  { theme: 'Casual Friday 👕', description: 'Relaxed but polished weekend vibes.' },
  { theme: 'Glamour Night 💎', description: 'Dress to impress for upscale events.' },
  { theme: 'Retro 80s 📼', description: 'Bold colors and vintage 80s style.' },
  { theme: '90s Nostalgia 📟', description: 'Grunge, hip-hop, or pop 90s fashion.' },
  { theme: 'Boho Chic 🌿', description: 'Free-spirited bohemian fashion.' },
  { theme: 'Preppy Style 🎓', description: 'Classic collegiate and polished looks.' }
];

const DAY_MS = 86400000;
const DEFAULT_PRIZE_POOL = 50000000000n;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Cron-Secret',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  const providedSecret = req.headers['x-cron-secret'];
  
  if (!CRON_SECRET) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        'CONFIG_ERROR',
        'Cron secret not configured'
      ))
    };
  }

  if (providedSecret !== CRON_SECRET) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid cron secret'
      ))
    };
  }

  try {
    const results = {
      timestamp: new Date().toISOString(),
      actions: []
    };

    const kv = getKVClient();
    const now = Date.now();

    const currentChallenge = await challengeDB.getCurrent();

    if (currentChallenge) {
      let statusUpdated = false;
      let oldStatus = currentChallenge.status;

      if (currentChallenge.status === 'active' && now >= currentChallenge.endTime) {
        currentChallenge.status = 'voting';
        statusUpdated = true;
        
        results.actions.push({
          type: 'status_change',
          challengeId: currentChallenge.id,
          from: oldStatus,
          to: 'voting',
          message: 'Entry phase ended, voting now open'
        });
      } else if (currentChallenge.status === 'voting' && now >= currentChallenge.votingEndTime) {
        const closeResult = await closeAndDistribute(currentChallenge);
        results.actions.push({
          type: 'challenge_close',
          challengeId: currentChallenge.id,
          ...closeResult
        });
        statusUpdated = true;
      }

      if (statusUpdated) {
        await kv.set(KEY_PATTERNS.challenge(currentChallenge.id), currentChallenge);
      }

      results.currentChallenge = {
        id: currentChallenge.id,
        theme: currentChallenge.theme,
        status: currentChallenge.status,
        entryCount: currentChallenge.entryCount
      };
    }

    const shouldCreateNew = !currentChallenge || 
      (currentChallenge.status === 'completed' && 
       now >= currentChallenge.votingEndTime + 3600000);

    if (shouldCreateNew) {
      const newChallenge = await createNewChallenge();
      results.actions.push({
        type: 'challenge_create',
        challengeId: newChallenge.id,
        theme: newChallenge.theme,
        message: 'New daily challenge created'
      });
    }

    const today = new Date();
    if (today.getDay() === 1 && today.getHours() === 0) {
      const weeklyReset = await resetWeeklyLeaderboard();
      results.actions.push({ type: 'weekly_reset', ...weeklyReset });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(successResponse(results))
    };

  } catch (error) {
    console.error('Cron job error:', error);
    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Cron job failed: ' + error.message
      ))
    };
  }
};

async function closeAndDistribute(challenge) {
  const entries = await entryDB.list(challenge.id, 'votes', 100);
  
  if (entries.length === 0) {
    await challengeDB.update(challenge.id, {
      status: 'completed',
      completedAt: Date.now()
    });
    
    return { success: true, winners: [], message: 'Challenge closed with no entries' };
  }

  const prizePool = BigInt(challenge.prizePool);
  const distribution = calculatePrizeDistribution(entries, prizePool);

  for (const winner of distribution.winners) {
    await entryDB.updateRank(challenge.id, winner.entryId, winner.rank, winner.prizeWon);
  }

  await challengeDB.update(challenge.id, {
    status: 'completed',
    completedAt: Date.now(),
    winnerCount: distribution.winners.length
  });

  return {
    success: true,
    winnersCount: distribution.winners.length,
    topWinner: distribution.winners[0] ? {
      userId: distribution.winners[0].userId,
      username: distribution.winners[0].username
    } : null
  };
}

function calculatePrizeDistribution(entries, prizePool) {
  const sorted = [...entries].sort((a, b) => b.votes - a.votes);
  
  const DISTRIBUTION = { 1: 0.50, 2: 0.30, 3: 0.15, 4: 0.025, 5: 0.025 };

  const winners = [];
  let totalDistributed = 0n;

  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    const entry = sorted[i];
    const rank = i + 1;
    const percentage = DISTRIBUTION[rank];
    
    if (percentage) {
      const prizeWon = (prizePool * BigInt(Math.floor(percentage * 10000)) / 10000n).toString();
      totalDistributed += BigInt(prizeWon);
      
      winners.push({
        rank, entryId: entry.id, userId: entry.userId,
        username: entry.username, votes: entry.votes, prizeWon
      });
    }
  }

  const remainingEntries = sorted.slice(5, 10);
  const remainingPool = prizePool - totalDistributed;
  
  if (remainingEntries.length > 0 && remainingPool > 0) {
    const splitAmount = remainingPool / BigInt(remainingEntries.length);
    
    for (let i = 0; i < remainingEntries.length; i++) {
      const entry = remainingEntries[i];
      const rank = i + 6;
      const prizeWon = splitAmount.toString();
      totalDistributed += BigInt(prizeWon);
      
      winners.push({
        rank, entryId: entry.id, userId: entry.userId,
        username: entry.username, votes: entry.votes, prizeWon
      });
    }
  }

  return { winners, totalDistributed: totalDistributed.toString() };
}

async function createNewChallenge() {
  const kv = getKVClient();
  const lastThemeIndex = await kv.get('challenge:lastThemeIndex') || -1;
  let nextThemeIndex = (lastThemeIndex + 1) % CHALLENGE_THEMES.length;
  
  if (nextThemeIndex === lastThemeIndex) {
    nextThemeIndex = (nextThemeIndex + 1) % CHALLENGE_THEMES.length;
  }

  const theme = CHALLENGE_THEMES[nextThemeIndex];
  const now = Date.now();

  const challenge = await challengeDB.create({
    theme: theme.theme,
    description: theme.description,
    prizePool: DEFAULT_PRIZE_POOL.toString(),
    startTime: now,
    endTime: now + DAY_MS,
    votingEndTime: now + (DAY_MS * 2),
    createdBy: 'cron'
  });

  await kv.set('challenge:lastThemeIndex', nextThemeIndex);
  return challenge;
}

async function resetWeeklyLeaderboard() {
  const kv = getKVClient();
  const weeklyKey = KEY_PATTERNS.leaderboard('weekly');
  const topUsers = await kv.zrange(weeklyKey, 0, 2, { rev: true, withScores: true });
  
  await kv.del(weeklyKey);
  await kv.set('leaderboard:weekly:lastReset', Date.now());

  return {
    success: true,
    previousTop3: topUsers.map((item, index) => ({
      rank: index + 1,
      userId: typeof item === 'object' ? item.member : item,
      weeklyXP: typeof item === 'object' ? item.score : 0
    }))
  };
}
