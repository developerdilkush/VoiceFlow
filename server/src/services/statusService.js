import { Call } from '../models/index.js';
import { canTransition, TERMINAL } from '../utils/callStatus.js';

/** Applies a provider status event to a call, enforcing forward-only transitions. */
export async function applyStatusEvent({ callId, providerCallId }, evt) {
  const filter = callId ? { _id: callId } : { providerCallId };
  const call = await Call.findOne(filter);
  if (!call) return { applied: false, reason: 'unknown_call' };
  if (!canTransition(call.status, evt.status)) return { applied: false, reason: 'stale_or_duplicate', call };

  const now = evt.timestamp || new Date();
  const set = { status: evt.status };
  if (!call.providerCallId && providerCallId) set.providerCallId = providerCallId;
  if (evt.status === 'answered') set.answeredAt = now;
  if (TERMINAL.includes(evt.status)) {
    set.completedAt = now;
    if (evt.duration !== undefined && !Number.isNaN(evt.duration)) set.durationSeconds = evt.duration;
    if (['failed', 'busy', 'no_answer'].includes(evt.status)) set.failureReason = evt.reason || ({ busy: 'Recipient line was busy', no_answer: 'No answer', failed: 'Call failed' })[evt.status];
  }
  // Conditional update guards against concurrent webhooks.
  const updated = await Call.findOneAndUpdate({ _id: call._id, status: call.status }, { $set: set }, { new: true });
  return { applied: !!updated, call: updated || call };
}
