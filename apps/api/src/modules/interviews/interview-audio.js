import { AppError } from '../../lib/app-error.js';

const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-wav',
  'video/mp4',
  'video/webm',
]);

export const validateInterviewAudioFile = (file) => {
  if (!file) {
    throw new AppError(
      422,
      'AUDIO_REQUIRED',
      'Record an answer before requesting transcription.',
    );
  }
  if (!file.size) {
    throw new AppError(
      422,
      'AUDIO_EMPTY',
      'The recording was empty. Retry the recording or type your answer instead.',
    );
  }
  if (!SUPPORTED_AUDIO_TYPES.has(file.mimetype)) {
    throw new AppError(
      415,
      'AUDIO_TYPE_UNSUPPORTED',
      'This browser produced an unsupported recording format. Type your answer instead.',
    );
  }
  return file;
};
