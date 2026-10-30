import { Call, audit } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { escapeRegex, paging, dateRange } from '../utils/misc.js';
import { toCsv } from '../utils/template.js';
import { createSingleCall, cancelCall } from '../services/callService.js';
import { getSettings } from '../services/settingsService.js';

const view = (c, full = false) => ({
  id: c.id, name: c.name, phoneMasked: c.phoneMasked, status: c.status, durationSeconds: c.durationSeconds, language: c.language,
  voiceType: c.voiceType, voiceLabel: c.voiceLabel, source: c.source, simulated: c.simulated, provider: c.provider, createdAt: c.createdAt,
  messagePreview: (c.message || '').slice(0, 60),
  ...(full ? { message: c.message, providerCallId: c.providerCallId, failureReason: c.failureReason, initiatedAt: c.initiatedAt, answeredAt: c.answeredAt, completedAt: c.completedAt, attempts: c.attempts, bulkJob: c.bulkJob } : {}),
});

function buildFilter(q) {
  const f = {};
  const { from, to } = dateRange(q, 3650);
  f.createdAt = { $gte: from, $lte: to };
  if (q.status) f.status = q.status;
  if (q.language) f.language = q.language;
  if (q.source) f.source = q.source;
  if (q.bulkJob) f.bulkJob = q.bulkJob;
  if (q.q) f.name = new RegExp(escapeRegex(String(q.q).slice(0, 50)), 'i');
  return f;
}

export const create = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const { call, replay } = await createSingleCall({ admin: req.user, settings, body: req.body, idempotencyKey: req.get('idempotency-key')?.slice(0, 80) });
  await audit(req, 'call.create', 'Call', call.id);
  ok(res, view(call, true), { replay: !!replay }, replay ? 200 : 201);
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = buildFilter(req.query);
  const sortField = ['createdAt', 'status', 'durationSeconds', 'name'].includes(req.query.sort) ? req.query.sort : 'createdAt';
  const sort = { [sortField]: req.query.order === 'asc' ? 1 : -1, _id: -1 };
  const [items, total] = await Promise.all([Call.find(filter).sort(sort).skip(skip).limit(limit), Call.countDocuments(filter)]);
  ok(res, items.map((c) => view(c)), { page, limit, total, pages: Math.ceil(total / limit) });
});

export const get = asyncHandler(async (req, res) => {
  const c = await Call.findById(req.params.id);
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Call not found.');
  ok(res, view(c, true));
});

export const cancel = asyncHandler(async (req, res) => {
  const c = await Call.findById(req.params.id);
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Call not found.');
  const updated = await cancelCall(c);
  await audit(req, 'call.cancel', 'Call', c.id);
  ok(res, view(updated, true));
});

export const exportCsv = asyncHandler(async (req, res) => {
  const calls = await Call.find(buildFilter(req.query)).sort({ createdAt: -1 }).limit(10000);
  await audit(req, 'call.export', 'Call', undefined, { count: calls.length });
  const csv = toCsv(calls, [
    { label: 'Date', value: (c) => c.createdAt.toISOString() }, { label: 'Contact', value: (c) => c.name }, { label: 'Number (masked)', value: (c) => c.phoneMasked },
    { label: 'Status', value: (c) => c.status }, { label: 'Duration (s)', value: (c) => c.durationSeconds }, { label: 'Language', value: (c) => c.language },
    { label: 'Voice', value: (c) => c.voiceLabel }, { label: 'Source', value: (c) => c.source }, { label: 'Provider ref', value: (c) => c.providerCallId || '' }, { label: 'Simulated', value: (c) => (c.simulated ? 'yes' : 'no') },
  ]);
  res.type('text/csv').set('Content-Disposition', 'attachment; filename="call-history.csv"').send(csv);
});
