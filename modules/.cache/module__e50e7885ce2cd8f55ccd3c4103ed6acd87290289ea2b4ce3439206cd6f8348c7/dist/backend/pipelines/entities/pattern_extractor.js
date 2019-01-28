"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractListEntities = exports.extractPatternEntities = void 0;

var _lodash = require("lodash");

var _patternsUtils = require("../../tools/patterns-utils");

const extractPatternEntities = (input, entityDefs) => {
  return (0, _lodash.flatMap)(entityDefs, entityDef => {
    try {
      const regex = new RegExp(entityDef.pattern);
      return (0, _patternsUtils.extractPattern)(input, regex).map(res => ({
        name: entityDef.name,
        type: entityDef.type,
        // pattern
        meta: {
          confidence: 1,
          // pattern always has 1 confidence
          provider: 'native',
          source: res.value,
          start: res.sourceIndex,
          end: res.sourceIndex + res.value.length,
          raw: {}
        },
        data: {
          extras: {},
          value: res.value,
          unit: 'string'
        }
      }));
    } catch (error) {
      throw Error(`Pattern of entity ${entityDef.name} is invalid`);
    }
  });
};

exports.extractPatternEntities = extractPatternEntities;

const _extractEntitiesFromOccurence = (input, occurence, entityDef) => {
  const pattern = [occurence.name, ...occurence.synonyms].map(_patternsUtils.escapeRegex).join('|');

  try {
    const regex = new RegExp(pattern, 'i');
    return (0, _patternsUtils.extractPattern)(input, regex).map(extracted => ({
      name: entityDef.name,
      type: 'list',
      meta: {
        confidence: 1,
        // extrated with synonyme as patterns
        provider: 'native',
        source: extracted.value,
        start: extracted.sourceIndex,
        end: extracted.sourceIndex + extracted.value.length,
        raw: {}
      },
      data: {
        extras: {},
        value: occurence.name,
        // cannonical value,
        unit: 'string'
      }
    }));
  } catch (error) {
    throw Error(`Something is wrong with one of ${entityDef.name}'s occurence`);
  }
};

const extractListEntities = (input, entityDefs) => {
  return (0, _lodash.flatMap)(entityDefs, entityDef => {
    return (0, _lodash.flatMap)(entityDef.occurences || [], occurence => {
      return _extractEntitiesFromOccurence(input, occurence, entityDef);
    });
  });
};

exports.extractListEntities = extractListEntities;