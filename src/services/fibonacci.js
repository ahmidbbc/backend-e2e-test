// Computes the n-th Fibonacci number for an integer n >= 0 (fib(0) = 0,
// fib(1) = 1). Throws a RangeError if n is not a non-negative integer. Uses
// BigInt and iteration so the result stays exact for large n.
function fibonacci(n) {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer');
  }

  let prev = 0n;
  let curr = 1n;
  for (let i = 0; i < n; i += 1) {
    [prev, curr] = [curr, prev + curr];
  }
  return prev;
}

module.exports = { fibonacci };
