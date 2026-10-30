export const CALL_STATUSES = ['queued', 'initiated', 'ringing', 'answered', 'completed', 'busy', 'no_answer', 'failed', 'canceled', 'skipped'];
export const TERMINAL = ['completed', 'busy', 'no_answer', 'failed', 'canceled', 'skipped'];
export const IN_PROGRESS = ['initiated', 'ringing', 'answered'];
const RANK = { queued: 0, initiated: 1, ringing: 2, answered: 3 };

/** Terminal states are final; non-terminal states may only move forward. Out-of-order webhooks are ignored. */
export function canTransition(from, to) {
  if (from === to) return false;
  if (TERMINAL.includes(from)) return false;
  if (!(to in RANK) && !TERMINAL.includes(to)) return false;
  if (TERMINAL.includes(to)) return true;
  return RANK[to] > RANK[from];
}
