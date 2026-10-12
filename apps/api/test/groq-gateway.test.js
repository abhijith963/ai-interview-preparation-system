import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGroqAiGateway,
  GroqGatewayError,
} from '../src/modules/interviews/groq.ai.js';
import { evaluationOutputSchema } from '../src/modules/interviews/interview.ai-schemas.js';

const createGateway = ({ complete = async () => ({ choices: [] }), transcribe }) =>
  createGroqAiGateway({
    client: {
      audio: { transcriptions: { create: transcribe } },
      chat: { completions: { create: complete } },
    },
    maximumRetries: 0,
    model: 'llama-test',
    transcriptionModel: 'whisper-test',
  });

test('Groq gateway uploads browser audio with the configured transcription model', async () => {
  const calls = [];
  const gateway = createGateway({ transcribe: async (input) => {
    calls.push(input);
    return { text: '  A server-side transcript.  ' };
  } });

  const transcript = await gateway.transcribeAudio({
    buffer: Buffer.from('recorded audio'),
    filename: 'answer.webm',
    mimeType: 'audio/webm',
  });

  assert.equal(transcript, 'A server-side transcript.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, 'whisper-test');
  assert.equal(calls[0].response_format, 'json');
  assert.equal(calls[0].file.name, 'answer.webm');
  assert.equal(calls[0].file.type, 'audio/webm');
});

test('Groq gateway rejects a transcription response without detected speech', async () => {
  const gateway = createGateway({ transcribe: async () => ({ text: '   ' }) });

  await assert.rejects(
    gateway.transcribeAudio({
      buffer: Buffer.from('silence'),
      filename: 'answer.webm',
      mimeType: 'audio/webm',
    }),
    (error) =>
      error instanceof GroqGatewayError && error.code === 'AI_OUTPUT_INVALID',
  );
});

test('Groq gateway sends strict JSON-schema requests and validates the response', async () => {
  const calls = [];
  const gateway = createGateway({
    complete: async (input) => {
      calls.push(input);
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                difficulty: 'MEDIUM',
                primaryCategoryId: 'backend',
                primarySkillId: 'api-design',
                questionText: 'How would you design a reliable and observable API boundary?',
                questionType: 'ROLE_DOMAIN',
                resumeClaimId: null,
                rubric: {
                  acceptableAlternatives: [],
                  commonMistakes: [],
                  expectedConcepts: ['Input validation'],
                },
                secondarySkillIds: [],
              }),
            },
          },
        ],
      };
    },
    transcribe: async () => ({ text: 'unused' }),
  });

  const question = await gateway.generateQuestion({ role: { id: 'backend-developer' } });

  assert.equal(question.primarySkillId, 'api-design');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, 'llama-test');
  assert.equal(calls[0].temperature, 0);
  assert.equal(calls[0].response_format.type, 'json_schema');
  assert.equal(calls[0].response_format.json_schema.strict, true);
});

test('Groq gateway maps malformed structured output to a safe error code', async () => {
  const gateway = createGateway({
    complete: async () => ({ choices: [{ message: { content: '{not-json' } }] }),
    transcribe: async () => ({ text: 'unused' }),
  });

  await assert.rejects(
    gateway.generateQuestion({ role: { id: 'backend-developer' } }),
    (error) => error instanceof GroqGatewayError && error.code === 'AI_OUTPUT_INVALID',
  );
});

test('the evaluation contract rejects a provider refusal to score a non-empty answer', () => {
  const evaluation = {
    dimensionEvidence: {
      communicationClarity: 'The answer is too brief to demonstrate clear communication.',
      logicalStructure: 'The response does not provide a structured explanation.',
      professionalCertainty: 'The response is tentative and lacks a concrete explanation.',
      responseRelevance: 'The response does not address the displayed technical question.',
      technicalAccuracy: 'No verifiable technical explanation was provided.',
    },
    dimensionScores: {
      communicationClarity: 0,
      logicalStructure: 0,
      professionalCertainty: 0,
      responseRelevance: 0,
      technicalAccuracy: 0,
    },
    improvementAdvice: ['Explain one relevant technical mechanism.'],
    missingOrIncorrectPoints: ['The answer does not provide technical evidence.'],
    quality: {
      answerWasBlank: false,
      answerWasUnscorable: true,
      uncertaintyReason: 'The answer is too vague to score.',
    },
    resumeConsistency: {
      claimId: null,
      explanation: null,
      status: 'NOT_APPLICABLE',
    },
    skillEvidence: {
      demonstratedSecondarySkillIds: [],
      primarySkillDemonstrated: false,
    },
    strengths: [],
  };

  assert.equal(evaluationOutputSchema.safeParse(evaluation).success, false);
});
