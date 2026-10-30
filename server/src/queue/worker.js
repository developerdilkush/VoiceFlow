import { BulkJob, Call } from '../models/index.js';
import { env } from '../config/env.js';
import { IN_PROGRESS } from '../utils/callStatus.js';
import { dispatchCall } from '../services/callService.js';
import { applyStatusEvent } from '../services/statusService.js';
import { getProvider } from '../telephony/index.js';
import { logger } from '../utils/logger.js';

/**
 * Database-backed job queue for bulk calls (no Redis required). Runs inside the API process,
 * so run exactly ONE backend instance. Atomic claims in dispatchCall() prevent duplicate calls.
 */
const TICK_MS = 3000;
let running = false;

async function processJob(job) {
  const inflight = await Call.countDocuments({ bulkJob: job._id, status: { $in: IN_PROGRESS } });
  const claimed = await Call.countDocuments({ bulkJob: job._id, status: 'queued', claimedAt: { $ne: null } });
  const perTick = Math.max(1, Math.round(env.bulkCallsPerMinute / (60000 / TICK_MS)));
  const slots = Math.min(env.bulkConcurrency - inflight - claimed, perTick);
  if (slots > 0) {
    const due = await Call.find({ bulkJob: job._id, status: 'queued', claimedAt: null, nextAttemptAt: { $lte: new Date() } }).sort({ _id: 1 }).limit(slots).select('_id').lean();
    for (const c of due) await dispatchCall(c._id);
  }
  const open = await Call.countDocuments({ bulkJob: job._id, status: { $in: ['queued', ...IN_PROGRESS] } });
  if (open === 0) await BulkJob.updateOne({ _id: job._id, status: 'running' }, { $set: { status: 'completed', finishedAt: new Date() } });
}

async function housekeeping() {
  // Release claims that never completed (e.g. crash between claim and provider request).
  await Call.updateMany({ status: 'queued', claimedAt: { $lt: new Date(Date.now() - 2 * 60000) } }, { $set: { claimedAt: null } });
  // Reconcile calls whose final webhook never arrived.
  const stale = await Call.find({ status: { $in: IN_PROGRESS }, initiatedAt: { $lt: new Date(Date.now() - 10 * 60000) }, providerCallId: { $ne: null } }).limit(20);
  for (const c of stale) {
    try {
      const s = await getProvider().getCallStatus(c.providerCallId);
      await applyStatusEvent({ callId: c.id }, { status: s.status, duration: s.duration });
    } catch (e) { logger.warn({ callId: c.id }, 'reconcile failed'); }
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await housekeeping();
    for (const job of await BulkJob.find({ status: 'running' })) await processJob(job);
  } catch (e) {
    logger.error({ err: e.message }, 'worker tick failed');
  } finally { running = false; }
}

async function purgeOldMessages() {
  const cutoff = new Date(Date.now() - env.retentionDays * 86400000);
  const r = await Call.updateMany({ createdAt: { $lt: cutoff }, message: { $ne: '' } }, { $set: { message: '' } });
  if (r.modifiedCount) logger.info({ count: r.modifiedCount }, 'retention: message text erased');
}

export function startWorker() {
  setInterval(tick, TICK_MS).unref();
  purgeOldMessages().catch(() => {});
  setInterval(() => purgeOldMessages().catch(() => {}), 6 * 3600 * 1000).unref();
  logger.info('bulk queue worker started');
}
