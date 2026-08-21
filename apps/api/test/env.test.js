import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnvironment } from '../src/config/env.js';

test('environment loader applies safe development defaults', () => {
  const environment = loadEnvironment({
    SESSION_SECRET: 'test-session-secret-that-is-long-enough',
  });

  assert.equal(environment.API_PORT, 4000);
  assert.equal(environment.OPENAI_MODEL, 'gpt-5.4-mini');
  assert.equal(environment.MAX_RESUME_SIZE_BYTES, 5_242_880);
});

test('environment loader rejects an invalid API port', () => {
  assert.throws(
    () => loadEnvironment({ API_PORT: '70000' }),
    /Invalid environment configuration/,
  );
});
