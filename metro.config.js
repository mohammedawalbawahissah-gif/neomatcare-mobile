"use strict";

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.cacheVersion = "default-config";

module.exports = config;
