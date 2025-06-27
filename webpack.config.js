const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from .env files
const currentPath = path.join(__dirname);
const basePath = currentPath + '/.env';
const envPathLocal = currentPath + '/.env.local';
const envPathDev = currentPath + '/.env.development';
const envPathDevLocal = currentPath + '/.env.development.local';
const envPathProd = currentPath + '/.env.production';
const envPathProdLocal = currentPath + '/.env.production.local';

// Determine which .env files to load based on environment
let envFiles = [];
if (process.env.NODE_ENV === 'production') {
  // Production environment: .env, .env.production, .env.local (if exists), .env.production.local (if exists)
  envFiles = [
    { path: basePath, required: false },
    { path: envPathProd, required: false },
    { path: envPathLocal, required: false },
    { path: envPathProdLocal, required: false }
  ];
} else {
  // Development environment: .env, .env.development, .env.local (if exists), .env.development.local (if exists)
  envFiles = [
    { path: basePath, required: false },
    { path: envPathDev, required: false },
    { path: envPathLocal, required: false },
    { path: envPathDevLocal, required: false }
  ];
}

// Load all environment variables from the determined files
const envVars = {};
let loadedFiles = [];

envFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    const fileEnv = dotenv.config({ path: file.path }).parsed || {};
    Object.keys(fileEnv).forEach(key => {
      envVars[key] = fileEnv[key];
    });
    loadedFiles.push(file.path);
    console.log(`Loaded env file: ${file.path}`);
    console.log(`Variables in ${file.path}:`, Object.keys(fileEnv));
  } else if (file.required) {
    throw new Error(`Environment file ${file.path} not found but required!`);
  }
});

// Create environment variables to inject into the app
const envKeys = Object.keys(envVars).reduce((prev, next) => {
  // Add environment variables
  prev[`process.env.${next}`] = JSON.stringify(envVars[next]);
  return prev;
}, {});

// Add NODE_ENV
envKeys['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');

console.log(`Environment variables loaded from: ${loadedFiles.join(', ')}`);
console.log('Environment variables loaded:', Object.keys(envKeys).map(key => key.replace('process.env.', '')));

// For debugging
console.log('SPREADSHEET_ID value:', envVars.SPREADSHEET_ID);

const isProduction = process.env.NODE_ENV === 'production';

// Custom plugin to inject process polyfill
class ProcessPolyfillPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ProcessPolyfillPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ProcessPolyfillPlugin',
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          const polyfill = `
            // Process polyfill
            window.process = window.process || {};
            window.process.env = window.process.env || {};
          `;
          
          // Inject polyfill at the beginning of each JS file
          Object.keys(assets).forEach(filename => {
            if (filename.endsWith('.js')) {
              const asset = assets[filename];
              const source = asset.source();
              const newSource = polyfill + source;
              compilation.updateAsset(filename, new webpack.sources.RawSource(newSource));
            }
          });
        }
      );
    });
  }
}

// Custom plugin to replace environment variables in HTML
class ReplaceHtmlEnvPlugin {
  constructor(env) {
    this.env = env;
  }

  apply(compiler) {
    // Use HtmlWebpackPlugin hooks instead
    const HtmlWebpackPlugin = require('html-webpack-plugin');
    
    compiler.hooks.compilation.tap('ReplaceHtmlEnvPlugin', (compilation) => {
      // Static Plugin interface |compilation |HOOK NAME | register listener 
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'ReplaceHtmlEnvPlugin', // <-- Set a meaningful name here for stacktraces
        (data, cb) => {
          // Replace environment variables in HTML
          Object.keys(this.env).forEach(key => {
            const placeholder = `%${key}%`;
            const value = this.env[key] || '';
            data.html = data.html.replace(new RegExp(placeholder, 'g'), value);
          });
          
          // Tell webpack to move on
          cb(null, data);
        }
      );
    });
  }
}

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './src/main.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash].js',
    chunkFilename: 'assets/[name].[contenthash].js',
    clean: true,
    publicPath: '/'
  },
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    host: '0.0.0.0',
    port: 3000,
    hot: true,
    historyApiFallback: true,
    client: {
      overlay: false,
    },
    watchFiles: {
      paths: ['src/**/*', 'public/**/*'],
      options: {
        usePolling: true,
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:4000',
        secure: false,
        changeOrigin: true
      }
    ]
  },
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      name: false,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true,
        },
      },
    },
    runtimeChunk: 'single',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }]
            ],
            sourceType: 'unambiguous'
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name].[hash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash][ext]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "path": false,
      "fs": false,
      "os": false,
      "util": false
    }
  },
  plugins: [
    // Custom process polyfill plugin
    new ProcessPolyfillPlugin(),
    
    // Define global process.env
    new webpack.DefinePlugin({
      ...envKeys,
      // Ensure these are always available
      'process.env': JSON.stringify({}),
      'process.env.SPREADSHEET_ID': JSON.stringify(envVars.SPREADSHEET_ID || ''),
      'process.env.SERVICE_ACCOUNT_EMAIL': JSON.stringify(envVars.SERVICE_ACCOUNT_EMAIL || '')
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      favicon: './public/vite.svg', // Using vite.svg as favicon
      inject: true,
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false
    }),
    // Custom plugin to replace environment variables in HTML
    new ReplaceHtmlEnvPlugin({
      SPREADSHEET_ID: envVars.SPREADSHEET_ID || '',
      SERVICE_ACCOUNT_EMAIL: envVars.SERVICE_ACCOUNT_EMAIL || ''
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'public', 
          to: '', 
          globOptions: {
            ignore: ['**/service-worker.js']
          }
        }
      ],
    })
  ].concat(isProduction ? [
    new MiniCssExtractPlugin({
      filename: 'assets/[name].[contenthash].css',
      chunkFilename: 'assets/[name].[contenthash].css',
    }),
    new InjectManifest({
      swSrc: './public/service-worker.js',
      swDest: 'service-worker.js',
    })
  ] : [])
}; 