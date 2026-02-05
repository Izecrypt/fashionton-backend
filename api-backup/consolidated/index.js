// Consolidated API - All endpoints in one file for Vercel Hobby plan

const { createClient } = require('@vercel/kv');
const crypto = require('crypto');

// KV Client
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
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
    const user = JSON.parse(params.get('user'));
    return user;
  } catch (e) {
    return null;
  }
}

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
};

// Main Handler
module.exports = async (req, res) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const user = verifyTelegramAuth(req.headers['x-telegram-init-data']);
  
  res.setHeader('Content-Type', 'application/json');
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  try {
    // Route: GET /api/consolidated - Health check
    if (pathname === '/api/consolidated' && req.method === 'GET') {
      return res.end(JSON.stringify({ success: true, message: 'FashionTON API v1' }));
    }

    // Route: User Profile
    if (pathname === '/api/consolidated/user' && req.method === 'GET') {
      if (!user) return res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      const profile = await kv.get(`user:${user.id}`);
      return res.end(JSON.stringify({ success: true, data: profile || { userId: user.id, firstName: user.first_name } }));
    }

    if (pathname === '/api/consolidated/user' && req.method === 'POST') {
      if (!user) return res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      await kv.set(`user:${user.id}`, JSON.stringify({ userId: user.id, firstName: user.first_name, totalXP: 0, level: 1 }));
      return res.end(JSON.stringify({ success: true }));
    }

    // Route: Wardrobe
    if (pathname === '/api/consolidated/wardrobe' && req.method === 'GET') {
      if (!user) return res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      const items = await kv.get(`wardrobe:${user.id}`) || [];
      return res.end(JSON.stringify({ success: true, data: items }));
    }

    if (pathname === '/api/consolidated/wardrobe' && req.method === 'POST') {
      if (!user) return res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      const body = await getBody(req);
      const items = await kv.get(`wardrobe:${user.id}`) || [];
      items.push({ id: Date.now(), ...body, createdAt: Date.now() });
      await kv.set(`wardrobe:${user.id}`, items);
      return res.end(JSON.stringify({ success: true, data: items[items.length - 1] }));
    }

    // Route: Challenges
    if (pathname === '/api/consolidated/challenges/current' && req.method === 'GET') {
      const challenge = {
        id: '1',
        theme: 'Summer Vibes ☀️',
        description: 'Show your best summer look!',
        prizePool: 50,
        endTime: Date.now() + 86400000,
        entries: []
      };
      return res.end(JSON.stringify({ success: true, data: challenge }));
    }

    // Route: Check-in
    if (pathname === '/api/consolidated/checkin' && req.method === 'POST') {
      if (!user) return res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return res.end(JSON.stringify({ success: true, data: { xpAwarded: 50, streak: 1 } }));
    }

    // Route: Leaderboard
    if (pathname === '/api/consolidated/leaderboard' && req.method === 'GET') {
      return res.end(JSON.stringify({ 
        success: true, 
        data: [
          { rank: 1, username: 'StyleQueen', totalXP: 1250 },
          { rank: 2, username: 'FashionKing', totalXP: 1100 },
          { rank: 3, username: 'TrendSetter', totalXP: 980 },
        ]
      }));
    }

    // 404
    res.writeHead(404);
    return res.end(JSON.stringify({ success: false, error: 'Not found' }));

  } catch (error) {
    res.writeHead(500);
    return res.end(JSON.stringify({ success: false, error: error.message }));
  }
};

function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}
