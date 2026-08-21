import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADAPTIVE_CONFIG,
  COMPETENCY_CONFIG,
  DIFFICULTY_LEVELS,
  INTERVIEW_SESSION_STATES,
  INTERVIEW_STATE_TRANSITIONS,
  READINESS_CONFIG,
  ROLE_PROFILES,
  SCORING_CONFIG,
} from '../src/index.js';

const sum = (values) => values.reduce((total, value) => total + value, 0);

test('approved scoring weights total one', () => {
  assert.equal(sum(SCORING_CONFIG.dimensions.map(({ weight }) => weight)), 1);
  assert.equal(SCORING_CONFIG.sessionQuestionCount, 10);
  assert.equal(
    SCORING_CONFIG.dimensions.at(-1).label,
    'Professional Certainty',
  );
});

test('adaptive configuration uses the approved three levels and thresholds', () => {
  assert.deepEqual(DIFFICULTY_LEVELS, ['EASY', 'MEDIUM', 'HARD']);
  assert.equal(ADAPTIVE_CONFIG.initialDifficulty, 'MEDIUM');
  assert.equal(ADAPTIVE_CONFIG.evaluationWindow, 2);
  assert.equal(ADAPTIVE_CONFIG.increaseWhenEverySignalIsAtLeast, 80);
  assert.equal(ADAPTIVE_CONFIG.decreaseWhenEverySignalIsBelow, 50);
  assert.equal(sum(Object.values(ADAPTIVE_CONFIG.signalWeights)), 1);
});

test('competency and readiness component weights total one', () => {
  assert.equal(sum(Object.values(COMPETENCY_CONFIG.evidenceWeights)), 1);
  assert.equal(sum(Object.values(READINESS_CONFIG.componentWeights)), 1);
  assert.match(READINESS_CONFIG.disclaimer, /not a probability/i);
});

test('all four role profiles have unique ids and category weights totaling one', () => {
  assert.equal(ROLE_PROFILES.length, 4);
  assert.equal(new Set(ROLE_PROFILES.map(({ id }) => id)).size, 4);

  for (const profile of ROLE_PROFILES) {
    assert.ok(profile.categories.length > 0);
    assert.ok(
      Math.abs(sum(profile.categories.map(({ weight }) => weight)) - 1) <
        Number.EPSILON,
    );
  }
});

test('every declared interview transition points to a declared state', () => {
  for (const state of INTERVIEW_SESSION_STATES) {
    assert.ok(Object.hasOwn(INTERVIEW_STATE_TRANSITIONS, state));
    for (const target of INTERVIEW_STATE_TRANSITIONS[state]) {
      assert.ok(INTERVIEW_SESSION_STATES.includes(target));
    }
  }
});
