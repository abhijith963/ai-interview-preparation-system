import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.status(200).json({
    data: {
      service: 'ai-interview-api',
      status: 'ok',
      version: '0.1.0',
    },
  });
});
