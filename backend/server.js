const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// API routes
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

app.get('/api/wardrobe', (req, res) => {
  res.json({ success: true, data: [] });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - bind to all interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
