require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// Security middleware
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

const checkAllowedOrigin = require('./checkAllowedOrigin');

// Configure CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({ 
      error: 'Too many login attempts, please try again later',
      status: 'rate_limited',
      window: '15 minutes'
    });
  }
});

const userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.user_id || req.ip,
  skip: (req) => !req.body.user_id
});

const bruteForceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many failed attempts from this IP. Try again in an hour or contact support.',
      status: 'account_locked'
    });
  },
  skip: async (req) => {
    if (req.path !== '/aapi/auth/login' || req.method !== 'POST') return true;
    return false;
  }
});

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 10 : 5,
  queueLimit: process.env.NODE_ENV === 'production' ? 100 : 0
});

pool.on('connection', (connection) => {
  console.log(' connection established');
});

pool.on('error', (err) => {
  console.error('MySQL pool error:', err);
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '20m';
const COOKIE_MAX_AGE = 20 * 60 * 1000;

// CSRF
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,  
    sameSite: 'strict'
  }
});

// headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CSRF token
app.get('/aapi/auth/csrf-token', checkAllowedOrigin, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Authentication
async function authenticateToken(req, res, next) {
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const [rows] = await pool.execute(
      'SELECT UserID FROM users WHERE UserID = ? AND IsActive = 1',
      [decoded.user_id]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or revoked token' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// action limiter
const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
  message: 'Too many sensitive actions from this IP'
});

// proxy when behind Nginx
app.set('trust proxy', true);

// pswd strength checker
function isStrongPassword(password) {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return strongRegex.test(password);
}

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

module.exports = {
  app,
  pool,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_MAX_AGE,
  csrfProtection,
  authenticateToken,
  authLimiter,
  bruteForceLimiter,
  userBasedLimiter,
  sensitiveActionLimiter,
  isStrongPassword,
  hashPassword,
  checkAllowedOrigin
};