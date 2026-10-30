import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Returns E.164 string or null when the number is not valid. Never throws. */
export function normalizePhone(raw, defaultCountry = 'IN') {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s || s.length > 25) return null;
  try {
    const p = parsePhoneNumberFromString(s, defaultCountry);
    return p && p.isValid() ? p.number : null;
  } catch {
    return null;
  }
}

/** +919876543210 -> +91•••••3210 */
export function maskPhone(e164) {
  if (!e164) return '';
  const s = String(e164);
  if (s.length <= 6) return '••••';
  return s.slice(0, 3) + '•'.repeat(Math.max(s.length - 7, 3)) + s.slice(-4);
}
