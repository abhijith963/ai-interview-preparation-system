import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';

const createTestApp = () =>
  createApp({ sessionSecret: 'test-session-secret-that-is-long-enough' });

test('GET /api/v1/health returns the foundation status', async () => {
  const response = await request(createTestApp()).get('/api/v1/health').expect(200);

  assert.deepEqual(response.body, {
    data: {
      service: 'ai-interview-api',
      status: 'ok',
      version: '0.1.0',
    },
  });
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('unknown API routes use the stable error envelope', async () => {
  const response = await request(createTestApp())
    .get('/api/v1/not-real')
    .expect(404);

  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
});
