import { STATUS_LABEL } from '../../utils/format.js';

const tone = { completed: 'ok', answered: 'ok', failed: 'danger', busy: 'warn', no_answer: 'warn', canceled: 'muted', skipped: 'muted', queued: 'muted', initiated: 'accent', ringing: 'accent' };
const cls = { ok: 'text-ok bg-ok/10', danger: 'text-danger bg-danger/10', warn: 'text-warn bg-warn/10', muted: 'text-muted bg-line/60', accent: 'text-accent bg-accent/10' };
export const StatusBadge = ({ status }) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls[tone[status] || 'muted']}`}>{STATUS_LABEL[status] || status}</span>;
export const SimulatedBadge = () => <span title="Mock provider: no real phone call was placed" className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-warn/15 text-warn whitespace-nowrap">SIMULATED</span>;
