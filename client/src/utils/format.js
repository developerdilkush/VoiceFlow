export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');
export const fmtDuration = (s) => {
  s = Math.round(s || 0);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${m}m` : `${m}m ${r}s`;
};
export const fmtBytes = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const LANG_LABEL = { hi: 'Hindi', en: 'English' };
export const STATUS_LABEL = { queued: 'Queued', initiated: 'Initiated', ringing: 'Ringing', answered: 'Answered', completed: 'Completed', busy: 'Busy', no_answer: 'No answer', failed: 'Failed', canceled: 'Canceled', skipped: 'Skipped' };
export const CONSENT_SOURCES = [
  { value: 'verbal', label: 'Verbal permission' }, { value: 'written', label: 'Written / message permission' },
  { value: 'existing_relationship', label: 'Existing personal relationship' }, { value: 'other', label: 'Other' },
];
export function download(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]?[\d\s()-]+$/.test(s))) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
