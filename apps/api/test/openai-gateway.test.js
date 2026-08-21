import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AiGatewayError,
  createOpenAiGateway,
} from '../src/modules/interviews/interview.ai.js';
import { defaultQuestion } from './helpers/fake-ai-gateway.js';

const questionContext = {
  difficulty: 'MEDIUM',
  position: 1,
  role: { id: 'backend-developer', label: 'Backend Developer' },
  target: {
    categoryId: 'http-api-design',
    questionType: 'ROLE_DOMAIN',
    resumeClaim: null,
    skillId: 'rest',
  },
};

test('OpenAI gateway uses the configured model, store false, and structured parse output', async () => {
  const calls = [];
  const client = {
    responses: {
      async parse(input) {
        calls.push(input);
        return { output_parsed: defaultQuestion(questionContext) };
      },
    },
  };
  const gateway = createOpenAiGateway({
    client,
    maximumRetries: 1,
    model: 'configured-test-model',
  });

  const result = await gateway.generateQuestion(questionContext);
  assert.equal(result.primarySkillId, 'rest');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, 'configured-test-model');
  assert.equal(calls[0].store, false);
  assert.ok(calls[0].text.format);
  assert.match(calls[0].input[1].content, /<UNTRUSTED_CONTEXT>/);
});

test('OpenAI gateway retries one timeout and returns a later valid response', async () => {
  let calls = 0;
  const client = {
    responses: {
      async parse() {
        calls += 1;
        if (calls === 1) {
          const error = new Error('timed out');
          error.name = 'APIConnectionTimeoutError';
          throw error;
        }
        return { output_parsed: defaultQuestion(questionContext) };
      },
    },
  };
  const gateway = createOpenAiGateway({
    client,
    maximumRetries: 1,
    model: 'configured-test-model',
  });

  await gateway.generateQuestion(questionContext);
  assert.equal(calls, 2);
});

test('OpenAI gateway rejects malformed structured output after the bounded retry', async () => {
  let calls = 0;
  const gateway = createOpenAiGateway({
    client: {
      responses: {
        async parse() {
          calls += 1;
          return { output_parsed: { invalid: true } };
        },
      },
    },
    maximumRetries: 1,
    model: 'configured-test-model',
  });

  await assert.rejects(
    gateway.generateQuestion(questionContext),
    (error) => error instanceof AiGatewayError && error.code === 'AI_OUTPUT_INVALID',
  );
  assert.equal(calls, 2);
});

test('OpenAI gateway maps rate limits and provider failures to safe retryable codes', async () => {
  for (const [providerError, expectedCode] of [
    [Object.assign(new Error('limited'), { status: 429 }), 'AI_RATE_LIMITED'],
    [Object.assign(new Error('unavailable'), { status: 503 }), 'AI_PROVIDER_UNAVAILABLE'],
  ]) {
    const gateway = createOpenAiGateway({
      client: {
        responses: {
          async parse() {
            throw providerError;
          },
        },
      },
      maximumRetries: 0,
      model: 'configured-test-model',
    });
    await assert.rejects(
      gateway.generateQuestion(questionContext),
      (error) => error instanceof AiGatewayError && error.code === expectedCode,
    );
  }
});
