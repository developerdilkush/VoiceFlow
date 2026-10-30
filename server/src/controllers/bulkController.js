import { BulkJob, Call, audit } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { paging } from '../utils/misc.js';
import { toCsv } from '../utils/template.js';
import { parseUpload, autoMapping, validateRecipients } from '../services/importService.js';
import { createBulkJob, jobProgress } from '../services/bulkService.js';
import { getSettings } from '../services/settingsService.js';

const jobView = async (j) => ({ id: j.id, name: j.name, status: j.status, mode: j.mode, total: j.total, createdAt: j.createdAt, finishedAt: j.finishedAt, progress: await jobProgress(j._id) });

/** Step 1+2: parse (file or manual rows), map columns, validate. Stateless: nothing is stored. */
export const importRecipients = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  let headers, rows, mapping;
  if (req.file) {
    ({ headers, rows } = await parseUpload(req.file));
    mapping = { ...autoMapping(headers) };
    if (req.body.mapping) { try { Object.assign(mapping, JSON.parse(req.body.mapping)); } catch { throw new AppError(400, 'BAD_MAPPING', 'Invalid column mapping.'); } }
    rows = rows.map((r) => ({ name: r[mapping.name], phone: r[mapping.phone], message: r[mapping.message], language: r[mapping.language], voice: r[mapping.voice] }));
  } else if (Array.isArray(req.body.rows)) {
    headers = ['name', 'phone', 'message', 'language', 'voice'];
    mapping = Object.fromEntries(headers.map((h) => [h, h]));
    rows = req.body.rows;
  } else throw new AppError(400, 'NO_INPUT', 'Upload a CSV/XLSX file or enter numbers manually.');
  if (!rows?.length) throw new AppError(422, 'EMPTY_FILE', 'No data rows found.');
  const result = await validateRecipients(rows, { defaultCountry: settings.defaultCountry });
  ok(res, { headers, mapping, limit: settings.maxCallsPerOperation, ...result });
});

export const createJob = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const { job, replay } = await createBulkJob({ admin: req.user, settings, body: req.body, idempotencyKey: req.get('idempotency-key')?.slice(0, 80) });
  await audit(req, 'bulk.create', 'BulkJob', job.id, { total: job.total });
  ok(res, await jobView(job), { replay: !!replay }, replay ? 200 : 201);
});

export const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const [items, total] = await Promise.all([BulkJob.find().sort({ createdAt: -1 }).skip(skip).limit(limit), BulkJob.countDocuments()]);
  ok(res, await Promise.all(items.map(jobView)), { page, limit, total, pages: Math.ceil(total / limit) });
});

const load = async (id) => { const j = await BulkJob.findById(id); if (!j) throw new AppError(404, 'NOT_FOUND', 'Bulk job not found.'); return j; };
export const getJob = asyncHandler(async (req, res) => ok(res, await jobView(await load(req.params.id))));

const transition = (from, to, action) => asyncHandler(async (req, res) => {
  const j = await load(req.params.id);
  const upd = await BulkJob.findOneAndUpdate({ _id: j._id, status: { $in: from } }, { $set: { status: to, ...(to === 'canceled' ? { finishedAt: new Date() } : {}) } }, { new: true });
  if (!upd) throw new AppError(409, 'INVALID_STATE', `Cannot ${action} a job that is ${j.status}.`);
  if (to === 'canceled') await Call.updateMany({ bulkJob: j._id, status: 'queued' }, { $set: { status: 'canceled', completedAt: new Date(), failureReason: 'Job canceled' } });
  await audit(req, `bulk.${action}`, 'BulkJob', j.id);
  ok(res, await jobView(upd));
});
export const pause = transition(['running'], 'paused', 'pause');
export const resume = transition(['paused'], 'running', 'resume');
export const cancel = transition(['running', 'paused'], 'canceled', 'cancel');

export const exportResults = asyncHandler(async (req, res) => {
  const j = await load(req.params.id);
  const calls = await Call.find({ bulkJob: j._id }).sort({ _id: 1 });
  const csv = toCsv(calls, [
    { label: 'Name', value: (c) => c.name }, { label: 'Number (masked)', value: (c) => c.phoneMasked }, { label: 'Status', value: (c) => c.status },
    { label: 'Duration (s)', value: (c) => c.durationSeconds }, { label: 'Reason', value: (c) => c.failureReason }, { label: 'Attempts', value: (c) => c.attempts },
  ]);
  res.type('text/csv').set('Content-Disposition', `attachment; filename="bulk-${j.id}.csv"`).send(csv);
});
