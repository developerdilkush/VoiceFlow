import { Call } from '../models/index.js';
import { asyncHandler, ok } from '../utils/errors.js';
import { dateRange } from '../utils/misc.js';
import { getSettings } from '../services/settingsService.js';
import { getProvider } from '../telephony/index.js';

export async function callMetrics(from, to, tz) {
  const match = { createdAt: { $gte: from, $lte: to }, status: { $nin: ['skipped'] } };
  const [byStatus, totals, byDay, bySource] = await Promise.all([
    Call.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Call.aggregate([{ $match: match }, { $group: { _id: null, duration: { $sum: '$durationSeconds' }, dispatched: { $sum: { $cond: [{ $ifNull: ['$initiatedAt', false] }, 1, 0] } }, answered: { $sum: { $cond: [{ $ifNull: ['$answeredAt', false] }, 1, 0] } }, billableMinutes: { $sum: { $ceil: { $divide: ['$durationSeconds', 60] } } } } }]),
    Call.aggregate([{ $match: match }, { $group: { _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } } }, total: { $sum: 1 }, answered: { $sum: { $cond: [{ $ifNull: ['$answeredAt', false] }, 1, 0] } }, failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'busy', 'no_answer']] }, 1, 0] } } } }, { $sort: { '_id.d': 1 } }]),
    Call.aggregate([{ $match: match }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));
  const t = totals[0] || { duration: 0, dispatched: 0, answered: 0, billableMinutes: 0 };
  const total = byStatus.reduce((a, r) => a + r.n, 0);
  const pct = (n) => (t.dispatched ? Math.round((n / t.dispatched) * 1000) / 10 : 0);
  return {
    total, counts, totalDurationSeconds: t.duration, dispatched: t.dispatched, answered: t.answered, billableMinutes: t.billableMinutes,
    inProgress: (counts.initiated || 0) + (counts.ringing || 0) + (counts.answered || 0),
    failed: counts.failed || 0,
    rates: { answered: pct(t.answered), completed: pct(counts.completed || 0), failed: pct(counts.failed || 0) },
    daily: byDay.map((d) => ({ date: d._id.d, total: d.total, answered: d.answered, failed: d.failed })),
    bySource: Object.fromEntries(bySource.map((r) => [r._id, r.n])),
  };
}

export const stats = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const { from, to } = dateRange(req.query, settings.dashboardRangeDays);
  const metrics = await callMetrics(from, to, settings.timezone);
  let credit = null;
  try { credit = await Promise.race([getProvider().getBalance(), new Promise((r) => setTimeout(() => r(null), 3000))]); } catch { credit = null; }
  ok(res, { ...metrics, credit, provider: getProvider().name, simulated: getProvider().simulated, range: { from, to } });
});

export const recentCalls = asyncHandler(async (req, res) => {
  const items = await Call.find().sort({ createdAt: -1 }).limit(10);
  ok(res, items.map((c) => ({ id: c.id, name: c.name, phoneMasked: c.phoneMasked, status: c.status, durationSeconds: c.durationSeconds, language: c.language, voiceType: c.voiceType, voiceLabel: c.voiceLabel, simulated: c.simulated, createdAt: c.createdAt })));
});
