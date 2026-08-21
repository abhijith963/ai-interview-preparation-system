import multer from 'multer';

export const errorHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({
      error: {
        code: 'RESUME_TOO_LARGE',
        message: 'Resume files must be 5 MB or smaller.',
      },
    });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;

  return response.status(status).json({
    error: {
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message: isServerError ? 'An unexpected error occurred.' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
