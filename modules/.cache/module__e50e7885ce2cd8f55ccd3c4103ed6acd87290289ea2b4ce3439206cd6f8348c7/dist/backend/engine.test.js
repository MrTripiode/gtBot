"use strict";

var _engine = require("./engine");

describe('NLU Engine', () => {
  test('findMostConfidentPredictionMeanStd', () => {
    const mapSet = n => n.map((x, i) => ({
      confidence: x,
      name: i.toString()
    }));

    const set1 = mapSet([0.8, 0.1, 0.09, 0.08]);
    const set2 = mapSet([0.8, 0.7]);
    const set3 = mapSet([]);
    const set4 = mapSet([0.45, 0.12, 0.11, 0.08, 0.0002]);
    const set5 = mapSet([0.2, 0.12, 0.11, 0.08, 0.0002]);
    const res1 = (0, _engine.findMostConfidentPredictionMeanStd)(set1, 0.8, 4);
    const res2 = (0, _engine.findMostConfidentPredictionMeanStd)(set2, 0.8, 4);
    const res3 = (0, _engine.findMostConfidentPredictionMeanStd)(set3, 0.8, 4);
    const res4 = (0, _engine.findMostConfidentPredictionMeanStd)(set4, 0.8, 4);
    const res4b = (0, _engine.findMostConfidentPredictionMeanStd)(set4, 0.8, 5);
    const res5 = (0, _engine.findMostConfidentPredictionMeanStd)(set5, 0.8, 4);
    const res5b = (0, _engine.findMostConfidentPredictionMeanStd)(set5, 0.8, 2);
    expect(res1.name).toBe('0');
    expect(res2.name).toBe('0');
    expect(res3.name).toBe('none');
    expect(res4.name).toBe('0');
    expect(res4b.name).toBe('none');
    expect(res5.name).toBe('none');
    expect(res5b.name).toBe('0');
  });
});