import { UserSettings } from '../models/index.js';
import { env } from '../config/env.js';

export const getSettings = (adminId) => UserSettings.findOneAndUpdate({ admin: adminId }, { $setOnInsert: { admin: adminId } }, { upsert: true, new: true });

/** User limits can never exceed the server-side hard ceilings. */
export const clampLimits = (s) => ({
  ...s,
  ...(s.maxCallsPerOperation !== undefined && { maxCallsPerOperation: Math.min(s.maxCallsPerOperation, env.hardMaxPerOperation) }),
  ...(s.maxDailyCalls !== undefined && { maxDailyCalls: Math.min(s.maxDailyCalls, env.hardMaxDaily) }),
});
