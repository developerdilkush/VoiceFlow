import { Contact, SuppressionEntry, audit } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { escapeRegex, paging } from '../utils/misc.js';
import { normalizePhone, maskPhone } from '../utils/phone.js';
import { toCsv } from '../utils/template.js';
import { getSettings } from '../services/settingsService.js';
import { parseUpload, autoMapping, normLanguage } from '../services/importService.js';

const view = (c) => ({ id: c.id, name: c.name, phoneMasked: c.phoneMasked, language: c.language, voiceId: c.voiceId, consent: c.consent, notes: c.notes, createdAt: c.createdAt });

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const f = {};
  if (req.query.q) f.name = new RegExp(escapeRegex(String(req.query.q).slice(0, 50)), 'i');
  if (req.query.language) f.language = req.query.language;
  if (req.query.consent) f['consent.status'] = req.query.consent;
  const [items, total] = await Promise.all([Contact.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit), Contact.countDocuments(f)]);
  ok(res, items.map(view), { page, limit, total, pages: Math.ceil(total / limit) });
});

export const get = asyncHandler(async (req, res) => {
  const c = await Contact.findById(req.params.id);
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Contact not found.');
  ok(res, view(c));
});

export const create = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const phone = normalizePhone(req.body.phone, settings.defaultCountry);
  if (!phone) throw new AppError(422, 'INVALID_PHONE', 'Enter a valid phone number.');
  const b = req.body;
  const c = await Contact.create({
    name: b.name, phone, phoneMasked: maskPhone(phone), language: b.language, voiceId: b.voiceId, notes: b.notes, createdBy: req.user._id,
    consent: { status: b.consentStatus, source: b.consentSource || '', at: b.consentStatus === 'confirmed' ? new Date() : undefined },
  });
  await audit(req, 'contact.create', 'Contact', c.id);
  ok(res, view(c), undefined, 201);
});

export const update = asyncHandler(async (req, res) => {
  const c = await Contact.findById(req.params.id).select('+phone');
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Contact not found.');
  const b = req.body;
  if (b.phone) {
    const phone = normalizePhone(b.phone, (await getSettings(req.user.id)).defaultCountry);
    if (!phone) throw new AppError(422, 'INVALID_PHONE', 'Enter a valid phone number.');
    c.phone = phone; c.phoneMasked = maskPhone(phone);
  }
  for (const k of ['name', 'language', 'voiceId', 'notes']) if (b[k] !== undefined) c[k] = b[k];
  if (b.consentStatus) { c.consent.status = b.consentStatus; c.consent.at = new Date(); if (b.consentSource) c.consent.source = b.consentSource; }
  await c.save();
  await audit(req, 'contact.update', 'Contact', c.id);
  ok(res, view(c));
});

export const remove = asyncHandler(async (req, res) => {
  const c = await Contact.findByIdAndDelete(req.params.id);
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Contact not found.');
  await audit(req, 'contact.delete', 'Contact', c.id);
  ok(res, { deleted: true });
});

/** Marks consent revoked AND adds the number to the suppression list. */
export const optOut = asyncHandler(async (req, res) => {
  const c = await Contact.findById(req.params.id).select('+phone');
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Contact not found.');
  c.consent.status = 'revoked'; c.consent.at = new Date();
  await c.save();
  await SuppressionEntry.updateOne({ phone: c.phone }, { $setOnInsert: { phone: c.phone, phoneMasked: c.phoneMasked, reason: 'opt_out', createdBy: req.user._id } }, { upsert: true });
  await audit(req, 'contact.opt_out', 'Contact', c.id);
  ok(res, view(c));
});

export const importContacts = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'NO_FILE', 'Upload a CSV or XLSX file.');
  const settings = await getSettings(req.user.id);
  const { headers, rows } = await parseUpload(req.file);
  const m = autoMapping(headers);
  if (!m.phone) throw new AppError(422, 'NO_PHONE_COLUMN', 'Could not find a phone number column.');
  let created = 0, skipped = 0;
  for (const r of rows.slice(0, 2000)) {
    const phone = normalizePhone(r[m.phone], settings.defaultCountry);
    if (!phone) { skipped++; continue; }
    const res1 = await Contact.updateOne({ phone }, { $setOnInsert: { phone, phoneMasked: maskPhone(phone), name: (r[m.name] || '').slice(0, 80), language: normLanguage(r[m.language]) || settings.defaultLanguage, createdBy: req.user._id } }, { upsert: true });
    res1.upsertedCount ? created++ : skipped++;
  }
  await audit(req, 'contact.import', 'Contact', undefined, { created, skipped });
  ok(res, { created, skipped });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const items = await Contact.find().select('+phone').sort({ createdAt: -1 }).limit(10000);
  await audit(req, 'contact.export', 'Contact', undefined, { count: items.length }); // full numbers leave the system: audited
  const csv = toCsv(items, [
    { label: 'Name', value: (c) => c.name }, { label: 'Phone Number', value: (c) => c.phone }, { label: 'Language', value: (c) => c.language },
    { label: 'Consent', value: (c) => c.consent?.status }, { label: 'Consent source', value: (c) => c.consent?.source }, { label: 'Notes', value: (c) => c.notes },
  ]);
  res.type('text/csv').set('Content-Disposition', 'attachment; filename="contacts.csv"').send(csv);
});
