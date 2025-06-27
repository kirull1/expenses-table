const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

module.exports = function() {
  // Get the root path
  const currentPath = path.join(__dirname);
  
  // Create the fallback path (the development .env)
  const basePath = currentPath + '/.env';
  const envPath = basePath + '.' + (process.env.NODE_ENV || 'development');
  
  // Check if the file exists, otherwise fall back to the production .env
  const finalPath = fs.existsSync(envPath) ? envPath : basePath;
  
  // Set the path parameter in the dotenv config
  const fileEnv = dotenv.config({ path: finalPath }).parsed || {};
  
  // Reduce it to an object
  const envKeys = Object.keys(fileEnv).reduce((prev, next) => {
    // Special handling for the private key to preserve newlines
    if (next === 'SERVICE_ACCOUNT_PRIVATE_KEY') {
      prev[`process.env.${next}`] = JSON.stringify(fileEnv[next].replace(/\\n/g, '\\n'));
    } else {
      prev[`process.env.${next}`] = JSON.stringify(fileEnv[next]);
      // Also add as VITE_ prefix for compatibility
      prev[`import.meta.env.VITE_${next}`] = JSON.stringify(fileEnv[next]);
    }
    return prev;
  }, {});
  
  return {
    plugins: [
      new webpack.DefinePlugin({
        ...envKeys,
        'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV || 'development'),
        'import.meta.env.DEV': process.env.NODE_ENV !== 'production',
        'import.meta.env.PROD': process.env.NODE_ENV === 'production',
      })
    ]
  };
}; 