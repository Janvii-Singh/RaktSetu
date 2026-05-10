const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const connectDB = require('./config/db');
const env = require('./config/env');
const { initSocket } = require('./socket/socketServer');
const { initCronJobs } = require('./services/cronService');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

// Initialize scheduled cron jobs
initCronJobs();

// Middleware
app.use(cors());
app.use(express.json());
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check (before error handler)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'raktsetu-server' });
});

// ML Service Health check (optional, can be removed if not needed)
app.get('/api/ml-health', async (req, res) => {
  try {
    const MLService = require('./services/mlService');
    const health = await MLService.checkHealth();
    res.json(health);
  } catch (error) {
    res.json({ status: 'unavailable', error: error.message });
  }
});

// Error handling middleware (should be last)
app.use(require('./middleware/errorHandler'));

const PORT = env.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📊 ML Service URL: ${env.ML_SERVICE_URL}`);
});

// Graceful shutdown for Docker
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server };