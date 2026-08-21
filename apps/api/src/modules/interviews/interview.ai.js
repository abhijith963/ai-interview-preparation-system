import { zodTextFormat } from 'openai/helpers/zod';

import {
  evaluationOutputSchema,
  questionOutputSchema,
} from './interview.ai-schemas.js';
import {
  ANSWER_RUBRIC,
  EVALUATION_PROMPT_VERSION,
  EVALUATION_SYSTEM_INSTRUCTIONS,
  QUESTION_PROMPT_VERSION,
  QUESTION_SYSTEM_INSTRUCTIONS,
  wrapUntrustedContext,
} from './interview.prompts.js';

export class AiGatewayError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'AiGatewayError';
    this.code = code;
  }
}

const classifyProviderError = (error) => {
  if (error instanceof AiGatewayError) return error;
  if (
    error?.name === 'APIConnectionTimeoutError' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ECONNABORTED'
  ) {
    return new AiGatewayError('AI_TIMEOUT', 'The AI provider timed out.', error);
  }
  if (error?.status === 429) {
    return new AiGatewayError(
      'AI_RATE_LIMITED',
      'The AI provider is temporarily rate limited.',
      error,
    );
  }
  if (error?.status >= 500 || error?.name === 'APIConnectionError') {
    return new AiGatewayError(
      'AI_PROVIDER_UNAVAILABLE',
      'The AI provider is temporarily unavailable.',
      error,
    );
  }
  return new AiGatewayError('AI_PROVIDER_FAILED', 'The AI provider request failed.', error);
};

export const createOpenAiGateway = ({ client, maximumRetries, model }) => {
  const requestStructured = async ({ context, name, schema, systemInstructions }) => {
    let lastError;
    for (let attempt = 0; attempt <= maximumRetries; attempt += 1) {
      try {
        const response = await client.responses.parse({
          input: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: wrapUntrustedContext(context) },
          ],
          model,
          store: false,
          text: { format: zodTextFormat(schema, name) },
        });
        const parsed = schema.safeParse(response.output_parsed);
        if (!parsed.success) {
          throw new AiGatewayError(
            'AI_OUTPUT_INVALID',
            'The AI provider returned malformed structured output.',
            parsed.error,
          );
        }
        return parsed.data;
      } catch (error) {
        lastError = classifyProviderError(error);
        if (attempt === maximumRetries) throw lastError;
      }
    }
    throw lastError;
  };

  return Object.freeze({
    model,
    async evaluateAnswer(context) {
      return requestStructured({
        context: { ...context, dimensionRubric: ANSWER_RUBRIC },
        name: 'interview_answer_evaluation',
        schema: evaluationOutputSchema,
        systemInstructions: EVALUATION_SYSTEM_INSTRUCTIONS,
      });
    },
    async generateQuestion(context) {
      return requestStructured({
        context,
        name: 'interview_question',
        schema: questionOutputSchema,
        systemInstructions: QUESTION_SYSTEM_INSTRUCTIONS,
      });
    },
    promptVersions: Object.freeze({
      evaluation: EVALUATION_PROMPT_VERSION,
      question: QUESTION_PROMPT_VERSION,
    }),
  });
};

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
  });
