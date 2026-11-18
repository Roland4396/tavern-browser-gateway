const assert = require('node:assert/strict');
const test = require('node:test');
const shellFactory = require('./intercept.js');

test('rewrites only private Stream origins into the current app prefix', () => {
  const rewrite = shellFactory().createRewriter('https://tavern.example.invalid', '/ghost');
  assert.equal(
    rewrite('http://127.0.0.1:3002/v1/audio/speech?x=1'),
    'https://tavern.example.invalid/ghost/v1/audio/speech?x=1',
  );
  assert.equal(
    rewrite('http://stream-proxy:3002/chat/completions'),
    'https://tavern.example.invalid/ghost/v1/chat/completions',
  );
  assert.equal(
    rewrite('https://tavern.example.invalid/v1/models'),
    'https://tavern.example.invalid/ghost/v1/models',
  );
});

test('does not rewrite external providers or already scoped requests', () => {
  const rewrite = shellFactory().createRewriter('https://tavern.example.invalid', '/omni');
  assert.equal(
    rewrite('https://api.openai.com/v1/chat/completions'),
    'https://api.openai.com/v1/chat/completions',
  );
  assert.equal(
    rewrite('https://tavern.example.invalid/omni/v1/chat/completions'),
    'https://tavern.example.invalid/omni/v1/chat/completions',
  );
  assert.equal(
    rewrite('http://127.0.0.1:9999/v1/chat/completions'),
    'http://127.0.0.1:9999/v1/chat/completions',
  );
});
