import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AdminUser } from '../models/index.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const COOKIE = 'vf_token';
export const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
});
export const issueToken = (res, user) => {
  const token = jwt.sign({ sub: user.id, tv: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  const ms = 8 * 3600 * 1000;
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: ms });
};

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret); } catch { throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.'); }
  const user = await AdminUser.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.tv) throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  req.user = user;
  next();
});

/** CSRF defence: cookies are SameSite-restricted AND state-changing requests must carry a custom header
 *  (which browsers only allow cross-origin after a CORS preflight that we restrict to CLIENT_ORIGIN). */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/webhooks/')) return next();
  if (req.get('x-requested-with') !== 'voiceflow') return next(new AppError(403, 'CSRF', 'Request blocked.'));
  next();
}
