import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export const notFound = (req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found.'));

export function errorHandler(err, req, res, _next) {
  let status = err.status || 500, code = err.code || 'INTERNAL', message = err.message;
  if (err.name === 'MulterError') { status = 400; code = 'UPLOAD_ERROR'; message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : 'Upload failed.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; message = 'Malformed request body.'; }
  else if (err.name === 'CastError') { status = 400; code = 'BAD_ID'; message = 'Invalid identifier.'; }
  else if (err.code === 11000) { status = 409; code = 'DUPLICATE'; message = 'This record already exists.'; }
  else if (err.name === 'CsvError' || /csv/i.test(err.code || '')) { status = 422; code = 'BAD_FILE'; message = 'The file could not be parsed.'; }
  if (status >= 500) {
    (req.log || logger).error({ err: { message: err.message, stack: env.isProd ? undefined : err.stack } }, 'unhandled error');
    if (env.isProd) message = 'Something went wrong. Please try again.';
  }
  res.status(status).json({ success: false, error: { code, message, ...(err.details ? { details: err.details } : {}), requestId: req.id } });
}
