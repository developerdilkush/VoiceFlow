import { BulkJob, Call } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { normalizePhone, maskPhone } from '../utils/phone.js';
import { renderTemplate } from '../utils/template.js';
import { resolveVoice } from '../voice/voiceService.js';
import { dailyCount } from './safeguards.js';
import { TERMINAL, IN_PROGRESS } from '../utils/callStatus.js';

export async function createBulkJob({ admin, settings, body, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await BulkJob.findOne({ idempotencyKey });
    if (existing) return { job: existing, replay: true };
  }
  if (body.recipients.length > settings.maxCallsPerOperation) throw new AppError(422, 'OPERATION_LIMIT', `You can include at most ${settings.maxCallsPerOperation} recipients per bulk job.`);

  // Re-validate everything server-side; the client list is never trusted.
  const seen = new Map();
  for (const r of body.recipients) {
    const phone = normalizePhone(r.phone, settings.defaultCountry);
    if (phone && !seen.has(phone)) seen.set(phone, r);
  }
  const phones = [...seen.keys()];
  const recent = settings.minRepeatIntervalMinutes > 0
    ? new Set(await Call.distinct('phone', { phone: { $in: phones }, status: { $nin: ['failed', 'canceled', 'skipped'] }, createdAt: { $gt: new Date(Date.now() - settings.minRepeatIntervalMinutes * 60000) } }))
    : new Set();

  const language = settings.defaultLanguage;
  const voice = await resolveVoice(settings.defaultVoiceId, language);

  const eligible = [], skipped = [];
  for (const [phone, r] of seen) {
    const message = renderTemplate(settings.defaultMessage, { name: r.name });
    let reason = '';
    if (recent.has(phone)) reason = 'Called recently';
    else if (voice.type === 'tts' && !message.trim()) reason = 'Empty message';
    const rec = { name: (r.name || '').slice(0, 80), phone, message, language, voice };
    (reason ? skipped.push({ ...rec, reason }) : eligible.push(rec));
  }
  if (!eligible.length) throw new AppError(422, 'NO_ELIGIBLE', 'No eligible recipients remain after validation.');
  if ((await dailyCount()) + eligible.length > settings.maxDailyCalls) throw new AppError(429, 'DAILY_LIMIT', 'This job would exceed your daily call limit.');

  let job;
  try {
    job = await BulkJob.create({ name: '', mode: 'same', total: eligible.length + skipped.length, idempotencyKey: idempotencyKey || undefined, createdBy: admin._id });
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) return { job: await BulkJob.findOne({ idempotencyKey }), replay: true };
    throw e;
  }
  const base = (r) => ({ name: r.name, phone: r.phone, phoneMasked: maskPhone(r.phone), message: r.message, language: r.language, voiceId: r.voice.id, voiceLabel: r.voice.label, voiceType: r.voice.type, source: 'bulk', bulkJob: job._id, createdBy: admin._id });
  await Call.insertMany([
    ...eligible.map((r) => ({ ...base(r), status: 'queued' })),
    ...skipped.map((r) => ({ ...base(r), status: 'skipped', failureReason: r.reason, completedAt: new Date() })),
  ]);
  return { job };
}

export async function jobProgress(jobId) {
  const rows = await Call.aggregate([{ $match: { bulkJob: jobId } }, { $group: { _id: '$status', n: { $sum: 1 }, answered: { $sum: { $cond: [{ $ifNull: ['$answeredAt', false] }, 1, 0] } } } }]);
  const counts = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const total = rows.reduce((a, r) => a + r.n, 0);
  const processed = TERMINAL.reduce((a, s) => a + (counts[s] || 0), 0);
  const inFlight = IN_PROGRESS.reduce((a, s) => a + (counts[s] || 0), 0);
  return { total, counts, processed, answered: rows.reduce((a, r) => a + r.answered, 0), remaining: (counts.queued || 0) + inFlight };
}
