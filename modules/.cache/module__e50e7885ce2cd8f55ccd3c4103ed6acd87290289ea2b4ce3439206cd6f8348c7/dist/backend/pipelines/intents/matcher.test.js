"use strict";

var _matcher = require("./matcher");

describe('matches', () => {
  test('Exact match', () => {
    const matches = (0, _matcher.createIntentMatcher)('faq.hello');
    expect(matches('faq.hello')).toBe(true);
    expect(matches('faq.hello2')).toBe(false);
    expect(matches('faq.hell')).toBe(false);
    expect(matches('faq_hello')).toBe(false);
  });
  test('Wildcard ending', () => {
    const matches = (0, _matcher.createIntentMatcher)('faq.hello');
    expect(matches('faq.hell*')).toBe(true);
    expect(matches('faq.h*')).toBe(true);
    expect(matches('faq.q*')).toBe(false);
    expect(matches('faq.hello*')).toBe(false);
    expect(matches('*')).toBe(true);
    expect(matches('faq.faq.h*')).toBe(false);
  });
  test('Wildcard starting', () => {
    const matches = (0, _matcher.createIntentMatcher)('faq.hello');
    expect(matches('*.hello')).toBe(true);
    expect(matches('*aq.hello')).toBe(true);
    expect(matches('*.nope')).toBe(false);
  });
  test('Wildcard both', () => {
    const matches = (0, _matcher.createIntentMatcher)('faq.hello');
    expect(matches('*.*')).toBe(true);
    expect(matches('*aq.hell*')).toBe(true);
    expect(matches('*.nope*')).toBe(false);
  });
  test('Escaping', () => {
    const matches = (0, _matcher.createIntentMatcher)('faq.hello');
    expect(matches('.+')).toBe(false);
  });
});