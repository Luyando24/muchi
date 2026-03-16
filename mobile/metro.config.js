const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Optimization for pnpm and web stability
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs"];

module.exports = withNativeWind(config, { input: "./global.css" });
