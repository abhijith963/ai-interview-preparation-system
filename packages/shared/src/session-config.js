export const INTERVIEW_SESSION_STATES = Object.freeze([
  'CREATED',
  'GENERATING_QUESTION',
  'AWAITING_ANSWER',
  'EVALUATING_ANSWER',
  'ERROR',
  'COMPLETED',
  'ENDED_EARLY',
]);

export const TERMINAL_INTERVIEW_STATES = Object.freeze([
  'COMPLETED',
  'ENDED_EARLY',
]);

export const INTERVIEW_STATE_TRANSITIONS = Object.freeze({
  CREATED: Object.freeze(['GENERATING_QUESTION', 'ENDED_EARLY']),
  GENERATING_QUESTION: Object.freeze(['AWAITING_ANSWER', 'ERROR']),
  AWAITING_ANSWER: Object.freeze(['EVALUATING_ANSWER', 'ENDED_EARLY']),
  EVALUATING_ANSWER: Object.freeze([
    'GENERATING_QUESTION',
    'COMPLETED',
    'ERROR',
  ]),
  ERROR: Object.freeze([
    'GENERATING_QUESTION',
    'EVALUATING_ANSWER',
    'ENDED_EARLY',
  ]),
  COMPLETED: Object.freeze([]),
  ENDED_EARLY: Object.freeze([]),
});
