import { Call } from '../models/index.js';
import { AppError } from '../utils/errors.js';

export function withinAllowedHours(settings, now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: settings.timezone }).format(now));
  return hour >= settings.allowedHours.start && hour < settings.allowedHours.end;
}


export async function dailyCount() {
  return Call.countDocuments({ createdAt: { $gt: new Date(Date.now() - 24 * 3600 * 1000) }, status: { $nin: ['skipped', 'canceled'] } });
}

/** Checks applied when a call is created. */
export async function assertCallAllowed(settings, phone, { extra = 1 } = {}) {
  if (!withinAllowedHours(settings)) throw new AppError(422, 'OUTSIDE_CALLING_HOURS', `Calls are only allowed between ${settings.allowedHours.start}:00 and ${settings.allowedHours.end}:00 (${settings.timezone}).`);
  if ((await dailyCount()) + extra > settings.maxDailyCalls) throw new AppError(429, 'DAILY_LIMIT', 'Daily call limit reached.');
  if (settings.minRepeatIntervalMinutes > 0) {
    const recent = await Call.exists({ phone, status: { $nin: ['failed', 'canceled', 'skipped'] }, createdAt: { $gt: new Date(Date.now() - settings.minRepeatIntervalMinutes * 60000) } });
    if (recent) throw new AppError(429, 'REPEAT_TOO_SOON', `This number was called within the last ${settings.minRepeatIntervalMinutes} minutes.`);
  }
}
