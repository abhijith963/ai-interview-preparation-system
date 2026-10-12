import { Router } from 'express';
import multer from 'multer';

import { AppError } from '../../lib/app-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import {
  createInterviewSchema,
  deleteInterviewSchema,
  endInterviewSchema,
  idempotencyKeySchema,
  interviewHistoryQuerySchema,
  submitAnswerSchema,
} from './interview.http-schemas.js';
import { validateInterviewAudioFile } from './interview-audio.js';
import { createInterviewService } from './interview.service.js';

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please check the submitted fields.', {
      fields: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
};

export const createInterviewRouter = ({
  aiGateway,
  maximumAudioSizeBytes = 25_000_000,
}) => {
  const router = Router();
  const upload = multer({
    limits: { fileSize: maximumAudioSizeBytes, files: 1 },
    storage: multer.memoryStorage(),
  });
  const service = createInterviewService({ aiGateway });
  router.use(requireAuth);

  router.post('/', async (request, response) => {
    const input = parse(createInterviewSchema, request.body);
    const data = await service.createInterview({ ...input, user: request.auth.user });
    response.status(201).json({ data });
  });

  router.get('/', async (request, response) => {
    const input = parse(interviewHistoryQuerySchema, request.query);
    const data = await service.listInterviews({
      ...input,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data });
  });

  router.get('/:interviewId', async (request, response) => {
    const data = await service.getInterview({
      interviewId: request.params.interviewId,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data });
  });

  router.post(
    '/:interviewId/transcriptions',
    upload.single('audio'),
    async (request, response) => {
      const file = validateInterviewAudioFile(request.file);
      const data = await service.transcribeAnswer({
        file,
        interviewId: request.params.interviewId,
        userId: request.auth.user._id,
      });
      response.status(200).json({ data });
    },
  );

  router.post('/:interviewId/answers', async (request, response) => {
    const input = parse(submitAnswerSchema, request.body);
    const idempotencyKey = parse(
      idempotencyKeySchema,
      request.get('Idempotency-Key'),
    );
    const data = await service.submitAnswer({
      ...input,
      idempotencyKey,
      interviewId: request.params.interviewId,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data });
  });

  router.post('/:interviewId/retry', async (request, response) => {
    const data = await service.retryInterview({
      interviewId: request.params.interviewId,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data });
  });

  router.post('/:interviewId/complete', async (request, response) => {
    parse(endInterviewSchema, request.body);
    const report = await service.endInterviewEarly({
      interviewId: request.params.interviewId,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data: { report } });
  });

  router.get('/:interviewId/report', async (request, response) => {
    const report = await service.getReport({
      interviewId: request.params.interviewId,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data: { report } });
  });

  router.delete('/:interviewId', async (request, response) => {
    parse(deleteInterviewSchema, request.body);
    const data = await service.deleteInterview({
      interviewId: request.params.interviewId,
      userId: request.auth.user._id,
    });
    response.status(200).json({ data });
  });

  return router;
};
