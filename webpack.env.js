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
    prev[`process.env.${next}`] = JSON.stringify(fileEnv[next]);
    return prev;
  }, {});
  
  return {
    plugins: [
      new webpack.DefinePlugin(envKeys)
    ]
  };
}; 