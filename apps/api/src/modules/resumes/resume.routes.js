import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { AppError } from '../../lib/app-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { toResumeDto } from './resume.dto.js';
import { validateResumeFile } from './resume-file.js';
import {
  confirmResumeForUser,
  deleteResumeForUser,
  getResumeForUser,
  replaceResumeForUser,
} from './resume.service.js';

const sectionSchema = z.string().trim().max(25_000);
const reviewSchema = z
  .object({
    confirmation: z.literal(true),
    sections: z.object({
      certifications: sectionSchema,
      education: sectionSchema,
      experience: sectionSchema,
      projects: sectionSchema,
      skills: sectionSchema,
      summary: sectionSchema,
    }),
  })
  .refine(
    ({ sections }) => Object.values(sections).join('\n').length <= 100_000,
    { message: 'The corrected resume profile is too long.', path: ['sections'] },
  );
const deleteSchema = z.object({ confirmation: z.literal('DELETE') });

const parseBody = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please check the submitted fields.', {
      fields: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
};

export const createResumeRouter = ({ maximumFileSizeBytes }) => {
  const router = Router();
  const upload = multer({
    limits: { fileSize: maximumFileSizeBytes, files: 1 },
    storage: multer.memoryStorage(),
  });

  router.use(requireAuth);

  router.get('/', async (request, response) => {
    const resume = await getResumeForUser(request.auth.user._id);
    response.status(200).json({
      data: { resume: resume ? toResumeDto(resume) : null },
    });
  });

  router.post('/', upload.single('resume'), async (request, response) => {
    const { mimeType } = validateResumeFile(request.file);
    if (request.file.size > maximumFileSizeBytes) {
      throw new AppError(413, 'RESUME_TOO_LARGE', 'Resume files must be 5 MB or smaller.');
    }

    const { created, resume } = await replaceResumeForUser({
      file: request.file,
      mimeType,
      userId: request.auth.user._id,
    });

    response.status(created ? 201 : 200).json({
      data: { replaced: !created, resume: toResumeDto(resume) },
    });
  });

  router.patch('/', async (request, response) => {
    const { sections } = parseBody(reviewSchema, request.body);
    const resume = await confirmResumeForUser({
      sections,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data: { resume: toResumeDto(resume) } });
  });

  router.delete('/', async (request, response) => {
    parseBody(deleteSchema, request.body);
    await deleteResumeForUser(request.auth.user._id);
    response.status(204).end();
  });

  return router;
};
