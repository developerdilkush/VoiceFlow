import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { normalizePhone } from '../utils/phone.js';
import { TTS_VOICES } from '../voice/catalog.js';
import { AppError } from '../utils/errors.js';

export const MAX_PARSE_ROWS = 5000;
const ALIASES = {
  name: ['name', 'recipient', 'contact name', 'full name'],
  phone: ['phone', 'phone number', 'phonenumber', 'mobile', 'mobile number', 'number', 'contact number'],
  message: ['message', 'text', 'script'],
  language: ['language', 'lang'],
  voice: ['voice'],
};

function cellToString(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if ('result' in v) return String(v.result ?? ''); // formulas: use cached result, never evaluate
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return String(v.text ?? '');
    return '';
  }
  return String(v);
}

/** Validates the real file type, then parses CSV/XLSX to {headers, rows}. */
export async function parseUpload(file) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  const buf = file.buffer;
  if (ext === 'csv') {
    if (buf.includes(0)) throw new AppError(422, 'BAD_FILE', 'This does not look like a CSV text file.');
    const rows = parse(buf, { columns: true, skip_empty_lines: true, bom: true, trim: true, relax_column_count: true, to: MAX_PARSE_ROWS + 1 });
    return finish(rows.length ? Object.keys(rows[0]) : [], rows);
  }
  if (ext === 'xlsx') {
    if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new AppError(422, 'BAD_FILE', 'This does not look like a valid XLSX file.');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) throw new AppError(422, 'BAD_FILE', 'The workbook has no sheets.');
    const headers = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (c, i) => (headers[i - 1] = cellToString(c.value).trim()));
    const rows = [];
    for (let r = 2; r <= Math.min(ws.rowCount, MAX_PARSE_ROWS + 2); r++) {
      const row = ws.getRow(r);
      const o = {};
      headers.forEach((h, i) => h && (o[h] = cellToString(row.getCell(i + 1).value).trim()));
      if (Object.values(o).some(Boolean)) rows.push(o);
    }
    return finish(headers.filter(Boolean), rows);
  }
  throw new AppError(422, 'BAD_FILE', 'Only .csv and .xlsx files are supported.');
}

function finish(headers, rows) {
  if (rows.length > MAX_PARSE_ROWS) throw new AppError(422, 'TOO_MANY_ROWS', `File has more than ${MAX_PARSE_ROWS} rows.`);
  return { headers, rows };
}

export function autoMapping(headers) {
  const map = {};
  for (const [field, names] of Object.entries(ALIASES)) map[field] = headers.find((h) => names.includes(h.toLowerCase())) || '';
  return map;
}

const LANG = { hi: 'hi', hindi: 'hi', 'हिंदी': 'hi', en: 'en', english: 'en' };
export const normLanguage = (v) => (v ? LANG[String(v).trim().toLowerCase()] : undefined);
export function normVoice(v) {
  if (!v) return undefined;
  const s = String(v).trim().toLowerCase();
  return TTS_VOICES.find((t) => t.id.toLowerCase() === s || t.label.toLowerCase() === s)?.id;
}

/** rows: [{name, phone, message, language, voice}] already mapped. Returns a full validation report. */
export async function validateRecipients(rows, { defaultCountry = 'IN' } = {}) {
  const seen = new Set();
  const report = rows.map((r, i) => {
    const out = { row: i + 2, name: (r.name || '').slice(0, 80), input: r.phone, status: 'valid', reasons: [] };
    const phone = normalizePhone(r.phone, defaultCountry);
    if (!phone) { out.status = 'invalid'; out.reasons.push('Invalid phone number'); return out; }
    out.phone = phone;
    if (seen.has(phone)) { out.status = 'duplicate'; out.reasons.push('Duplicate number in file'); return out; }
    seen.add(phone);
    if (r.language && !normLanguage(r.language)) { out.status = 'invalid'; out.reasons.push('Unsupported language (use Hindi or English)'); }
    if (r.voice && !normVoice(r.voice)) { out.status = 'invalid'; out.reasons.push('Unsupported voice'); }
    if (!r.message) out.emptyMessage = true;
    out.message = (r.message || '').slice(0, 500);
    out.language = normLanguage(r.language);
    out.voiceId = normVoice(r.voice);
    return out;
  });
  const count = (s) => report.filter((o) => o.status === s).length;
  return {
    summary: { total: report.length, valid: count('valid'), invalid: count('invalid'), duplicates: count('duplicate'), suppressed: count('suppressed'), emptyMessages: report.filter((o) => o.status === 'valid' && o.emptyMessage).length },
    recipients: report.filter((o) => o.status === 'valid').map((o) => ({ name: o.name, phone: o.phone, message: o.message, language: o.language, voiceId: o.voiceId })),
    preview: report.slice(0, 200).map(({ phone, ...o }) => ({ ...o, phoneMasked: phone ? phone.slice(0, 3) + '•••••' + phone.slice(-3) : '' })),
    errors: report.filter((o) => o.status !== 'valid').map((o) => ({ row: o.row, status: o.status, input: o.input, reason: o.reasons.join('; ') })),
  };
}
