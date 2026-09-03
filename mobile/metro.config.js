const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker imports a .wasm file that Metro doesn't know how to
// bundle as JS by default — `expo export --platform web` fails outright on it
// (not just the dev-server lazy-chunk failure documented in the README).
// Treating .wasm as a binary asset (like a font or image) instead of a source
// file lets Metro resolve it without trying to parse it.
config.resolver.assetExts.push('wasm');

module.exports = config;
