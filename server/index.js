const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');

// Load environment variables from .env files
const currentPath = path.join(__dirname, '..');
const basePath = currentPath + '/.env';
const envPathLocal = currentPath + '/.env.local';
const envPathDev = currentPath + '/.env.development';
const envPathDevLocal = currentPath + '/.env.development.local';
const envPathProd = currentPath + '/.env.production';
const envPathProdLocal = currentPath + '/.env.production.local';

// Determine which .env files to load based on environment
let envFiles = [];
if (process.env.NODE_ENV === 'production') {
  // Production environment: .env, .env.production, .env.local, .env.production.local
  envFiles = [
    { path: basePath, required: false },
    { path: envPathProd, required: false },
    { path: envPathLocal, required: false },
    { path: envPathProdLocal, required: false }
  ];
} else {
  // Development environment: .env, .env.development, .env.local, .env.development.local
  envFiles = [
    { path: basePath, required: false },
    { path: envPathDev, required: false },
    { path: envPathLocal, required: false },
    { path: envPathDevLocal, required: false }
  ];
}

// Load all environment variables from the determined files
let loadedFiles = [];
envFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    dotenv.config({ path: file.path });
    loadedFiles.push(file.path);
  } else if (file.required) {
    throw new Error(`Environment file ${file.path} not found but required!`);
  }
});

console.log(`Environment files loaded: ${loadedFiles.join(', ')}`);

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for nginx reverse proxy
app.set('trust proxy', 1);

// Middleware
// Security middleware
app.use(helmet()); // Set secure HTTP headers
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Cache control middleware for static assets
app.use((req, res, next) => {
  // Add cache-busting headers for static assets with hashes in their filenames
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)(\?.*)?$/)) {
    if (req.url.includes('.') && req.url.includes('-') || req.url.includes('.') && req.url.includes('.')) {
      // For files with hashes (containing dots or dashes), set long cache
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // For files without hashes, set no-cache
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
  next();
});

// Cookie parser middleware (required for CSRF)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: process.env.LOGIN_WINDOW_MINUTES * 60 * 1000, // Convert minutes to milliseconds
  max: process.env.MAX_LOGIN_ATTEMPTS, // Limit each IP to MAX_LOGIN_ATTEMPTS requests per window
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// CSRF protection middleware (applied to routes that need it)
const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Note: Static files are served by nginx in production, not by this server

// Google Auth endpoint
app.post('/api/auth/google-token', async (req, res) => {
  try {
    const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
    const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.error('Missing service account credentials:');
      console.error('SERVICE_ACCOUNT_EMAIL:', !!SERVICE_ACCOUNT_EMAIL);
      console.error('SERVICE_ACCOUNT_PRIVATE_KEY:', !!SERVICE_ACCOUNT_PRIVATE_KEY);
      return res.status(500).json({ error: 'Service account credentials not configured' });
    }
    
    const auth = new GoogleAuth({
      credentials: {
        client_email: SERVICE_ACCOUNT_EMAIL,
        private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    res.json({ access_token: token.token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoint with rate limiting
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  // Get credentials from environment variables
  const AUTH_USERNAME = process.env.AUTH_USERNAME;
  const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;
  
  if (!AUTH_USERNAME || !AUTH_PASSWORD_HASH) {
    return res.status(500).json({
      success: false,
      message: 'Authentication not configured. Please check server environment variables.'
    });
  }
  
  // Validate username
  if (username !== AUTH_USERNAME) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
  
  try {
    console.log('Login attempt with username:', username);
    console.log('Expected username:', AUTH_USERNAME);
    console.log('Password length:', password.length);
    console.log('Stored hash format:', AUTH_PASSWORD_HASH.substring(0, 10) + '...');
    
    // Compare password with stored hash
    let bcryptResult = false;
    try {
      bcryptResult = await bcrypt.compare(password, AUTH_PASSWORD_HASH);
      console.log('password:', password);
      console.log('stored hash:', AUTH_PASSWORD_HASH);
      console.log('generated hash with fixed salt:', bcrypt.hashSync(password, '$2a$10$Dn6LgZsW2g3ZHIJ7qTozeO'));
      console.log('bcrypt compare result:', bcryptResult);
    } catch (bcryptError) {
      console.error('bcrypt error:', bcryptError);
    }
    
    console.log('Password match:', bcryptResult);
    
    if (bcryptResult) {
      // Generate JWT token
      const user = { username };
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      
      return res.json({
        success: true,
        message: 'Authentication successful',
        token
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
});

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected route',
    user: req.user
  });
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Environment variables info endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/env-info', (req, res) => {
    const safeEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      SPREADSHEET_ID: process.env.SPREADSHEET_ID,
      SERVICE_ACCOUNT_EMAIL: process.env.SERVICE_ACCOUNT_EMAIL,
      // Не отправляем приватный ключ
      HAS_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.SERVICE_ACCOUNT_PRIVATE_KEY,
      // Список загруженных файлов
      LOADED_ENV_FILES: loadedFiles,
    };
    
    res.json(safeEnvVars);
  });
}

// Note: Catch-all routing is handled by nginx in production
// All non-API routes are served by nginx with SPA fallback to index.html

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Spreadsheet ID: ${process.env.SPREADSHEET_ID ? 'configured' : 'missing'}`);
  console.log(`Service Account Email: ${process.env.SERVICE_ACCOUNT_EMAIL ? 'configured' : 'missing'}`);
  console.log(`Service Account Private Key: ${process.env.SERVICE_ACCOUNT_PRIVATE_KEY ? 'configured' : 'missing'}`);
  console.log(`Auth Username: ${process.env.AUTH_USERNAME ? 'configured' : 'missing'}`);
  console.log(`Auth Password Hash: ${process.env.AUTH_PASSWORD_HASH ? 'configured' : 'missing'}`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'missing'}`);
  console.log(`Rate Limiting: ${process.env.MAX_LOGIN_ATTEMPTS}/${process.env.LOGIN_WINDOW_MINUTES}min`);
}); 