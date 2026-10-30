import bcrypt from 'bcryptjs';
import { AdminUser, AuditLog, audit } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { COOKIE, cookieOptions, issueToken } from '../middleware/auth.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const pub = (u) => ({ id: u.id, email: u.email, displayName: u.displayName, timezone: u.timezone });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await AdminUser.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const match = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH); // constant-ish time
  if (!user || !match) {
    await audit({ user: user || undefined, ip: req.ip, get: (h) => req.get(h) }, 'auth.login_failed', 'AdminUser', user?.id);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }
  issueToken(res, user);
  req.user = user;
  await audit(req, 'auth.login', 'AdminUser', user.id);
  ok(res, { user: pub(user) });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE, cookieOptions());
  ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req, res) => ok(res, { user: pub(req.user) }));

export const changePassword = asyncHandler(async (req, res) => {
  const user = await AdminUser.findById(req.user.id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw new AppError(400, 'WRONG_PASSWORD', 'Current password is incorrect.');
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.tokenVersion += 1; // signs out all other sessions
  await user.save();
  issueToken(res, user);
  await audit(req, 'auth.password_changed', 'AdminUser', user.id);
  ok(res, { changed: true });
});

export const revokeSessions = asyncHandler(async (req, res) => {
  const user = await AdminUser.findById(req.user.id);
  user.tokenVersion += 1;
  await user.save();
  issueToken(res, user); // keep the current browser signed in
  await audit(req, 'auth.sessions_revoked', 'AdminUser', user.id);
  ok(res, { revoked: true });
});

export const activity = asyncHandler(async (req, res) => {
  const items = await AuditLog.find({ actor: req.user.id, action: { $in: ['auth.login', 'auth.login_failed', 'auth.password_changed', 'auth.sessions_revoked'] } }).sort({ createdAt: -1 }).limit(15).lean();
  ok(res, items.map((a) => ({ action: a.action, ip: a.ip, userAgent: a.userAgent, at: a.createdAt })));
});
