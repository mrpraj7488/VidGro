const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced obfuscation for production builds
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_OBFUSCATION === 'true') {
  console.log('🔒 Enabling production obfuscation...');
  
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      ...config.transformer.minifierConfig,
      // Enhanced obfuscation settings for security
      mangle: {
        toplevel: true,
        eval: true,
        keep_fnames: false,
        properties: {
          regex: /^_/, // Mangle properties starting with underscore
        },
        reserved: ['require', 'exports', 'module'], // Keep these for compatibility
      },
      compress: {
        // Remove debugging code
        drop_console: true,
        drop_debugger: true,
        pure_funcs: [
          'console.log', 
          'console.warn', 
          'console.info', 
          'console.debug',
          'console.trace'
        ],
        
        // Code optimization and obfuscation
        dead_code: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        if_return: true,
        join_vars: true,
        cascade: true,
        side_effects: false,
        
        // Advanced obfuscation
        sequences: true,
        properties: true,
        comparisons: true,
        inline: true,
        reduce_vars: true,
        collapse_vars: true,
        
        // Security-focused options
        keep_infinity: false,
        reduce_funcs: true,
        unsafe: false, // Keep safe for React Native
        unsafe_comps: false,
        unsafe_math: false,
        unsafe_proto: false,
      },
      output: {
        comments: false,
        beautify: false,
        ascii_only: true, // Ensure compatibility
        semicolons: true,
        preserve_line: false,
        
        // Make code harder to read
        indent_level: 0,
        max_line_len: false,
      },
      
      // Additional security options
      sourceMap: false, // Don't generate source maps in production
      keep_classnames: false,
      keep_fnames: false,
    },
  };

  // Additional transformer options for security
  config.transformer.enableBabelRCLookup = false;
  config.transformer.enableBabelRuntime = false;
  
  console.log('🔒 Production obfuscation configured');
} else {
  console.log('📱 Development mode - obfuscation disabled');
}

// Security-focused resolver configuration
config.resolver = {
  ...config.resolver,
  // Prevent access to sensitive files
  blacklistRE: /\.(env|key|pem|p12|keystore)$/,
  
  // Asset resolution security
  assetExts: [
    ...config.resolver.assetExts,
    // Remove potentially dangerous extensions
  ].filter(ext => !['exe', 'bat', 'sh', 'ps1'].includes(ext)),
};

// Watchman configuration for security
config.watchFolders = [
  ...config.watchFolders || [],
  // Only watch necessary folders
];

// Metro server configuration
config.server = {
  ...config.server,
  // Security headers for development server
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      return middleware(req, res, next);
    };
  },
};

module.exports = config;