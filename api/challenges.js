/**
 * FashionTON Wardrobe - Consolidated Challenges API
 * Combines: challenges/index.js + entry.js + vote.js + winners.js + cron/challenge.js
 * 
 * Endpoints:
 * - GET/POST /api/challenges - Challenge management
 * - GET /api/challenges/:id - Get specific challenge
 * - GET /api/challenges/current - Get current challenge
 * - POST/DELETE /api/challenges/entry - Entry submission
 * - GET/POST /api/challenges/vote - Voting
 * - GET /api/challenges/winners/:id - Winners/prizes
 * - POST /api/challenges/close - Close challenge (admin/cron)
 * - POST /api/challenges/cron - Cron job handler
 */

const crypto = require('crypto');
const { 
  successResponse, 
  errorResponse, 
  HTTP_STATUS, 
  ERROR_CODES,
  validators,
  parseRequestBody,
  generateId
} = require('./_utils');
const { getKVClient, KEY_PATTERNS, userDB } = require('./_db');
const { uploadImage } = require('./_cloudinary');

// ============ CONSTANTS ============

const CHALLENGE_DURATION = 86400000;
const VOTING_DURATION = 86400000;
const DEFAULT_PRIZE_POOL = 50000000000n;
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [];
const CRON_SECRET = process.env.CRON_SECRET;

const PRIZE_DISTRIBUTION = {
  1: 0.50,
  2: 0.30,
  3: 0.15,
  4: 0.025,
  5: 0.025
};

const XP_REWARDS = {
  submitEntry: 25,
  vote: 5,
  win1st: 500,
  win2nd: 300,
  win3rd: 150,
  top10: 50
};

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
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data, X-Cron-Secret',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    const user = authenticateRequest(req);

    if (required && !user) {
      // Check for cron secret
      const cronSecret = req.headers['x-cron-secret'];
      if (cronSecret && cronSecret === CRON_SECRET) {
        req.user = { userId: 'cron', isCron: true };
        return handler(req, res);
      }
      
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResponse(
          'UNAUTHORIZED',
          'Invalid or missing authentication'
        ))
      };
    }

    req.user = user;
    return handler(req, res);
  };
}

function isAdmin(userId) {
  return ADMIN_USER_IDS.includes(userId);
}

// ============ DATABASE OPERATIONS ============

const challengeDB = {
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
    await kv.set('challenge:current', challengeId);

    return challenge;
  },

  async get(challengeId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.challenge(challengeId));
  },

  async getCurrent() {
    const kv = getKVClient();
    const currentId = await kv.get('challenge:current');
    if (!currentId) return null;
    
    const challenge = await this.get(currentId);
    if (!challenge) return null;

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

  async list(limit = 10) {
    const kv = getKVClient();
    const listKey = 'challenges:list';
    
    const challengeIds = await kv.zrange(listKey, 0, limit - 1, { rev: true });
    
    const challenges = [];
    for (const id of challengeIds) {
      const challenge = await this.get(id);
      if (challenge) challenges.push(challenge);
    }

    return challenges;
  }
};

const entryDB = {
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
    await kv.set(userEntryKey, entryId);

    const challenge = await challengeDB.get(challengeId);
    if (challenge) {
      challenge.entryCount = (await kv.zcard(listKey)) || 0;
      await kv.set(KEY_PATTERNS.challenge(challengeId), challenge);
    }

    return entry;
  },

  async get(challengeId, entryId) {
    const kv = getKVClient();
    return await kv.get(KEY_PATTERNS.entry(challengeId, entryId));
  },

  async getUserEntry(userId, challengeId) {
    const kv = getKVClient();
    const userEntryKey = `entry:user:${userId}:${challengeId}`;
    const entryId = await kv.get(userEntryKey);
    
    if (!entryId) return null;
    return await this.get(challengeId, entryId);
  },

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
      const entry = await this.get(challengeId, id);
      if (entry) entries.push(entry);
    }

    if (sortBy === 'votes') {
      entries.sort((a, b) => b.votes - a.votes);
    }

    return entries.slice(0, limit);
  },

  async addVote(challengeId, entryId, userId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.entry(challengeId, entryId);
    
    const entry = await kv.get(key);
    if (!entry) return null;

    if (entry.voters.includes(userId)) {
      return { error: 'ALREADY_VOTED' };
    }

    entry.voters.push(userId);
    entry.votes = entry.voters.length;

    await kv.set(key, entry);
    return entry;
  },

  async delete(challengeId, entryId) {
    const kv = getKVClient();
    const key = KEY_PATTERNS.entry(challengeId, entryId);
    const listKey = KEY_PATTERNS.entryList(challengeId);
    
    const entry = await kv.get(key);
    if (!entry) return false;

    const userEntryKey = `entry:user:${entry.userId}:${challengeId}`;
    await kv.del(userEntryKey);
    await kv.del(key);
    await kv.zrem(listKey, entryId);

    const challenge = await challengeDB.get(challengeId);
    if (challenge) {
      challenge.entryCount = (await kv.zcard(listKey)) || 0;
      await kv.set(KEY_PATTERNS.challenge(challengeId), challenge);
    }

    return true;
  },

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

