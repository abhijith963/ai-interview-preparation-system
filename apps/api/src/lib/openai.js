import OpenAI from 'openai';

export const createOpenAIClient = ({ apiKey, timeoutMs }) => {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required before using AI features.');
  }

  return new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: timeoutMs,
  });
};
