import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../src/lib/app-error.js';
import { validateEvaluation } from '../src/modules/interviews/interview.policy.js';
import { defaultEvaluation } from './helpers/fake-ai-gateway.js';

const context = {
  question: {
    resumeClaim: null,
    secondarySkillIds: [],
  },
};

test('Professional Certainty validation rejects psychological or honesty inferences', () => {
  const output = defaultEvaluation(context);
  output.dimensionEvidence.professionalCertainty =
    'The wording proves strong psychological confidence and honesty.';

  assert.throws(
    () => validateEvaluation({ context, output }),
    (error) => error instanceof AppError && error.code === 'AI_OUTPUT_INVALID',
  );
});

test('role-only evaluations cannot invent resume consistency observations', () => {
  const output = defaultEvaluation(context);
  output.resumeConsistency = {
    claimId: 'invented-claim',
    explanation: 'An invented resume observation.',
    status: 'INCONSISTENT',
  };

  assert.throws(
    () => validateEvaluation({ context, output }),
    (error) => error instanceof AppError && error.code === 'AI_OUTPUT_INVALID',
  );
});
