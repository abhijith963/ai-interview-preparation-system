import { toFile } from 'groq-sdk';
import { z } from 'zod';
import { evaluationOutputSchema, questionOutputSchema } from './interview.ai-schemas.js';
import {
  ANSWER_RUBRIC,
  EVALUATION_PROMPT_VERSION,
  EVALUATION_SYSTEM_INSTRUCTIONS,
  QUESTION_PROMPT_VERSION,
  QUESTION_SYSTEM_INSTRUCTIONS,
  wrapUntrustedContext,
} from './interview.prompts.js';

export class GroqGatewayError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'GroqGatewayError';
    this.code = code;
  }
}

const classifyProviderError = (error) => {
  if (error instanceof GroqGatewayError) return error;
  if (
    error?.name === 'APIConnectionTimeoutError' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ECONNABORTED'
  ) {
    return new GroqGatewayError('AI_TIMEOUT', 'The AI provider timed out.', error);
  }
  if (error?.status === 429) {
    return new GroqGatewayError(
      'AI_RATE_LIMITED',
      'The AI provider is temporarily rate limited.',
      error,
    );
  }
  if (error?.status >= 500 || error?.name === 'APIConnectionError') {
    return new GroqGatewayError(
      'AI_PROVIDER_UNAVAILABLE',
      'The AI provider is temporarily unavailable.',
      error,
    );
  }
  return new GroqGatewayError('AI_PROVIDER_FAILED', 'The AI provider request failed.', error);
};

export const createGroqAiGateway = ({
  client,
  maximumRetries,
  model,
  transcriptionModel = 'whisper-large-v3-turbo',
}) => {
  const requestStructured = async ({ context, name, schema, systemInstructions }) => {
    let lastError;
    for (let attempt = 0; attempt <= maximumRetries; attempt += 1) {
      try {
        const response = await client.chat.completions.create({
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: wrapUntrustedContext(context) },
          ],
          model,
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name,
              schema: z.toJSONSchema(schema),
              strict: true,
            },
          },
        });

        let content;
        try {
          content = JSON.parse(response.choices[0].message.content);
        } catch (error) {
          throw new GroqGatewayError(
            'AI_OUTPUT_INVALID',
            'The AI provider returned malformed structured output.',
            error,
          );
        }

        const parsed = schema.safeParse(content);
        if (!parsed.success) {
          throw new GroqGatewayError(
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
    async transcribeAudio({ buffer, filename, mimeType }) {
      try {
        const file = await toFile(buffer, filename, { type: mimeType });
        const response = await client.audio.transcriptions.create({
          file,
          model: transcriptionModel,
          response_format: 'json',
          temperature: 0,
        });
        const transcript = response.text?.trim();
        if (!transcript) {
          throw new GroqGatewayError(
            'AI_OUTPUT_INVALID',
            'The transcription provider did not detect speech.',
          );
        }
        return transcript;
      } catch (error) {
        throw classifyProviderError(error);
      }
    },
    transcriptionModel,
    async evaluateAnswer(context) {
      return requestStructured({
        context: { ...context, dimensionRubric: ANSWER_RUBRIC },
        name: 'evaluate_answer',
        schema: evaluationOutputSchema,
        systemInstructions: EVALUATION_SYSTEM_INSTRUCTIONS,
      });
    },
    async generateQuestion(context) {
      return requestStructured({
        context,
        name: 'generate_question',
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
