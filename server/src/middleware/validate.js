import { AppError } from '../utils/errors.js';

export const validate = (schema, where = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[where]);
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new AppError(400, 'VALIDATION_ERROR', details[0]?.message || 'Invalid input', details));
  }
  req[where] = r.data;
  next();
};
