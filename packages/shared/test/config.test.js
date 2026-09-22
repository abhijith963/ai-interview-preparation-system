import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADAPTIVE_CONFIG,
  AVAILABLE_INTERVIEW_MODES,
  COMPETENCY_CONFIG,
  DEFAULT_INTERVIEW_MODE,
  DIFFICULTY_LEVELS,
  INTERVIEW_MODES,
  INTERVIEW_SESSION_STATES,
  INTERVIEW_STATE_TRANSITIONS,
  READINESS_CONFIG,
  ROLE_PROFILES,
  SCORE_FAMILIES,
  SCORING_CONFIG,
  computeVoiceMetrics,
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

test('interview modes reserve later media and live paths without changing the text default', () => {
  assert.deepEqual(INTERVIEW_MODES, ['TEXT', 'VOICE', 'VIDEO', 'LIVE']);
  assert.deepEqual(AVAILABLE_INTERVIEW_MODES, ['TEXT', 'VOICE']);
  assert.equal(DEFAULT_INTERVIEW_MODE, 'TEXT');
  assert.equal(SCORE_FAMILIES.technical.feedsReadiness, true);
  assert.equal(SCORE_FAMILIES.communication.feedsReadiness, false);
  assert.equal(SCORE_FAMILIES.behaviour.feedsReadiness, false);
});

test('voice metrics count pace and fillers without becoming a technical score', () => {
  const metrics = computeVoiceMetrics({
    durationMs: 60_000,
    transcript: 'Um I would like, you know, validate the request then return an error.',
  });
  assert.equal(metrics.wordCount, 13);
  assert.equal(metrics.speakingPaceWpm, 13);
  assert.equal(metrics.fillerCount, 3);
  assert.equal(metrics.fillerRatePerMinute, 3);
});
