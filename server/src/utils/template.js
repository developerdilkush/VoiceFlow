/** Replaces {{name}} with the recipient name or a safe fallback. Other placeholders are left untouched. */
export function renderTemplate(message, { name } = {}, fallback = 'there') {
  const value = (name || '').trim() || fallback;
  return String(message || '').replace(/\{\{\s*name\s*\}\}/gi, () => value);
}

export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Prevents spreadsheet formula injection in CSV exports. */
export function csvSafe(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]?[\d\s()-]+$/.test(s))) return "'" + s;
  return s;
}

export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = csvSafe(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(','))].join('\n');
}
