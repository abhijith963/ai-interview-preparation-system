import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateAnswerScore,
  calculatePerformanceSignal,
  determineNextDifficulty,
} from '../src/modules/interviews/interview.calculations.js';

const evaluatedItem = (signal, skillId = 'rest') => ({
  evaluation: {
    performanceSignal: signal,
    quality: { answerWasBlank: false, answerWasUnscorable: false },
  },
  primarySkillId: skillId,
});

test('weighted answer score and performance signal are backend deterministic', () => {
  const answerScore = calculateAnswerScore({
    communicationClarity: 2,
    logicalStructure: 3,
    professionalCertainty: 1,
    responseRelevance: 4,
    technicalAccuracy: 5,
  });
  assert.equal(answerScore, 72);
  assert.equal(calculatePerformanceSignal({ answerScore, technicalAccuracy: 5 }), 92);
});

test('adaptive difficulty increases one level after two high signals', () => {
  const result = determineNextDifficulty({
    currentDifficulty: 'MEDIUM',
    evaluatedItems: [evaluatedItem(85), evaluatedItem(90)],
    primarySkillId: 'rest',
  });
  assert.equal(result.decision, 'INCREASE');
  assert.equal(result.to, 'HARD');
  assert.deepEqual(result.windowSignals, [85, 90]);
});

test('adaptive difficulty holds for a mixed or incomplete window', () => {
  const mixed = determineNextDifficulty({
    currentDifficulty: 'MEDIUM',
    evaluatedItems: [evaluatedItem(85), evaluatedItem(65)],
    primarySkillId: 'rest',
  });
  assert.equal(mixed.decision, 'HOLD');
  assert.equal(mixed.to, 'MEDIUM');

  const incomplete = determineNextDifficulty({
    currentDifficulty: 'MEDIUM',
    evaluatedItems: [evaluatedItem(90)],
    primarySkillId: 'rest',
  });
  assert.equal(incomplete.decision, 'HOLD');
});

test('adaptive difficulty decreases one level after two low signals', () => {
  const result = determineNextDifficulty({
    currentDifficulty: 'MEDIUM',
    evaluatedItems: [evaluatedItem(30), evaluatedItem(49)],
    primarySkillId: 'rest',
  });
  assert.equal(result.decision, 'DECREASE');
  assert.equal(result.to, 'EASY');
});
