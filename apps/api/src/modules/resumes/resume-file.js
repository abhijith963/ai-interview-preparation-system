import path from 'node:path';

import { AppError } from '../../lib/app-error.js';

export const RESUME_MIME_TYPES = Object.freeze({
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
});

export const validateResumeFile = (file) => {
  if (!file) {
    throw new AppError(400, 'RESUME_REQUIRED', 'Choose a PDF or DOCX resume.');
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = RESUME_MIME_TYPES[extension];
  if (!expectedMimeType || file.mimetype !== expectedMimeType) {
    throw new AppError(
      415,
      'UNSUPPORTED_RESUME_TYPE',
      'Only PDF and DOCX resume files are supported.',
    );
  }

  const isPdf = extension === '.pdf' && file.buffer.subarray(0, 5).toString() === '%PDF-';
  const isDocx =
    extension === '.docx' &&
    file.buffer[0] === 0x50 &&
    file.buffer[1] === 0x4b &&
    file.buffer[2] === 0x03 &&
    file.buffer[3] === 0x04;

  if (!isPdf && !isDocx) {
    throw new AppError(
      415,
      'INVALID_RESUME_FILE',
      'The uploaded file content does not match its PDF or DOCX extension.',
    );
  }

  return { extension, mimeType: expectedMimeType };
};
