const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check - MUST respond for Railway health checks
app.get('/', (req, res) => {
  res.json({ success: true, message: 'FashionTON API' });
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy' });
});

// Leaderboard
app.get('/api/leaderboard/global', (req, res) => {
  res.json({
    success: true,
    data: [
      { rank: 1, username: 'StyleQueen', totalXP: 1250 },
      { rank: 2, username: 'FashionKing', totalXP: 1100 },
      { rank: 3, username: 'TrendSetter', totalXP: 980 },
    ]
  });
});

// Current challenge
app.get('/api/challenges/current', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '1',
      theme: 'Summer Vibes ☀️',
      description: 'Show your best summer look!',
      prizePool: 50,
      endTime: Date.now() + 86400000
    }
  });
});

// Wardrobe
app.get('/api/wardrobe', (req, res) => {
  res.json({ success: true, data: [] });
});

// Start server - let Express handle the host binding
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
