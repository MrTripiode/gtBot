"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generatePredictionSequence = exports.generateTrainingSequence = void 0;

var _typings = require("../../typings");

const SLOTS_REGEX = /\[(.+?)\]\(([\w_\.-]+)\)/gi; // TODO replace this for appropriate tokenizer

const _tokenize = input => {
  return input.split(' ').filter(w => w.length);
};

const _makeToken = (value, matchedEntities, start, tag = '', slot = '') => {
  const token = {
    value,
    matchedEntities,
    start,
    end: start + value.length
  };

  if (tag) {
    token.tag = tag;
  }

  if (slot) {
    token.slot = slot;
  }

  return token;
}; // TODO use the same algorithm as in the prediction sequence


const _generateTrainingTokens = (input, start, slot = '', slotDefinitions = []) => {
  const matchedEntities = slotDefinitions.filter(slotDef => slot && slotDef.name === slot).map(slotDef => slotDef.entity);
  return _tokenize(input).map((t, idx) => {
    let tag = _typings.BIO.OUT;

    if (slot) {
      tag = idx === 0 ? _typings.BIO.BEGINNING : _typings.BIO.INSIDE;
    }

    const token = _makeToken(t, matchedEntities, start, tag, slot);

    start += t.length + 1; // 1 is the space char, replace this by what was done in the prediction sequence

    return token;
  });
};

const generateTrainingSequence = (input, slotDefinitions, intentName = '') => {
  let matches;
  let start = 0;
  let tokens = [];

  do {
    matches = SLOTS_REGEX.exec(input);

    if (matches) {
      const sub = input.substr(start, matches.index - start - 1);
      tokens = [...tokens, ..._generateTrainingTokens(sub, start), ..._generateTrainingTokens(matches[1], start + matches.index, matches[2], slotDefinitions)];
      start = matches.index + matches[0].length;
    }
  } while (matches);

  if (start !== input.length) {
    const lastingPart = input.substr(start, input.length - start);
    tokens = [...tokens, ..._generateTrainingTokens(lastingPart, start)];
  }

  return {
    intent: intentName,
    cannonical: tokens.map(t => t.value).join(' '),
    tokens
  };
};

exports.generateTrainingSequence = generateTrainingSequence;

const generatePredictionSequence = (input, intentName, entitites) => {
  const cannonical = input; // we generate a copy here since input is mutating

  let currentIdx = 0;

  const tokens = _tokenize(input).map(value => {
    const inputIdx = input.indexOf(value);
    currentIdx += inputIdx; // in case of tokenization uses more than one char i.e words separated with multiple spaces

    input = input.slice(inputIdx + value.length);
    const matchedEntities = entitites.filter(e => e.meta.start <= currentIdx && e.meta.end >= currentIdx + value.length).map(e => e.name);

    const token = _makeToken(value, matchedEntities, currentIdx);

    currentIdx = token.end; // move cursor to end of token in original input

    return token;
  });

  return {
    intent: intentName,
    cannonical,
    tokens
  };
};

exports.generatePredictionSequence = generatePredictionSequence;