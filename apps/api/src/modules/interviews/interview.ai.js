import {
  EVALUATION_PROMPT_VERSION,
  QUESTION_PROMPT_VERSION,
} from './interview.prompts.js';

export class AiGatewayError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'AiGatewayError';
    this.code = code;
  }
}

export const createUnavailableAiGateway = () =>
  Object.freeze({
    model: 'unconfigured',
    promptVersions: Object.freeze({
      evaluation: EVALUATION_PROMPT_VERSION,
      question: QUESTION_PROMPT_VERSION,
    }),
    async evaluateAnswer() {
      throw new AiGatewayError(
        'AI_NOT_CONFIGURED',
        'The AI interview provider is not configured.',
      );
    },
    async generateQuestion() {
      throw new AiGatewayError(
        'AI_NOT_CONFIGURED',
        'The AI interview provider is not configured.',
      );
    },
    async transcribeAudio() {
      throw new AiGatewayError(
        'AI_NOT_CONFIGURED',
        'The AI transcription provider is not configured.',
      );
    },
  });
