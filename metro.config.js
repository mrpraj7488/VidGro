const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add obfuscation for production builds
if (process.env.NODE_ENV === 'production') {
  const obfuscatorPlugin = require('metro-obfuscator');
  
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      ...config.transformer.minifierConfig,
      // Enable advanced obfuscation
      mangle: {
        toplevel: true,
        eval: true,
        keep_fnames: false,
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn'],
      },
    },
  };

  // Add obfuscator transformer
  config.transformer.babelTransformerPath = require.resolve('metro-obfuscator');
}

module.exports = config;