const voteDB = {
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

  async getUserVote(userId, challengeId) {
    const kv = getKVClient();
    const voteId = `vote:${userId}:${challengeId}`;
    return await kv.get(voteId);
  },

  async hasVoted(userId, challengeId) {
    const vote = await this.getUserVote(userId, challengeId);
    return vote !== null;
  }
};

const winnersDB = {
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

  async getWinners(challengeId) {
    const kv = getKVClient();
    const key = `winners:${challengeId}`;
    return await kv.get(key);
  }
};

// ============ CHALLENGE HANDLERS ============

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

    const userEntry = await entryDB.getUserEntry(user.userId, challenge.id);
    const userVote = await voteDB.getUserVote(user.userId, challenge.id);

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

async function createChallenge(req) {
  const { user } = req;

  try {
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

// ============ ENTRY HANDLERS ============

async function submitEntry(req) {
  const { user } = req;
  const ENTRY_XP = 25;

  try {
    const body = await parseRequestBody(req);
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

    let photoUrl = body.photoUrl;
    
    if (body.photoBase64) {
      try {
        const uploadResult = await uploadImage(body.photoBase64, {
          userId: user.userId,
          folder: 'fashionton/challenges',
          tags: ['challenge_entry', `challenge_${challenge.id}`]
        });

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

    let outfitId = null;
    if (body.outfitId) {
      const { outfitDB } = require('./_db');
      const outfit = await outfitDB.get(user.userId, body.outfitId);
      if (outfit) outfitId = body.outfitId;
    }

    const entryData = {
      userId: user.userId,
      username: user.username || user.firstName,
      photoUrl,
      outfitId
    };

    const entry = await entryDB.create(challenge.id, entryData);

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

async function deleteEntry(req, entryId) {
  const { user } = req;

  try {
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

    await entryDB.delete(challenge.id, entryId);

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

// ============ VOTE HANDLERS ============

const voteRateLimits = new Map();
const VOTE_RATE_LIMIT = 1000;

async function castVote(req) {
  const { user } = req;

  try {
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

    const vote = await voteDB.create({
      userId: user.userId,
      challengeId: challenge.id,
      entryId
    });

    voteRateLimits.set(rateLimitKey, now);

    for (const [key, time] of voteRateLimits.entries()) {
      if (now - time > 60000) voteRateLimits.delete(key);
    }

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

async function getUserVotes(req) {
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
          hasVoted: false,
          message: 'No active challenge'
        }))
      };
    }

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

// ============ WINNERS HANDLERS ============

async function closeChallenge(req) {
  const { user } = req;

  try {
    const body = await parseRequestBody(req);
    const cronSecret = req.headers['x-cron-secret'];
    const isCron = cronSecret && cronSecret === CRON_SECRET;
    
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

    const now = Date.now();
    if (challenge.status !== 'voting' && challenge.status !== 'completed') {
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

    const entries = await entryDB.list(challenge.id, 'votes', 100);

    if (entries.length === 0) {
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

    const prizePool = BigInt(challenge.prizePool);
    const winners = calculateWinners(entries, prizePool);

    for (const winner of winners) {
      await entryDB.updateRank(challenge.id, winner.entryId, winner.rank, winner.prizeWon);
      
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

      const stats = await userDB.getStats(winner.userId);
      const newTotalXP = (stats.totalXP || 0) + xpAwarded;
      
      await userDB.updateStats(winner.userId, {
        totalXP: newTotalXP,
        challengesWon: (stats.challengesWon || 0) + challengesWonDelta
      });

      winner.xpAwarded = xpAwarded;
    }

    for (const entry of entries) {
      const isWinner = winners.some(w => w.entryId === entry.id);
      if (!isWinner) {
        const stats = await userDB.getStats(entry.userId);
        const newTotalXP = (stats.totalXP || 0) + XP_REWARDS.submitEntry;
        
        await userDB.updateStats(entry.userId, {
          totalXP: newTotalXP
        });
      }
    }

    await winnersDB.saveWinners(challenge.id, winners);

    await challengeDB.update(challenge.id, {
      status: 'completed',
      completedAt: now,
      winnerCount: winners.length
    });

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

function calculateWinners(entries, prizePool) {
  const sorted = [...entries].sort((a, b) => b.votes - a.votes);
  
  const winners = [];
  let remainingPool = prizePool;

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
        percentage: null
      });
    }
  }

  return winners;
}

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

async function createNextChallenge(previousChallenge) {
  const kv = getKVClient();
  const lastThemeIndex = await kv.get('challenge:lastThemeIndex') || -1;
  let nextThemeIndex = (lastThemeIndex + 1) % CHALLENGE_THEMES.length;
  
  if (nextThemeIndex === lastThemeIndex) {
    nextThemeIndex = (nextThemeIndex + 1) % CHALLENGE_THEMES.length;
  }

  const theme = CHALLENGE_THEMES[nextThemeIndex];
  const now = Date.now();
  const DAY = 86400000;

  await challengeDB.create({
    theme: theme.theme,
    description: theme.description,
    prizePool: previousChallenge?.prizePool || '50000000000',
    startTime: now,
    endTime: now + DAY,
    votingEndTime: now + (DAY * 2),
    createdBy: 'system'
  });

  await kv.set('challenge:lastThemeIndex', nextThemeIndex);
}

// ============ CRON HANDLER ============

async function cronHandler(req) {
  const cronSecret = req.headers['x-cron-secret'];
  
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

  if (cronSecret !== CRON_SECRET) {
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
        const closeResult = await closeAndDistributeCron(currentChallenge);
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
      const newChallenge = await createNewChallengeCron();
      results.actions.push({
        type: 'challenge_create',
        challengeId: newChallenge.id,
        theme: newChallenge.theme,
        message: 'New daily challenge created'
      });
    }

    const today = new Date();
    if (today.getDay() === 1 && today.getHours() === 0) {
      const weeklyReset = await resetWeeklyLeaderboardCron();
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
}

async function closeAndDistributeCron(challenge) {
  const entries = await entryDB.list(challenge.id, 'votes', 100);
  
  if (entries.length === 0) {
    await challengeDB.update(challenge.id, {
      status: 'completed',
      completedAt: Date.now()
    });
    
    return { success: true, winners: [], message: 'Challenge closed with no entries' };
  }

  const prizePool = BigInt(challenge.prizePool);
  const distribution = calculateWinners(entries, prizePool);

  for (const winner of distribution) {
    await entryDB.updateRank(challenge.id, winner.entryId, winner.rank, winner.prizeWon);
  }

  await challengeDB.update(challenge.id, {
    status: 'completed',
    completedAt: Date.now(),
    winnerCount: distribution.length
  });

  return {
    success: true,
    winnersCount: distribution.length,
    topWinner: distribution[0] ? {
      userId: distribution[0].userId,
      username: distribution[0].username
    } : null
  };
}

async function createNewChallengeCron() {
  const kv = getKVClient();
  const lastThemeIndex = await kv.get('challenge:lastThemeIndex') || -1;
  let nextThemeIndex = (lastThemeIndex + 1) % CHALLENGE_THEMES.length;
  
  if (nextThemeIndex === lastThemeIndex) {
    nextThemeIndex = (nextThemeIndex + 1) % CHALLENGE_THEMES.length;
  }

  const theme = CHALLENGE_THEMES[nextThemeIndex];
  const now = Date.now();
  const DAY_MS = 86400000;

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

async function resetWeeklyLeaderboardCron() {
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

// ============ MAIN HANDLER WITH ROUTING ============

async function challengesHandler(req, res) {
  const { method } = req;
  const url = req.url || '';
  
  // Parse path components
  const pathParts = url.replace(/\?.*$/, '').split('/').filter(Boolean);
  const apiIndex = pathParts.indexOf('api');
  const parts = apiIndex >= 0 ? pathParts.slice(apiIndex + 2) : [];
  
  // Check for cron endpoint
  if (parts[0] === 'cron' && req.method === 'POST') {
    return await cronHandler(req);
  }
  
  // Check for sub-routes
  const subRoute = parts[0];
  const subId = parts[1];

  try {
    // Entry routes
    if (subRoute === 'entry') {
      switch (method) {
        case 'POST':
          return await submitEntry(req);
        case 'DELETE':
          if (!subId) {
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
          return await deleteEntry(req, subId);
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
            body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
          };
      }
    }
    
    // Vote routes
    if (subRoute === 'vote' || subRoute === 'votes') {
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
            body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
          };
      }
    }
    
    // Winners routes
    if (subRoute === 'winners') {
      switch (method) {
        case 'GET':
          if (!subId) {
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
          return await getWinners(req, subId);
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
            body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
          };
      }
    }
    
    // Close challenge route
    if (subRoute === 'close') {
      switch (method) {
        case 'POST':
          return await closeChallenge(req);
        case 'OPTIONS':
          return {
            statusCode: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data, X-Cron-Secret',
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

    // Main challenge routes
    switch (method) {
      case 'GET':
        if (subRoute === 'current') {
          return await getCurrentChallenge(req);
        } else if (subRoute) {
          return await getChallengeById(req, subRoute);
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
          body: JSON.stringify(errorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`))
        };
    }
  } catch (error) {
    console.error('Challenges API Error:', error);
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

module.exports = withAuth(challengesHandler, { required: true });
