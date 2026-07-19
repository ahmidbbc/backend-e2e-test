const { fibonacci } = require('../src/services/fibonacci');

describe('fibonacci', () => {
  it('returns 0 for n=0', () => {
    expect(fibonacci(0)).toBe(0n);
  });

  it('returns 1 for n=1', () => {
    expect(fibonacci(1)).toBe(1n);
  });

  it('computes small values', () => {
    expect(fibonacci(2)).toBe(1n);
    expect(fibonacci(7)).toBe(13n);
    expect(fibonacci(10)).toBe(55n);
  });

  it('stays exact for large inputs via BigInt', () => {
    expect(fibonacci(100)).toBe(354224848179261915075n);
  });

  it('throws a RangeError for negative n', () => {
    expect(() => fibonacci(-1)).toThrow(RangeError);
  });

  it('throws a RangeError for non-integer n', () => {
    expect(() => fibonacci(3.5)).toThrow(RangeError);
  });
});
