import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { requestLogger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errors.js';
export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(
  cors({
    credentials: true,
    origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((value) => value.trim()),
  }),
);
app.use(requestLogger);
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);
