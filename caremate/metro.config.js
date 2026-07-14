const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Required for expo-sqlite on web (wa-sqlite.wasm).
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'wasm');

// SharedArrayBuffer requires cross-origin isolation headers on web.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  extraThemes: ['dark'],
});
