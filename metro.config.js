const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration for import.meta handling
config.resolver.alias = {
  'crypto': 'react-native-crypto',
  'stream': 'readable-stream',
  'buffer': '@craftzdog/react-native-buffer',
  // Add polyfills for Node.js modules
  'util': 'util',
  'url': 'react-native-url-polyfill',
  'querystring': 'querystring-es3',
};

// Enhanced transformer configuration
config.transformer.getTransformOptions = async () => ({
  transform: {
    // Enable experimental import support for import.meta handling
    experimentalImportSupport: true,
    // Inline requires to prevent module loading issues
    inlineRequires: true,
    // Enable hermetic modules for better isolation
    hermetic: false,
  },
});

// Enhanced resolver configuration
config.resolver.platforms = ['ios', 'android', 'web'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs', 'ts', 'tsx'];
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];

// Add support for ES modules and CommonJS interop
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.enableGlobalPackages = true;

// Enhanced transformer for better module handling
config.transformer.minifierConfig = {
  // Preserve import.meta transformations
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Use the default Expo babel transformer (no need to specify custom path)
// config.transformer.babelTransformerPath is handled by Expo automatically

module.exports = config;