import { Groq } from 'groq-sdk';

export const createGroqClient = ({ apiKey, timeoutMs }) => {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required before using AI features.');
  }

  return new Groq({
    apiKey,
    timeout: timeoutMs,
  });
};