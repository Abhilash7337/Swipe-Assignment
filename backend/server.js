const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Security middleware

app.use(helmet());

// Set a permissive Content-Security-Policy header for Render deployment
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src *; connect-src *");
  next();
});

// CORS - Enable before rate limiting for preflight requests
// Configure CORS. If FRONTEND_URL is provided use it, otherwise allow reflecting origin
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
  origin: FRONTEND_URL ? FRONTEND_URL : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - More lenient for development
// Rate limiting - configurable via env, defaults to lenient dev values
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 1 * 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 1000;
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  skip: (req) => req.method === 'OPTIONS'
});
app.use(limiter);

// Body parser middleware
// Body parser limits can be controlled via env (keep defaults reasonable)
const BODY_PARSER_LIMIT = process.env.BODY_PARSER_LIMIT || '10mb';
app.use(express.json({ limit: BODY_PARSER_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_PARSER_LIMIT }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {/* MongoDB connected */})
  .catch(() => {/* MongoDB connection error */});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/interviews', require('./routes/interviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Serve frontend static build if available (single-server deployment)
const FRONTEND_BUILD_PATH = process.env.FRONTEND_BUILD_PATH || path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_BUILD_PATH)) {
  console.log('✅ Serving frontend static files from', FRONTEND_BUILD_PATH);

  app.use(express.static(FRONTEND_BUILD_PATH));

  // SPA fallback: only handle non-API routes here so API routes still work
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_BUILD_PATH, 'index.html'));
  });
} else {
  console.warn('⚠️ Frontend build not found at', FRONTEND_BUILD_PATH, "— not serving static files. Make sure you've run the frontend build.");

  // 404 handler for API / non-static setups
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);

});