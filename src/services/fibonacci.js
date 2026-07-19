// Computes the nth Fibonacci number (0-indexed: fib(0) = 0, fib(1) = 1).
// `n` must be a non-negative integer; negative or non-integer input throws a
// RangeError. Uses BigInt and iterative accumulation to stay exact and avoid
// stack growth for large `n`.
function fibonacci(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer');
  }
  if (n === 0) return 0n;
  if (n === 1) return 1n;

  let prev = 0n;
  let curr = 1n;
  for (let i = 2; i <= n; i += 1) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}

module.exports = { fibonacci };
