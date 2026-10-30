import { AdminUser, audit } from '../models/index.js';
import { env } from '../config/env.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { getSettings, clampLimits } from '../services/settingsService.js';
import { getProvider } from '../telephony/index.js';

const view = (s) => ({ ...s.toObject(), _id: undefined, admin: undefined, __v: undefined, hardMaxPerOperation: env.hardMaxPerOperation, hardMaxDaily: env.hardMaxDaily });

export const get = asyncHandler(async (req, res) => ok(res, view(await getSettings(req.user.id))));

export const update = asyncHandler(async (req, res) => {
  const s = await getSettings(req.user.id);
  s.set(clampLimits(req.body));
  await s.save();
  await audit(req, 'settings.update', 'UserSettings', s.id);
  ok(res, view(s));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const u = await AdminUser.findById(req.user.id);
  if (req.body.email && req.body.email.toLowerCase() !== u.email && (await AdminUser.exists({ email: req.body.email.toLowerCase() }))) throw new AppError(409, 'DUPLICATE', 'That email is already in use.');
  u.set(req.body);
  await u.save();
  ok(res, { id: u.id, email: u.email, displayName: u.displayName, timezone: u.timezone });
});

/** Never returns credentials – only whether they are configured. */
export const providerStatus = asyncHandler(async (req, res) => {
  const p = getProvider();
  let validation = { ok: false, detail: 'Not checked' };
  try { validation = await p.validateConfig(); } catch (e) { validation = { ok: false, detail: e.message }; }
  ok(res, { provider: p.name, simulated: p.simulated, configured: p.simulated ? true : p.name === 'exotel' ? !!(env.exotel.sid && env.exotel.apiKey && env.exotel.apiToken && env.exotel.callerId && env.exotel.flowUrl) : !!(env.twilio.sid && env.twilio.token && env.twilio.from), capabilities: p.capabilities || { perCallVoice: true, cancel: true, balance: true }, connection: validation, webhookUrl: env.publicBaseUrl ? `${env.publicBaseUrl}/api/v1/webhooks/${p.name}` : null });
});
