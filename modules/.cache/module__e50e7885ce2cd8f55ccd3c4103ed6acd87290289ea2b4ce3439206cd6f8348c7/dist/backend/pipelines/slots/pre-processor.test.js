"use strict";

var _typings = require("../../typings");

var _preProcessor = require("./pre-processor");

const AN_ENTITY = 'person';
describe('Preprocessing', () => {
  test('generate training seq', () => {
    const slotDef = [{
      name: 'ME',
      entity: AN_ENTITY
    }, {
      name: 'YOU',
      entity: AN_ENTITY
    }];
    const trainingSeq = (0, _preProcessor.generateTrainingSequence)(`hello my name is [Jacob Jacobson](${slotDef[0].name}) and your name is [Paul](${slotDef[1].name})`, slotDef);
    expect(trainingSeq.cannonical).toEqual('hello my name is Jacob Jacobson and your name is Paul');
    expect(trainingSeq.tokens.filter(t => t.tag != _typings.BIO.OUT).length).toEqual(3);
    expect(trainingSeq.tokens[0].slot).toBeUndefined();
    expect(trainingSeq.tokens[0].matchedEntities).toEqual([]);
    expect(trainingSeq.tokens[0].tag).toEqual(_typings.BIO.OUT);
    expect(trainingSeq.tokens[0].value).toEqual('hello');
    expect(trainingSeq.tokens[4].slot).toEqual(slotDef[0].name);
    expect(trainingSeq.tokens[4].matchedEntities).toEqual([slotDef[0].entity]);
    expect(trainingSeq.tokens[4].tag).toEqual(_typings.BIO.BEGINNING);
    expect(trainingSeq.tokens[4].value).toEqual('Jacob');
    expect(trainingSeq.tokens[5].slot).toEqual(slotDef[0].name);
    expect(trainingSeq.tokens[5].matchedEntities).toEqual([slotDef[0].entity]);
    expect(trainingSeq.tokens[5].tag).toEqual(_typings.BIO.INSIDE);
    expect(trainingSeq.tokens[5].value).toEqual('Jacobson');
  });
  test('generate prediction seq', () => {
    const entities = [{
      name: 'numeral',
      type: 'system',
      meta: {
        start: 26,
        end: 28,
        confidence: 1,
        provider: 'native',
        raw: {},
        source: '70'
      },
      data: {
        value: 70
      }
    }, {
      name: 'amountOfMoney',
      type: 'system',
      meta: {
        start: 26,
        end: 36,
        confidence: 1,
        provider: 'native',
        raw: {},
        source: '70 dollars'
      },
      data: {
        unit: 'dollar',
        value: 70
      }
    }, {
      name: 'email',
      type: 'system',
      meta: {
        start: 51,
        end: 70,
        confidence: 1,
        provider: 'native',
        raw: {},
        source: 'misterhyde@evil.com'
      },
      data: {
        value: 'misterhyde@evil.com'
      }
    }]; // some extra spaces on purpose here

    const testingSeq = (0, _preProcessor.generatePredictionSequence)('Hey can you   please send 70 dollars to  Jekyll at misterhyde@evil.com', 'a name', entities);
    const entityTokens = testingSeq.tokens.filter(t => t.matchedEntities.length);
    expect(entityTokens.length).toEqual(3);
    expect(entityTokens[0].value).toEqual('70');
    expect(entityTokens[0].matchedEntities).toEqual(['numeral', 'amountOfMoney']);
    expect(entityTokens[1].value).toEqual('dollars');
    expect(entityTokens[1].matchedEntities).toEqual(['amountOfMoney']);
    expect(entityTokens[2].value).toEqual('misterhyde@evil.com');
    expect(entityTokens[2].matchedEntities).toEqual(['email']);
    expect(testingSeq.tokens[0].value).toEqual('Hey');
    expect(testingSeq.tokens[0].matchedEntities).toEqual([]);
  });
});