// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web loads the fonts as woff2 — a third of the bytes of the same TTF,
// with the same glyph coverage. Metro does not treat woff2 as an asset
// out of the box, so the extension has to be declared or the require
// resolves to nothing.
config.resolver.assetExts.push('woff2');

module.exports = config;
