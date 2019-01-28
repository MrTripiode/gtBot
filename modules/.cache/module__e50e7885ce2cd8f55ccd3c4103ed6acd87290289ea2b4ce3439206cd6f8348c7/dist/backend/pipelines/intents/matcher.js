"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createIntentMatcher = void 0;

var _patternsUtils = require("../../tools/patterns-utils");

const createIntentMatcher = intentName => {
  return pattern => {
    const matcher = new RegExp(`^${(0, _patternsUtils.escapeRegex)(pattern)}$`, 'i');
    return matcher.test(intentName);
  };
};

exports.createIntentMatcher = createIntentMatcher;