const fs = require('fs');
const path = require('path');

describe('test_hello.txt', () => {
  it('contains a hello() function', () => {
    const content = fs.readFileSync(path.join(__dirname, '../test_hello.txt'), 'utf8');
    expect(content).toMatch(/function hello\(\)/);
  });
});
