import multer from 'multer';

import { AppError } from '../lib/app-error.js';

export const errorHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    const isAudio = error.field === 'audio';
    return response.status(413).json({
      error: {
        code: isAudio ? 'AUDIO_TOO_LARGE' : 'RESUME_TOO_LARGE',
        message: isAudio
          ? 'The recording is too large to transcribe. Record a shorter answer or type it instead.'
          : 'Resume files must be 5 MB or smaller.',
      },
    });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;

  return response.status(status).json({
    error: {
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message:
        isServerError && !(error instanceof AppError)
          ? 'An unexpected error occurred.'
          : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
