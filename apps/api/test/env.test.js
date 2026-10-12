import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnvironment } from '../src/config/env.js';

test('environment loader applies safe development defaults', () => {
  const environment = loadEnvironment({
    SESSION_SECRET: 'test-session-secret-that-is-long-enough',
  });

  assert.equal(environment.API_PORT, 4000);
  assert.equal(environment.GROQ_MODEL, 'openai/gpt-oss-20b');
  assert.equal(environment.GROQ_TRANSCRIPTION_MODEL, 'whisper-large-v3-turbo');
  assert.equal(environment.GROQ_REQUEST_TIMEOUT_MS, 30_000);
  assert.equal(environment.GROQ_MAX_RETRIES, 1);
  assert.equal(environment.MAX_AUDIO_SIZE_BYTES, 25_000_000);
  assert.equal(environment.MAX_RESUME_SIZE_BYTES, 5_242_880);
});

test('environment loader rejects an invalid API port', () => {
  assert.throws(
    () => loadEnvironment({ API_PORT: '70000' }),
    /Invalid environment configuration/,
  );
});
