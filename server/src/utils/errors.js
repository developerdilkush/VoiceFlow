export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Error raised by telephony adapters. `transient` errors may be retried in bulk jobs. */
export class ProviderError extends Error {
  constructor(message, { transient = false, code = 'PROVIDER_ERROR', status } = {}) {
    super(message);
    this.transient = transient;
    this.code = code;
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const ok = (res, data, meta, status = 200) => res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
