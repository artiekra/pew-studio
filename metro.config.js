const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("json");
config.resolver.assetExts.push("lua");
config.resolver.assetExts.push("html");
config.resolver.assetExts.push("wasm");
config.resolver.assetExts.push("bin");

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
