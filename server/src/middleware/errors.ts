import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../utils/errors.js';
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new HttpError(404, 'Record not found'));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let status = error instanceof HttpError ? error.status : 500;
  let message = status === 500 ? 'Something went wrong. Please try again.' : error.message;
  if (
    ['ValidationError', 'CastError'].includes(error.name) ||
    error.code === 11000 ||
    error.type === 'entity.parse.failed'
  ) {
    status = 400;
    message =
      error.code === 11000
        ? 'A record with that unique value already exists.'
        : error.type === 'entity.parse.failed'
          ? 'Invalid JSON request.'
          : error.message;
  }
  if (status === 500) console.error('Request failed:', error.name || 'Error');
  res.status(status).json({ message });
};
