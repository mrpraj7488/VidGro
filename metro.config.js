const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable web-specific resolution for Android-only app
config.resolver.platforms = ['android', 'ios', 'native'];
config.resolver.disableNativeComponentResolutionForWeb = true;

// Exclude web platform from resolver
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add platform-specific extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'android.js', 'android.ts', 'android.tsx'];

module.exports = config;