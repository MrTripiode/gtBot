"use strict";

var _pattern_extractor = require("./pattern_extractor");

describe('Custom entity extraction', () => {
  test('Extract pattern entitites', () => {
    const pattern = 'lol';
    const entityDef = {
      id: '_',
      name: 'Fun',
      type: 'pattern',
      pattern
    };
    const userInput = 'lollolppplol hello haha';
    const entities = (0, _pattern_extractor.extractPatternEntities)(userInput, [entityDef]);
    expect(entities.length).toEqual(3);
    expect(entities[0].name).toEqual(entityDef.name);
    expect(entities[0].meta.start).toEqual(0);
    expect(entities[0].meta.end).toEqual(3);
    expect(entities[0].data.value).toEqual(pattern);
    expect(entities[1].name).toEqual(entityDef.name);
    expect(entities[1].meta.start).toEqual(3);
    expect(entities[1].meta.end).toEqual(6);
    expect(entities[1].data.value).toEqual(pattern);
    expect(entities[2].name).toEqual(entityDef.name);
    expect(entities[2].meta.start).toEqual(9);
    expect(entities[2].meta.end).toEqual(12);
    expect(entities[2].data.value).toEqual(pattern);
  });
  test('Extract list entitites', () => {
    const entityDef = {
      id: '_',
      name: 'Fun',
      type: 'list',
      occurences: [{
        name: 'lol',
        synonyms: ['loll', 'haha', 'LMAO']
      }]
    };
    const userInput = 'loLpppHahA so funny lmao!!!';
    const entities = (0, _pattern_extractor.extractListEntities)(userInput, [entityDef]);
    expect(entities.length).toEqual(3);
    expect(entities[0].name).toEqual(entityDef.name);
    expect(entities[0].meta.start).toEqual(0);
    expect(entities[0].meta.end).toEqual(3);
    expect(entities[0].meta.source).toEqual('loL');
    expect(entities[0].data.value).toEqual(entityDef.occurences[0].name);
    expect(entities[1].name).toEqual(entityDef.name);
    expect(entities[1].meta.start).toEqual(6);
    expect(entities[1].meta.end).toEqual(10);
    expect(entities[1].meta.source).toEqual('HahA');
    expect(entities[1].data.value).toEqual(entityDef.occurences[0].name);
    expect(entities[2].name).toEqual(entityDef.name);
    expect(entities[2].meta.start).toEqual(20);
    expect(entities[2].meta.end).toEqual(24);
    expect(entities[2].meta.source).toEqual('lmao');
    expect(entities[2].data.value).toEqual(entityDef.occurences[0].name);
  });
});