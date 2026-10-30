import rateLimit from 'express-rate-limit';

const json = (message) => ({ standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message } }) });
export const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, ...json('Too many requests. Please slow down.') });
export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, ...json('Too many sign-in attempts. Try again in 15 minutes.') });
export const callLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, ...json('Too many call requests. Wait a minute and retry.') });
export const uploadLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, ...json('Too many uploads. Wait a minute and retry.') });
export const webhookLimiter = rateLimit({ windowMs: 60 * 1000, limit: 600, ...json('Too many webhook requests.') });
