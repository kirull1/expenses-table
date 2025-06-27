const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

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

// Catch-all handler to serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Spreadsheet ID: ${process.env.SPREADSHEET_ID ? 'configured' : 'missing'}`);
  console.log(`Service Account Email: ${process.env.SERVICE_ACCOUNT_EMAIL ? 'configured' : 'missing'}`);
  console.log(`Service Account Private Key: ${process.env.SERVICE_ACCOUNT_PRIVATE_KEY ? 'configured' : 'missing'}`);
}); 