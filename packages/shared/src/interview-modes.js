export const INTERVIEW_MODES = Object.freeze(['TEXT', 'VOICE', 'VIDEO', 'LIVE']);

export const AVAILABLE_INTERVIEW_MODES = Object.freeze(['TEXT', 'VOICE']);

export const DEFAULT_INTERVIEW_MODE = 'TEXT';

export const ANSWER_SOURCES = Object.freeze(['TYPED', 'VOICE_TRANSCRIPT']);

export const SCORE_FAMILIES = Object.freeze({
  technical: Object.freeze({
    id: 'technical',
    label: 'Technical / content',
    feedsReadiness: true,
    description:
      'Five-dimension semantic evaluation of the submitted answer text. This is the only family that currently updates competency and readiness.',
  }),
  communication: Object.freeze({
    id: 'communication',
    label: 'Communication (voice)',
    feedsReadiness: false,
    description:
      'Observable speech practice signals such as pace, fillers, and answer length. Never mixed into the technical score or treated as personality.',
  }),
  behaviour: Object.freeze({
    id: 'behaviour',
    label: 'Camera observables',
    feedsReadiness: false,
    description:
      'Reserved for later face-visibility and movement signals. Not emotion, honesty, or personality.',
  }),
});
