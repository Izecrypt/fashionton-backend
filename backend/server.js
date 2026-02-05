const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('Starting server...');
console.log('PORT:', PORT);
console.log('HOST:', HOST);

// CORS
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  console.log('Health check received');
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

// Start server with explicit host binding
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
