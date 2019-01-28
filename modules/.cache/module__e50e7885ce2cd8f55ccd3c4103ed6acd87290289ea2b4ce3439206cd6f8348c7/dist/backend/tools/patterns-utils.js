"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractPattern = exports.escapeRegex = void 0;
const ESCAPED_CHARS = /[.+?^${}()|[\]\\]/g;
const WILDCARD = /\*/g;

const escapeRegex = pattern => {
  return pattern.replace(ESCAPED_CHARS, '\\$&').replace(WILDCARD, '.+?');
}; // Padding is necessary due to the recursive nature of this function.
// Every found pattern is removed from the candidate, therefor the length of the extracted value (padding) is needed to compute sourceIndex of future extractions


exports.escapeRegex = escapeRegex;

const extractPattern = (candidate, pattern, extracted = [], padding = 0) => {
  const res = pattern.exec(candidate);
  if (!res) return extracted;
  const value = res[0];
  const nextPadding = padding + value.length;
  const nextCandidate = candidate.slice(0, res.index) + candidate.slice(res.index + value.length);
  extracted.push({
    value,
    sourceIndex: res.index + padding
  });
  return extractPattern(nextCandidate, pattern, extracted, nextPadding);
};

exports.extractPattern = extractPattern;