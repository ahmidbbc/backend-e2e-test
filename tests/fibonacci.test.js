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
    expect(fibonacci(3)).toBe(2n);
    expect(fibonacci(10)).toBe(55n);
  });

  it('stays exact for large inputs via BigInt', () => {
    expect(fibonacci(100)).toBe(354224848179261915075n);
  });

  it('throws on negative input', () => {
    expect(() => fibonacci(-1)).toThrow(RangeError);
  });

  it('throws on a non-integer input', () => {
    expect(() => fibonacci(3.5)).toThrow(RangeError);
  });

  it('throws on a non-number input', () => {
    expect(() => fibonacci('5')).toThrow(RangeError);
  });
});
