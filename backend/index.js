const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Telegram-Init-Data', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Handle OPTIONS preflight
app.options('*', cors());

// Redis Client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Telegram Auth Verification
function verifyTelegramAuth(initData) {
  if (!initData || !process.env.TELEGRAM_BOT_TOKEN) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    const checkHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    if (checkHash !== hash) return null;
    return JSON.parse(params.get('user'));
  } catch (e) {
    return null;
  }
}

// Auth Middleware
const requireAuth = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'];
  const user = verifyTelegramAuth(initData);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
};

// Health Check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'FashionTON API v1', timestamp: Date.now() });
});

// ===== USER API =====
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const profile = await redis.get(`user:${req.user.id}`);
    res.json({ 
      success: true, 
      data: profile || { 
        userId: req.user.id, 
        firstName: req.user.first_name,
        username: req.user.username,
        totalXP: 0,
        level: 1,
        wardrobeCount: 0
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/user', requireAuth, async (req, res) => {
  try {
    const profile = {
      userId: req.user.id,
      firstName: req.user.first_name,
      username: req.user.username,
      totalXP: 0,
      level: 1,
      wardrobeCount: 0,
      createdAt: Date.now()
    };
    await redis.set(`user:${req.user.id}`, profile);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== WARDROBE API =====
app.get('/api/wardrobe', requireAuth, async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    let items = await redis.get(`wardrobe:${req.user.id}`) || [];
    
    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }
    
    const paginated = items.slice(offset, offset + limit);
    res.json({ success: true, data: paginated, total: items.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/wardrobe', requireAuth, async (req, res) => {
  try {
    const items = await redis.get(`wardrobe:${req.user.id}`) || [];
    
    // Check limit (20 for free tier)
    if (items.length >= 20) {
      return res.status(403).json({ 
        success: false, 
        error: 'Wardrobe limit reached. Upgrade to Premium!' 
      });
    }
    
    const newItem = {
      id: `item_${Date.now()}`,
      userId: req.user.id,
      ...req.body,
      createdAt: Date.now()
    };
    
    items.push(newItem);
    await redis.set(`wardrobe:${req.user.id}`, items);
    
    // Update user stats
    const user = await redis.get(`user:${req.user.id}`);
    if (user) {
      user.wardrobeCount = items.length;
      await redis.set(`user:${req.user.id}`, user);
    }
    
    res.json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/wardrobe/:id', requireAuth, async (req, res) => {
  try {
    let items = await redis.get(`wardrobe:${req.user.id}`) || [];
    const index = items.findIndex(item => item.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    
    items[index] = { ...items[index], ...req.body, updatedAt: Date.now() };
    await redis.set(`wardrobe:${req.user.id}`, items);
    
    res.json({ success: true, data: items[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/wardrobe/:id', requireAuth, async (req, res) => {
  try {
    let items = await redis.get(`wardrobe:${req.user.id}`) || [];
    items = items.filter(item => item.id !== req.params.id);
    await redis.set(`wardrobe:${req.user.id}`, items);
    
    // Update user stats
    const user = await redis.get(`user:${req.user.id}`);
    if (user) {
      user.wardrobeCount = items.length;
      await redis.set(`user:${req.user.id}`, user);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CHALLENGES API =====
const CHALLENGES = [
  { id: '1', theme: 'Summer Vibes ☀️', description: 'Show your best summer look!', prizePool: 50 },
  { id: '2', theme: 'Office Chic 💼', description: 'Professional workwear', prizePool: 40 },
  { id: '3', theme: 'Date Night 💕', description: 'Romantic evening outfits', prizePool: 45 },
  { id: '4', theme: 'Street Style 🏙️', description: 'Urban fashion', prizePool: 35 },
];

app.get('/api/challenges/current', async (req, res) => {
  try {
    const dayIndex = Math.floor(Date.now() / 86400000) % CHALLENGES.length;
    const challenge = {
      ...CHALLENGES[dayIndex],
      endTime: Date.now() + 86400000,
      status: 'active'
    };
    res.json({ success: true, data: challenge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/challenges/:id/entries', async (req, res) => {
  try {
    const entries = await redis.get(`challenge:${req.params.id}:entries`) || [];
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/challenges/entry', requireAuth, async (req, res) => {
  try {
    const { challengeId, photoUrl, outfitId } = req.body;
    let entries = await redis.get(`challenge:${challengeId}:entries`) || [];
    
    // Check if already entered
    if (entries.find(e => e.userId === req.user.id)) {
      return res.status(400).json({ success: false, error: 'Already entered this challenge' });
    }
    
    const entry = {
      id: `entry_${Date.now()}`,
      challengeId,
      userId: req.user.id,
      username: req.user.username || req.user.first_name,
      photoUrl,
      outfitId,
      votes: 0,
      createdAt: Date.now()
    };
    
    entries.push(entry);
    await redis.set(`challenge:${challengeId}:entries`, entries);
    
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/challenges/vote', requireAuth, async (req, res) => {
  try {
    const { challengeId, entryId } = req.body;
    let entries = await redis.get(`challenge:${challengeId}:entries`) || [];
    
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    
    // Check if already voted
    const votes = await redis.get(`votes:${challengeId}:${req.user.id}`);
    if (votes) {
      return res.status(400).json({ success: false, error: 'Already voted' });
    }
    
    entry.votes += 1;
    await redis.set(`challenge:${challengeId}:entries`, entries);
    await redis.set(`votes:${challengeId}:${req.user.id}`, entryId);
    
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CHECK-IN API =====
app.post('/api/checkin', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const checkInKey = `checkin:${req.user.id}:${today}`;
    
    // Check if already checked in today
    const existing = await redis.get(checkInKey);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already checked in today' });
    }
    
    // Get last check-in for streak
    const lastCheckIn = await redis.get(`checkin:last:${req.user.id}`);
    let streak = 1;
    
    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn);
      const todayDate = new Date(today);
      const diffDays = (todayDate - lastDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        const currentStreak = await redis.get(`checkin:streak:${req.user.id}`) || 0;
        streak = currentStreak + 1;
      }
    }
    
    // Award XP (50 base + 10 per streak, max 100)
    const xpAwarded = Math.min(50 + (streak * 10), 100);
    
    await redis.set(checkInKey, { date: today, xp: xpAwarded });
    await redis.set(`checkin:last:${req.user.id}`, today);
    await redis.set(`checkin:streak:${req.user.id}`, streak);
    
    // Update user XP
    const user = await redis.get(`user:${req.user.id}`);
    if (user) {
      user.totalXP = (user.totalXP || 0) + xpAwarded;
      await redis.set(`user:${req.user.id}`, user);
    }
    
    res.json({ 
      success: true, 
      data: { 
        xpAwarded, 
        streak,
        message: streak > 1 ? `🔥 ${streak} day streak!` : 'Daily check-in complete!' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/checkin', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const checkInKey = `checkin:${req.user.id}:${today}`;
    const checkedIn = await redis.get(checkInKey);
    const streak = await redis.get(`checkin:streak:${req.user.id}`) || 0;
    
    res.json({ 
      success: true, 
      data: { 
        checkedIn: !!checkedIn,
        streak,
        today
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== LEADERBOARD API =====
app.get('/api/leaderboard/global', async (req, res) => {
  try {
    // Mock leaderboard (in production, aggregate from all users)
    const leaderboard = [
      { rank: 1, username: 'StyleQueen', totalXP: 1250, avatarUrl: null },
      { rank: 2, username: 'FashionKing', totalXP: 1100, avatarUrl: null },
      { rank: 3, username: 'TrendSetter', totalXP: 980, avatarUrl: null },
      { rank: 4, username: 'ChicDiva', totalXP: 875, avatarUrl: null },
      { rank: 5, username: 'VogueVibes', totalXP: 790, avatarUrl: null },
    ];
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SIZE CALCULATOR API =====
const SIZE_CHARTS = {
  zara: {
    dresses: {
      XS: { bust: '80-84', waist: '60-64', hips: '86-90' },
      S: { bust: '84-88', waist: '64-68', hips: '90-94' },
      M: { bust: '88-92', waist: '68-72', hips: '94-98' },
      L: { bust: '92-96', waist: '72-76', hips: '98-102' },
      XL: { bust: '96-100', waist: '76-80', hips: '102-106' }
    }
  },
  nike: {
    tops: {
      XS: { chest: '80-88' },
      S: { chest: '88-96' },
      M: { chest: '96-104' },
      L: { chest: '104-112' },
      XL: { chest: '112-124' }
    }
  }
};

app.post('/api/size-calculator', async (req, res) => {
  try {
    const { brand, category, measurements } = req.body;
    const chart = SIZE_CHARTS[brand]?.[category];
    
    if (!chart) {
      return res.status(400).json({ 
        success: false, 
        error: 'Size chart not available for this brand/category' 
      });
    }
    
    // Simple matching algorithm
    let bestSize = 'M';
    let bestScore = 0;
    
    for (const [size, dims] of Object.entries(chart)) {
      let score = 0;
      let matches = 0;
      
      for (const [dim, range] of Object.entries(dims)) {
        if (measurements[dim]) {
          const [min, max] = range.split('-').map(n => parseInt(n));
          const val = measurements[dim];
          if (val >= min && val <= max) {
            score += 100;
            matches++;
          } else {
            const mid = (min + max) / 2;
            const diff = Math.abs(val - mid);
            score += Math.max(0, 100 - diff);
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestSize = size;
      }
    }
    
    const confidence = Math.min(bestScore / Object.keys(measurements).length, 100);
    
    res.json({
      success: true,
      data: {
        recommendedSize: bestSize,
        confidence: confidence / 100,
        sizeChart: chart,
        fitNotes: `Based on ${Object.keys(measurements).join(', ')} measurements`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 FashionTON Backend running on port ${PORT}`);
});
